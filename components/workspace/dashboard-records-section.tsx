import { getServerTranslations } from "@/lib/i18n/server";
import { getDashboardMetricOrder } from "@/lib/dashboard-preferences";
import { RecordsWorkspace } from "@/components/workspace/records-workspace";
import { buildDashboardChartPayloads, listRecords } from "@/lib/inbody/records";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface DashboardRecordsSectionProps {
  showWelcomeDialog?: boolean;
}

export async function DashboardRecordsSection({ showWelcomeDialog = false }: DashboardRecordsSectionProps) {
  const { locale } = await getServerTranslations();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const records = await listRecords(supabase, user.id);
  const metricOrder = await getDashboardMetricOrder(supabase, user.id);
  const { overallChart, segmentalCharts } = buildDashboardChartPayloads(records, locale);

  return (
    <RecordsWorkspace
      initialDashboardMetricOrder={metricOrder}
      initialOverallChart={overallChart}
      initialRecords={records}
      initialSegmentalCharts={segmentalCharts}
      mode="dashboard"
      showWelcomeDialog={showWelcomeDialog}
    />
  );
}
