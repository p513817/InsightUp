import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { buildGeminiPrompt, getTodayTaipeiDate, listRecentRecordsForSummary } from "@/lib/inbody/trend-summary";
import { createServerSupabaseClient } from "@/lib/supabase/server";

class TrendSummaryProviderError extends Error {
  constructor(
    message: string,
    readonly code:
      | "missing_key"
      | "quota"
      | "invalid_request"
      | "authentication"
      | "permission_denied"
      | "not_found"
      | "empty_response"
      | "internal"
      | "unavailable"
      | "timeout"
      | "provider_error",
    readonly model?: string,
  ) {
    super(message);
    this.name = "TrendSummaryProviderError";
  }
}

const TREND_SUMMARY_DAILY_BYPASS_EMAILS = new Set(["p513817@gmail.com"]);
const GEMINI_ROTATION_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-3.1-flash-lite-preview",
  "gemini-3-flash-preview",
] as const;

function canBypassDailyLimit(email: string | null | undefined) {
  return Boolean(email && TREND_SUMMARY_DAILY_BYPASS_EMAILS.has(email.toLowerCase()));
}

function normalizeSummaryText(text: string) {
  const singleLine = text.replace(/\s+/g, " ").trim();

  if (singleLine.length <= 120) {
    return singleLine;
  }

  return `${singleLine.slice(0, 120).trimEnd()}...`;
}

function getGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new TrendSummaryProviderError("Missing environment variable: GEMINI_API_KEY", "missing_key");
  }

  return apiKey;
}

function shouldRotateModel(code: TrendSummaryProviderError["code"]) {
  return code === "quota" || code === "internal" || code === "unavailable" || code === "timeout" || code === "not_found";
}

function mapGeminiError(error: unknown, model: string) {
  if (error instanceof TrendSummaryProviderError) {
    return error;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);

  if (/401|unauthenticated|api key not valid|invalid api key|reported as leaked/i.test(errorMessage)) {
    return new TrendSummaryProviderError(errorMessage.slice(0, 400), "authentication", model);
  }

  if (/403|permission_denied|permission denied|doesn't have the required permissions/i.test(errorMessage)) {
    return new TrendSummaryProviderError(errorMessage.slice(0, 400), "permission_denied", model);
  }

  if (/404|not_found|model .* not found|requested resource wasn't found/i.test(errorMessage)) {
    return new TrendSummaryProviderError(errorMessage.slice(0, 400), "not_found", model);
  }

  if (/429|quota|rate limit|resource exhausted|quota exceeded/i.test(errorMessage)) {
    return new TrendSummaryProviderError("Gemini quota exceeded", "quota", model);
  }

  if (/400|invalid_argument|request too large|failed_precondition|free tier is not available/i.test(errorMessage)) {
    return new TrendSummaryProviderError(errorMessage.slice(0, 400), "invalid_request", model);
  }

  if (/500|internal/i.test(errorMessage)) {
    return new TrendSummaryProviderError(errorMessage.slice(0, 400), "internal", model);
  }

  if (/503|unavailable|overloaded|capacity/i.test(errorMessage)) {
    return new TrendSummaryProviderError(errorMessage.slice(0, 400), "unavailable", model);
  }

  if (/504|deadline_exceeded|deadline exceeded|timeout/i.test(errorMessage)) {
    return new TrendSummaryProviderError(errorMessage.slice(0, 400), "timeout", model);
  }

  return new TrendSummaryProviderError(errorMessage.slice(0, 400), "provider_error", model);
}

async function generateSummaryWithGemini(prompt: string) {
  const client = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  let lastError: TrendSummaryProviderError | null = null;

  for (const model of GEMINI_ROTATION_MODELS) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          maxOutputTokens: 220,
          temperature: 0.4,
        },
      });

      const text = response.text?.trim();

      if (!text) {
        throw new TrendSummaryProviderError("Gemini returned empty summary", "empty_response", model);
      }

      return { text, model };
    } catch (error) {
      const mappedError = mapGeminiError(error, model);
      lastError = mappedError;

      if (!shouldRotateModel(mappedError.code)) {
        throw mappedError;
      }
    }
  }

  throw lastError ?? new TrendSummaryProviderError("Gemini rotation exhausted", "provider_error");
}

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const requestDate = getTodayTaipeiDate();
    const bypassDailyLimit = canBypassDailyLimit(user.email);

    if (!bypassDailyLimit) {
      const { data: existing, error: existingError } = await supabase
        .from("llm_trend_daily_summaries")
        .select("summary_text, created_at, model_name")
        .eq("user_id", user.id)
        .eq("request_date", requestDate)
        .maybeSingle();

      if (existingError) {
        return NextResponse.json({ message: "Failed to check daily usage." }, { status: 500 });
      }

      if (existing?.summary_text) {
        return NextResponse.json({
          summary: existing.summary_text,
          generatedAt: existing.created_at,
          modelName: existing.model_name,
          provider: "cache",
          reused: true,
          requestDate,
          message: "今天已使用過一次，回傳今日既有摘要。",
        });
      }
    }

    const records = await listRecentRecordsForSummary(supabase, user.id);

    if (records.length < 2) {
      return NextResponse.json({ message: "至少需要 2 筆可納入圖表的紀錄才可產生摘要。" }, { status: 400 });
    }

    const prompt = buildGeminiPrompt(records);
    const geminiResult = await generateSummaryWithGemini(prompt);
    const summary = normalizeSummaryText(geminiResult.text);

    if (!bypassDailyLimit) {
      const { error: insertError } = await supabase.from("llm_trend_daily_summaries").insert({
        user_id: user.id,
        request_date: requestDate,
        summary_text: summary,
        model_name: geminiResult.model,
        source_record_count: records.length,
      });

      if (insertError) {
        // If a race condition occurs, fallback to the row created by the concurrent request.
        const { data: fallback } = await supabase
          .from("llm_trend_daily_summaries")
          .select("summary_text, created_at, model_name")
          .eq("user_id", user.id)
          .eq("request_date", requestDate)
          .maybeSingle();

        if (fallback?.summary_text) {
          return NextResponse.json({
            summary: fallback.summary_text,
            generatedAt: fallback.created_at,
            modelName: fallback.model_name,
            provider: "cache",
            reused: true,
            requestDate,
            message: "今天已使用過一次，回傳今日既有摘要。",
          });
        }

        return NextResponse.json({ message: "Failed to persist summary." }, { status: 500 });
      }
    }

    return NextResponse.json({
      summary,
      generatedAt: new Date().toISOString(),
      modelName: geminiResult.model,
      provider: "gemini",
      reused: false,
      message: bypassDailyLimit ? "開發者帳號已略過每日一次限制。" : undefined,
      requestDate,
    });
  } catch (error) {
    if (error instanceof TrendSummaryProviderError) {
      if (error.code === "missing_key") {
        return NextResponse.json({ message: "伺服器尚未設定 GEMINI_API_KEY。", code: error.code }, { status: 500 });
      }

      if (error.code === "authentication") {
        return NextResponse.json({ message: "Gemini API 驗證失敗，請檢查 API key。", code: error.code, modelName: error.model }, { status: 401 });
      }

      if (error.code === "permission_denied") {
        return NextResponse.json({ message: "Gemini API key 權限不足。", code: error.code, modelName: error.model }, { status: 403 });
      }

      if (error.code === "invalid_request") {
        return NextResponse.json({ message: "Gemini 請求格式或大小不合法。", code: error.code, modelName: error.model }, { status: 400 });
      }

      if (error.code === "not_found") {
        return NextResponse.json({ message: "Gemini 模型目前不可用。", code: error.code, modelName: error.model }, { status: 404 });
      }

      if (error.code === "quota") {
        return NextResponse.json({ message: "Gemini 配額已達上限，請稍後再試。", code: error.code, modelName: error.model }, { status: 429 });
      }

      if (error.code === "empty_response") {
        return NextResponse.json({ message: "Gemini 未回傳可用內容，請稍後再試。", code: error.code, modelName: error.model }, { status: 502 });
      }

      if (error.code === "internal") {
        return NextResponse.json({ message: "Gemini 服務內部錯誤，請稍後再試。", code: error.code, modelName: error.model }, { status: 500 });
      }

      if (error.code === "unavailable") {
        return NextResponse.json({ message: "Gemini 服務暫時過載，請稍後再試。", code: error.code, modelName: error.model }, { status: 503 });
      }

      if (error.code === "timeout") {
        return NextResponse.json({ message: "Gemini 處理逾時，請稍後再試。", code: error.code, modelName: error.model }, { status: 504 });
      }

      return NextResponse.json({ message: "Gemini 服務暫時不可用，請稍後再試。", code: error.code, modelName: error.model }, { status: 502 });
    }

    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ message: message.slice(0, 300) }, { status: 500 });
  }
}
