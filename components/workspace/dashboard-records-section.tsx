import { getDashboardMetricOrder } from "@/lib/dashboard-preferences";
import { RecordsWorkspace } from "@/components/workspace/records-workspace";
import { getLatestRecord } from "@/lib/inbody/records";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface DashboardRecordsSectionProps {
  showWelcomeDialog?: boolean;
}

export async function DashboardRecordsSection({ showWelcomeDialog = false }: DashboardRecordsSectionProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  console.log("[InsightUp dashboard server]", {
    event: "dashboard-seed-start",
    time: new Date().toISOString(),
  });
  const startedAt = Date.now();
  const [latestRecord, metricOrder] = await Promise.all([
    getLatestRecord(supabase, user.id),
    getDashboardMetricOrder(supabase, user.id),
  ]);
  console.log("[InsightUp dashboard server]", {
    durationMs: Date.now() - startedAt,
    event: "dashboard-seed-complete",
    hasLatestRecord: Boolean(latestRecord),
  });

  return (
    <RecordsWorkspace
      initialDashboardMetricOrder={metricOrder}
      initialRecords={latestRecord ? [latestRecord] : []}
      mode="dashboard"
      showWelcomeDialog={showWelcomeDialog}
    />
  );
}
