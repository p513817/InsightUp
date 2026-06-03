import { TrendSummaryWorkspace } from "@/components/charts/trend-summary-workspace";
import { getAuthenticatedTrendSummarySnapshot } from "@/lib/inbody/trend-summary-service";

export default async function SummaryPage() {
  const initialSummary = await getAuthenticatedTrendSummarySnapshot();

  return <TrendSummaryWorkspace initialSummary={initialSummary} />;
}
