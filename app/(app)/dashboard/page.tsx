import { DashboardRecordsSection } from "@/components/workspace/dashboard-records-section";

interface DashboardPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function pickFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const shouldOpenWelcome = pickFirst(resolvedSearchParams?.welcome) === "1";

  return <DashboardRecordsSection showWelcomeDialog={shouldOpenWelcome} />;
}
