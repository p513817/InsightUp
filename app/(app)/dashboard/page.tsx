import { getDashboardMetricOrder } from "@/lib/dashboard-preferences";
import { DashboardWelcomeDialog } from "@/components/dashboard/dashboard-welcome-dialog";
import { RecordsWorkspace } from "@/components/workspace/records-workspace";
import { listRecords } from "@/lib/inbody/records";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const records = await listRecords(supabase, user.id);
  const metricOrder = await getDashboardMetricOrder(supabase, user.id);

  return (
    <>
      <RecordsWorkspace initialDashboardMetricOrder={metricOrder} initialRecords={records} mode="dashboard" />
      {records.length ? <DashboardWelcomeDialog /> : null}
    </>
  );
}
