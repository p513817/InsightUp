"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import type { ChartPayload } from "@/lib/inbody/types";
import { formatLongDate, formatMetricValue } from "@/lib/presentation";

interface TrendChartProps {
  chart: ChartPayload;
}

export function TrendChart({ chart }: TrendChartProps) {
  const [visibleKeys, setVisibleKeys] = useState(chart.metrics.map((metric) => metric.key));

  useEffect(() => {
    setVisibleKeys(chart.metrics.map((metric) => metric.key));
  }, [chart.metrics, chart.view]);

  function toggleMetric(metricKey: string) {
    setVisibleKeys((current) =>
      current.includes(metricKey) ? current.filter((key) => key !== metricKey) : [...current, metricKey],
    );
  }

  if (!chart.points.length) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-[#fbf6ee] text-sm text-muted-foreground">
        尚無可納入圖表的紀錄。請先新增資料，或將紀錄標記為納入分析。
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {chart.metrics.map((metric) => {
          const active = visibleKeys.includes(metric.key);
          return (
            <Button
              key={metric.key}
              size="sm"
              variant={active ? "default" : "outline"}
              onClick={() => toggleMetric(metric.key)}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: metric.color }} />
              {metric.label}
            </Button>
          );
        })}
      </div>

      <div className="h-[360px] rounded-[1.5rem] border border-border/80 bg-[#fffaf2] p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart.points} margin={{ top: 12, right: 18, bottom: 6, left: 0 }}>
            <CartesianGrid stroke="#eadfcd" strokeDasharray="4 6" vertical={false} />
            <XAxis axisLine={false} dataKey="label" tickLine={false} tick={{ fill: "#667065", fontSize: 12 }} />
            <YAxis
              axisLine={false}
              tick={{ fill: "#667065", fontSize: 12 }}
              tickLine={false}
              width={46}
              yAxisId="mass"
            />
            <YAxis
              axisLine={false}
              orientation="right"
              tick={{ fill: "#667065", fontSize: 12 }}
              tickLine={false}
              width={52}
              yAxisId="ratio"
            />
            <Tooltip
              content={({ active, label, payload }) => {
                if (!active || !payload?.length) {
                  return null;
                }

                return (
                  <div className="min-w-52 rounded-3xl border border-border bg-card px-4 py-3 shadow-panel">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {formatLongDate(String(label || payload[0]?.payload?.date || ""))}
                    </p>
                    <div className="mt-3 space-y-2">
                      {payload.map((item) => {
                        const metric = chart.metrics.find((entry) => entry.key === item.dataKey);
                        if (!metric) return null;
                        const numericValue = item.value == null || Number.isNaN(Number(item.value)) ? null : Number(item.value);
                        return (
                          <div className="flex items-center justify-between gap-4 text-sm" key={metric.key}>
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <span className="size-2 rounded-full" style={{ backgroundColor: metric.color }} />
                              {metric.label}
                            </span>
                            <span className="font-medium text-foreground">
                              {formatMetricValue(metric, numericValue)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }}
            />
            <Legend />
            {chart.metrics
              .filter((metric) => visibleKeys.includes(metric.key))
              .map((metric) => (
                <Line
                  key={metric.key}
                  dataKey={metric.key}
                  dot={{ fill: metric.color, r: 3 }}
                  activeDot={{ r: 5 }}
                  name={metric.label}
                  stroke={metric.color}
                  strokeWidth={2.4}
                  type="monotone"
                  yAxisId={metric.axis}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}