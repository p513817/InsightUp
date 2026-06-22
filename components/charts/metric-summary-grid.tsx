"use client";

import { useLocale } from "@/components/i18n-provider";
import { Card } from "@/components/ui/card";
import type { ChartPayload } from "@/lib/inbody/types";
import { formatMetricValue } from "@/lib/presentation";

interface MetricSummaryGridProps {
  chart: ChartPayload;
}

export function MetricSummaryGrid({ chart }: MetricSummaryGridProps) {
  const locale = useLocale();
  const latest = chart.points.at(-1);
  const previous = chart.points.at(-2);

  function getNumericValue(value: string | number | null | undefined) {
    if (value == null || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return (
    <div className="grid gap-3">
      {chart.metrics.map((metric) => {
        const latestValue = getNumericValue(latest?.[metric.key]);
        const previousValue = getNumericValue(previous?.[metric.key]);
        const hasDelta = latestValue != null && previousValue != null;
        const delta = hasDelta ? latestValue - previousValue : null;
        const deltaText = delta == null ? (locale === "en" ? "No previous record" : "無上一筆紀錄") : `${delta > 0 ? "+" : ""}${formatMetricValue(metric, delta)}`;

        return (
          <Card className="gap-3 p-5" key={metric.key}>
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
              <span className="size-3 rounded-full" style={{ backgroundColor: metric.color }} />
            </div>
            <div>
              <p className="font-display text-3xl text-foreground">{formatMetricValue(metric, latestValue)}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {locale === "en" ? "Compared with previous: " : "與前一筆相比："}
                {deltaText}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
