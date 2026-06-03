import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getTodayTaipeiDate } from "@/lib/inbody/trend-summary";
import { decodeStoredStructuredSummary, parseEntitlementConfig, toLegacySummaryText } from "@/lib/llms";
import type { TrendSummaryResponse } from "@/components/charts/trend-summary-workspace";

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

export async function resolveTrendSummaryEntitlement(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
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

export async function getLatestTrendSummaryRow(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string) {
  const { data, error } = await supabase
    .from("llm_trend_daily_summaries")
    .select("summary_text, created_at, model_name, request_date, usage_count, last_generated_at")
    .eq("user_id", userId)
    .eq("feature_key", "trend_summary")
    .not("summary_text", "is", null)
    .neq("summary_text", "")
    .order("request_date", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as TrendSummaryRow | null;
}

export async function getTodayTrendSummaryRow(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string, requestDate: string) {
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

export async function getTrendSummarySnapshot(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string) {
  const requestDate = getTodayTaipeiDate();
  const entitlement = await resolveTrendSummaryEntitlement(supabase);

  const [latestSummary, todaySummary] = await Promise.all([
    getLatestTrendSummaryRow(supabase, userId),
    getTodayTrendSummaryRow(supabase, userId, requestDate),
  ]);
  const structuredSummary = latestSummary?.summary_text ? decodeStoredStructuredSummary(latestSummary.summary_text) : null;

  return {
    summary: structuredSummary ? toLegacySummaryText(structuredSummary) : null,
    structuredSummary,
    generatedAt: latestSummary?.last_generated_at ?? latestSummary?.created_at ?? null,
    modelName: latestSummary?.model_name ?? null,
    provider: latestSummary ? "cache" : "gemini",
    reused: Boolean(latestSummary),
    requestDate: latestSummary?.request_date ?? requestDate,
    usageCount: todaySummary?.usage_count ?? 0,
    dailyLimit: entitlement.dailyLimit,
    planCode: entitlement.planCode,
    canGenerate: entitlement.dailyLimit == null || (todaySummary?.usage_count ?? 0) < entitlement.dailyLimit,
  } satisfies Omit<TrendSummaryResponse, "message">;
}

export async function getAuthenticatedTrendSummarySnapshot() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return getTrendSummarySnapshot(supabase, user.id);
}
