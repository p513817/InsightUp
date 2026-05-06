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

const DEFAULT_GEMINI_ROTATION_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-3.1-flash-lite-preview",
  "gemini-3-flash-preview",
] as const;

interface TrendSummaryEntitlement {
  planCode: string;
  dailyLimit: number | null;
  config: Record<string, unknown>;
}

interface TrendSummaryRow {
  summary_text: string;
  created_at: string;
  model_name: string | null;
  request_date: string;
  usage_count: number;
  last_generated_at: string | null;
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

function parseEntitlementConfig(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

function getModelPool(config: Record<string, unknown>) {
  const configuredPool = Array.isArray(config.model_pool)
    ? config.model_pool.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];

  if (!configuredPool.length) {
    return [...DEFAULT_GEMINI_ROTATION_MODELS];
  }

  return config.allow_rotation === false ? [configuredPool[0]] : configuredPool;
}

async function resolveTrendSummaryEntitlement(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data, error } = await supabase.rpc("resolve_my_feature_entitlement", {
    input_feature: "trend_summary",
  });

  if (error) {
    throw error;
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | { plan_code?: string | null; daily_limit?: number | null; config?: unknown }
    | null
    | undefined;

  return {
    planCode: row?.plan_code || "free",
    dailyLimit: typeof row?.daily_limit === "number" ? row.daily_limit : 1,
    config: parseEntitlementConfig(row?.config),
  } satisfies TrendSummaryEntitlement;
}

async function getLatestTrendSummaryRow(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("llm_trend_daily_summaries")
    .select("summary_text, created_at, model_name, request_date, usage_count, last_generated_at")
    .eq("user_id", userId)
    .eq("feature_key", "trend_summary")
    .order("request_date", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as TrendSummaryRow | null;
}

async function getTodayTrendSummaryRow(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  requestDate: string,
) {
  const { data, error } = await supabase
    .from("llm_trend_daily_summaries")
    .select("summary_text, created_at, model_name, request_date, usage_count, last_generated_at")
    .eq("user_id", userId)
    .eq("feature_key", "trend_summary")
    .eq("request_date", requestDate)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as TrendSummaryRow | null;
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

async function generateSummaryWithGemini(prompt: string, modelPool: string[]) {
  const client = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  let lastError: TrendSummaryProviderError | null = null;

  for (const model of modelPool) {
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

async function getAuthenticatedContext() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedContext();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const requestDate = getTodayTaipeiDate();
    const entitlement = await resolveTrendSummaryEntitlement(supabase);

    if (entitlement.dailyLimit === 0) {
      return NextResponse.json({ message: "目前方案尚未開放 AI 趨勢摘要。" }, { status: 403 });
    }

    const latestSummary = await getLatestTrendSummaryRow(supabase, user.id);
    const todaySummary = await getTodayTrendSummaryRow(supabase, user.id, requestDate);

    return NextResponse.json({
      summary: latestSummary?.summary_text ?? null,
      generatedAt: latestSummary?.last_generated_at ?? latestSummary?.created_at ?? null,
      modelName: latestSummary?.model_name ?? null,
      provider: latestSummary ? "cache" : "gemini",
      reused: Boolean(latestSummary),
      requestDate: latestSummary?.request_date ?? requestDate,
      usageCount: todaySummary?.usage_count ?? 0,
      dailyLimit: entitlement.dailyLimit,
      planCode: entitlement.planCode,
      canGenerate: entitlement.dailyLimit == null || (todaySummary?.usage_count ?? 0) < entitlement.dailyLimit,
      message: latestSummary ? undefined : "目前還沒有摘要，點擊重新生成即可建立最新摘要。",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ message: message.slice(0, 300) }, { status: 500 });
  }
}

export async function POST() {
  try {
    const { supabase, user } = await getAuthenticatedContext();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const requestDate = getTodayTaipeiDate();
    const entitlement = await resolveTrendSummaryEntitlement(supabase);

    if (entitlement.dailyLimit === 0) {
      return NextResponse.json({ message: "目前方案尚未開放 AI 趨勢摘要。" }, { status: 403 });
    }

    const todaySummary = await getTodayTrendSummaryRow(supabase, user.id, requestDate);
    const currentUsageCount = todaySummary?.usage_count ?? 0;

    if (entitlement.dailyLimit != null && currentUsageCount >= entitlement.dailyLimit) {
      return NextResponse.json({
        summary: todaySummary?.summary_text ?? null,
        generatedAt: todaySummary?.last_generated_at ?? todaySummary?.created_at ?? null,
        modelName: todaySummary?.model_name ?? null,
        provider: "cache",
        reused: true,
        requestDate,
        usageCount: currentUsageCount,
        dailyLimit: entitlement.dailyLimit,
        planCode: entitlement.planCode,
        canGenerate: false,
        message: "今天已達使用上限，請明天再試。",
      });
    }

    const records = await listRecentRecordsForSummary(supabase, user.id);

    if (records.length < 2) {
      return NextResponse.json({ message: "至少需要 2 筆可納入圖表的紀錄才可產生摘要。" }, { status: 400 });
    }

    const prompt = buildGeminiPrompt(records);
    const geminiResult = await generateSummaryWithGemini(prompt, getModelPool(entitlement.config));
    const summary = normalizeSummaryText(geminiResult.text);
    const nextUsageCount = currentUsageCount + 1;

    const { error: upsertError } = await supabase.from("llm_trend_daily_summaries").upsert(
      {
        user_id: user.id,
        feature_key: "trend_summary",
        request_date: requestDate,
        summary_text: summary,
        model_name: geminiResult.model,
        source_record_count: records.length,
        usage_count: nextUsageCount,
        last_generated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,feature_key,request_date" },
    );

    if (upsertError) {
      return NextResponse.json({ message: "Failed to persist summary." }, { status: 500 });
    }

    return NextResponse.json({
      summary,
      generatedAt: new Date().toISOString(),
      modelName: geminiResult.model,
      provider: "gemini",
      reused: false,
      usageCount: nextUsageCount,
      dailyLimit: entitlement.dailyLimit,
      planCode: entitlement.planCode,
      canGenerate: entitlement.dailyLimit == null || nextUsageCount < entitlement.dailyLimit,
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
