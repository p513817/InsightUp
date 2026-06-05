import { NextResponse } from "next/server";
import { buildChartPayload, listRecords } from "@/lib/inbody/records";
import { CHART_VIEWS, type ChartViewKey } from "@/lib/inbody/types";
import { detectLocaleFromAcceptLanguage, localeCookieName, normalizeLocale } from "@/lib/i18n";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const viewParam = requestUrl.searchParams.get("view") || "overall";
  const metricParam = requestUrl.searchParams.get("metric");
  const availableView = CHART_VIEWS.find((view) => view.key === viewParam);
  const cookieLocale = normalizeLocale(request.headers.get("cookie")?.match(new RegExp(`${localeCookieName}=([^;]+)`))?.[1]);
  console.log("[InsightUp chart-data api]", {
    metric: metricParam,
    time: new Date().toISOString(),
    view: viewParam,
  });

  if (!availableView) {
    return NextResponse.json({ message: "Unsupported chart view" }, { status: 400 });
  }

  const records = await listRecords(supabase, user.id);
  const locale = cookieLocale ?? detectLocaleFromAcceptLanguage(request.headers.get("accept-language"));
  const chart = buildChartPayload(records, availableView.key as ChartViewKey, locale);

  if (metricParam) {
    const metric = chart.metrics.find((entry) => entry.key === metricParam);

    if (!metric) {
      return NextResponse.json({ message: "Unsupported chart metric" }, { status: 400 });
    }

    return NextResponse.json({
      chart: {
        ...chart,
        metrics: [metric],
        points: chart.points.map((point) => ({
          date: point.date,
          label: point.label,
          [metric.key]: point[metric.key],
        })),
      },
    });
  }

  return NextResponse.json({ chart });
}
