import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface FeatureEntitlement {
  planCode: string;
  dailyLimit: number | null;
  config: Record<string, unknown>;
}

export interface FeatureUsageRow {
  usage_count: number;
  last_used_at: string | null;
}

export function parseEntitlementConfig(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

export async function resolveMyFeatureEntitlement(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  featureKey: string,
) {
  const { data, error } = await supabase.rpc("resolve_my_feature_entitlement", {
    input_feature: featureKey,
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
    dailyLimit: typeof row?.daily_limit === "number" ? row.daily_limit : 0,
    config: parseEntitlementConfig(row?.config),
  } satisfies FeatureEntitlement;
}

export async function getDailyFeatureUsage(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  featureKey: string,
  requestDate: string,
) {
  const { data, error } = await supabase
    .from("llm_daily_feature_usage")
    .select("usage_count, last_used_at")
    .eq("user_id", userId)
    .eq("feature_key", featureKey)
    .eq("request_date", requestDate)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as FeatureUsageRow | null) ?? null;
}

export async function consumeDailyFeatureUsage(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  featureKey: string,
  requestDate: string,
  nextUsageCount: number,
) {
  const { error } = await supabase.from("llm_daily_feature_usage").upsert(
    {
      user_id: userId,
      feature_key: featureKey,
      request_date: requestDate,
      usage_count: nextUsageCount,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: "user_id,feature_key,request_date" },
  );

  if (error) {
    throw error;
  }
}
