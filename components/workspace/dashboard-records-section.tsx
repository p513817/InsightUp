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

  const [latestRecord, metricOrder] = await Promise.all([
    getLatestRecord(supabase, user.id),
    getDashboardMetricOrder(supabase, user.id),
  ]);

  return (
    <RecordsWorkspace
      initialDashboardMetricOrder={metricOrder}
      initialRecords={latestRecord ? [latestRecord] : []}
      mode="dashboard"
      showWelcomeDialog={showWelcomeDialog}
    />
  );
}
