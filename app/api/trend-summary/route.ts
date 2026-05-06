import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { buildGeminiPrompt, getTodayTaipeiDate, listRecentRecordsForSummary } from "@/lib/inbody/trend-summary";
import { createServerSupabaseClient } from "@/lib/supabase/server";

class TrendSummaryProviderError extends Error {
  constructor(
    message: string,
    readonly code: "missing_key" | "quota" | "provider_error" | "empty_response",
  ) {
    super(message);
    this.name = "TrendSummaryProviderError";
  }
}

const TREND_SUMMARY_DAILY_BYPASS_EMAILS = new Set(["p513817@gmail.com"]);

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

async function generateSummaryWithGemini(prompt: string) {
  const client = new GoogleGenAI({ apiKey: getGeminiApiKey() });

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 220,
        temperature: 0.4,
      },
    });

    const text = response.text?.trim();

    if (!text) {
      throw new TrendSummaryProviderError("Gemini returned empty summary", "empty_response");
    }

    return text;
  } catch (error) {
    if (error instanceof TrendSummaryProviderError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (/429|quota|rate limit|resource exhausted/i.test(errorMessage)) {
      throw new TrendSummaryProviderError("Gemini quota exceeded", "quota");
    }

    throw new TrendSummaryProviderError(errorMessage.slice(0, 400), "provider_error");
  }
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
        .select("summary_text, created_at")
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
    const summary = normalizeSummaryText(await generateSummaryWithGemini(prompt));

    if (!bypassDailyLimit) {
      const { error: insertError } = await supabase.from("llm_trend_daily_summaries").insert({
        user_id: user.id,
        request_date: requestDate,
        summary_text: summary,
        source_record_count: records.length,
      });

      if (insertError) {
        // If a race condition occurs, fallback to the row created by the concurrent request.
        const { data: fallback } = await supabase
          .from("llm_trend_daily_summaries")
          .select("summary_text, created_at")
          .eq("user_id", user.id)
          .eq("request_date", requestDate)
          .maybeSingle();

        if (fallback?.summary_text) {
          return NextResponse.json({
            summary: fallback.summary_text,
            generatedAt: fallback.created_at,
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

      if (error.code === "quota") {
        return NextResponse.json({ message: "Gemini 配額已達上限，請稍後再試。", code: error.code }, { status: 429 });
      }

      if (error.code === "empty_response") {
        return NextResponse.json({ message: "Gemini 未回傳可用內容，請稍後再試。", code: error.code }, { status: 502 });
      }

      return NextResponse.json({ message: "Gemini 服務暫時不可用，請稍後再試。", code: error.code }, { status: 502 });
    }

    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ message: message.slice(0, 300) }, { status: 500 });
  }
}
