import { NextResponse } from "next/server";
import {
  LlmProviderError,
  generateText,
  getModelPool,
  decodeStoredStructuredSummary,
  parseStructuredSummaryText,
  toLegacySummaryText,
} from "@/lib/llms";
import { buildGeminiPrompt, getTodayTaipeiDate, listRecentRecordsForSummary } from "@/lib/inbody/trend-summary";
import {
  getLatestTrendSummaryRow,
  getTodayTrendSummaryRow,
  getTrendSummarySnapshot,
  resolveTrendSummaryEntitlement,
} from "@/lib/inbody/trend-summary-service";
import { getServerTranslations } from "@/lib/i18n/server";
import { releaseDailyFeatureUsage, reserveDailyFeatureUsage } from "@/lib/llms/usage";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getAuthenticatedContext() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

function mapLlmErrorResponse(error: LlmProviderError) {
  if (error.code === "missing_key") {
    return NextResponse.json({ message: "GEMINI_API_KEY is missing.", code: error.code }, { status: 500 });
  }

  if (error.code === "authentication") {
    return NextResponse.json({ message: "Gemini API key authentication failed.", code: error.code, modelName: error.model }, { status: 401 });
  }

  if (error.code === "permission_denied") {
    return NextResponse.json({ message: "Gemini API key does not have permission.", code: error.code, modelName: error.model }, { status: 403 });
  }

  if (error.code === "invalid_request") {
    return NextResponse.json({ message: "The Gemini request was invalid.", code: error.code, modelName: error.model }, { status: 400 });
  }

  if (error.code === "not_found") {
    return NextResponse.json({ message: "The configured Gemini model was not found.", code: error.code, modelName: error.model }, { status: 404 });
  }

  if (error.code === "quota") {
    return NextResponse.json({ message: "Gemini quota has been exhausted.", code: error.code, modelName: error.model }, { status: 429 });
  }

  if (error.code === "empty_response") {
    return NextResponse.json({ message: "Gemini returned an empty response.", code: error.code, modelName: error.model }, { status: 502 });
  }

  if (error.code === "internal") {
    return NextResponse.json({ message: "Gemini returned an internal error.", code: error.code, modelName: error.model }, { status: 500 });
  }

  if (error.code === "unavailable") {
    return NextResponse.json({ message: "Gemini is currently unavailable.", code: error.code, modelName: error.model }, { status: 503 });
  }

  if (error.code === "timeout") {
    return NextResponse.json({ message: "Gemini request timed out.", code: error.code, modelName: error.model }, { status: 504 });
  }

  return NextResponse.json({ message: "Gemini provider error.", code: error.code, modelName: error.model }, { status: 502 });
}

export async function GET() {
  const { t } = await getServerTranslations();

  try {
    const { supabase, user } = await getAuthenticatedContext();

    if (!user) {
      return NextResponse.json({ message: t("api.unauthorized") }, { status: 401 });
    }

    const entitlement = await resolveTrendSummaryEntitlement(supabase);

    if (entitlement.dailyLimit === 0) {
      return NextResponse.json({ message: t("api.trendSummary.notAllowed") }, { status: 403 });
    }

    const snapshot = await getTrendSummarySnapshot(supabase, user.id);

    return NextResponse.json({
      ...snapshot,
      message: snapshot.summary ? undefined : t("summary.errors.noContent"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : t("api.unexpected");
    return NextResponse.json({ message: message.slice(0, 300) }, { status: 500 });
  }
}

export async function POST() {
  const { t } = await getServerTranslations();
  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> | null = null;
  let requestDate: string | null = null;
  let usageReserved = false;

  try {
    const context = await getAuthenticatedContext();
    supabase = context.supabase;
    const { user } = context;

    if (!user) {
      return NextResponse.json({ message: t("api.unauthorized") }, { status: 401 });
    }

    requestDate = getTodayTaipeiDate();
    const entitlement = await resolveTrendSummaryEntitlement(supabase);

    if (entitlement.dailyLimit === 0) {
      return NextResponse.json({ message: t("api.trendSummary.notAllowed") }, { status: 403 });
    }

    const todaySummary = await getTodayTrendSummaryRow(supabase, user.id, requestDate);
    const currentUsageCount = todaySummary?.usage_count ?? 0;

    if (entitlement.dailyLimit != null && currentUsageCount >= entitlement.dailyLimit) {
      const structuredSummary = todaySummary?.summary_text ? decodeStoredStructuredSummary(todaySummary.summary_text) : null;

      return NextResponse.json({
        summary: structuredSummary ? toLegacySummaryText(structuredSummary) : null,
        structuredSummary,
        generatedAt: todaySummary?.last_generated_at ?? todaySummary?.created_at ?? null,
        modelName: todaySummary?.model_name ?? null,
        provider: "cache",
        reused: true,
        requestDate,
        usageCount: currentUsageCount,
        dailyLimit: entitlement.dailyLimit,
        planCode: entitlement.planCode,
        canGenerate: false,
        message: t("summary.errors.limitReached"),
      });
    }

    const records = await listRecentRecordsForSummary(supabase, user.id);

    if (records.length < 2) {
      return NextResponse.json({ message: t("summary.errors.needMoreRecords") }, { status: 400 });
    }

    const reservation = await reserveDailyFeatureUsage(supabase, "trend_summary", requestDate, entitlement.dailyLimit);

    if (!reservation.allowed) {
      const structuredSummary = todaySummary?.summary_text ? decodeStoredStructuredSummary(todaySummary.summary_text) : null;

      return NextResponse.json({
        summary: structuredSummary ? toLegacySummaryText(structuredSummary) : null,
        structuredSummary,
        generatedAt: todaySummary?.last_generated_at ?? todaySummary?.created_at ?? null,
        modelName: todaySummary?.model_name ?? null,
        provider: "cache",
        reused: true,
        requestDate,
        usageCount: reservation.usageCount,
        dailyLimit: entitlement.dailyLimit,
        planCode: entitlement.planCode,
        canGenerate: false,
        message: t("summary.errors.limitReached"),
      });
    }

    usageReserved = true;
    const prompt = buildGeminiPrompt(records);
    const llmResult = await generateText(prompt, getModelPool(entitlement.config));
    const structuredSummary = parseStructuredSummaryText(llmResult.text);

    if (!structuredSummary) {
      throw new LlmProviderError("Gemini returned text that could not be parsed as the expected summary JSON", "provider_error", llmResult.model);
    }

    const summary = toLegacySummaryText(structuredSummary);
    const storedSummary = JSON.stringify(structuredSummary);

    const { error: upsertError } = await supabase.from("llm_trend_daily_summaries").upsert(
      {
        user_id: user.id,
        feature_key: "trend_summary",
        request_date: requestDate,
        summary_text: storedSummary,
        model_name: llmResult.model,
        source_record_count: records.length,
        usage_count: reservation.usageCount,
        last_generated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,feature_key,request_date" },
    );

    if (upsertError) {
      return NextResponse.json({ message: t("api.unexpected") }, { status: 500 });
    }

    return NextResponse.json({
      summary,
      structuredSummary,
      generatedAt: new Date().toISOString(),
      modelName: llmResult.model,
      provider: "gemini",
      reused: false,
      usageCount: reservation.usageCount,
      dailyLimit: entitlement.dailyLimit,
      planCode: entitlement.planCode,
      canGenerate: entitlement.dailyLimit == null || reservation.usageCount < entitlement.dailyLimit,
      requestDate,
    });
  } catch (error) {
    if (usageReserved && supabase && requestDate) {
      try {
        await releaseDailyFeatureUsage(supabase, "trend_summary", requestDate);
      } catch {
        // Preserve the original application error when the refund path fails.
      }
    }

    if (error instanceof LlmProviderError) {
      return mapLlmErrorResponse(error);
    }

    const message = error instanceof Error ? error.message : t("api.unexpected");
    return NextResponse.json({ message: message.slice(0, 300) }, { status: 500 });
  }
}
