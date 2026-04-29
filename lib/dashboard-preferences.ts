import type { SupabaseClient } from "@supabase/supabase-js";

interface DashboardPreferenceRow {
  metric_order: string[] | null;
}

const DASHBOARD_PREFERENCES_TABLE_MISSING_CODE = "PGRST205";

export class MissingDashboardPreferencesTableError extends Error {
  constructor() {
    super(
      "Dashboard preferences storage is unavailable. Apply infra/supabase/migrations/20260424_001_dashboard_preferences.sql to your Supabase database.",
    );
    this.name = "MissingDashboardPreferencesTableError";
  }
}

function isMissingDashboardPreferencesTable(error: { code?: string } | null) {
  return error?.code === DASHBOARD_PREFERENCES_TABLE_MISSING_CODE;
}

export async function getDashboardMetricOrder(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_dashboard_preferences")
    .select("metric_order")
    .eq("user_id", userId)
    .maybeSingle<DashboardPreferenceRow>();

  if (error) {
    if (isMissingDashboardPreferencesTable(error)) {
      return [];
    }

    throw error;
  }

  return data?.metric_order ?? [];
}

export async function upsertDashboardMetricOrder(supabase: SupabaseClient, userId: string, metricOrder: string[]) {
  const normalizedMetricOrder = [...new Set(metricOrder.filter(Boolean))];

  const { error } = await supabase.from("user_dashboard_preferences").upsert(
    {
      metric_order: normalizedMetricOrder,
      user_id: userId,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    if (isMissingDashboardPreferencesTable(error)) {
      throw new MissingDashboardPreferencesTableError();
    }

    throw error;
  }

  return normalizedMetricOrder;
}