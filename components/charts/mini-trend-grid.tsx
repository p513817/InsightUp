"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import type { DotProps } from "recharts";
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ChartMetric, ChartPayload } from "@/lib/inbody/types";
import { formatChartDate, formatDecimal, formatMetricValue } from "@/lib/presentation";

interface MiniTrendGridProps {
  chart: ChartPayload;
  initialMetricOrder?: string[];
}

const METRIC_ORDER_STORAGE_KEY = "insightup.dashboard.metric-order";
const SAVE_ORDER_DEBOUNCE_MS = 260;

function getNumericValue(value: string | number | null | undefined) {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDelta(metric: ChartMetric, delta: number | null) {
  if (delta == null) {
    return "-";
  }

  const formatted = formatMetricValue(metric, Math.abs(delta));
  return `${delta > 0 ? "+" : delta < 0 ? "-" : ""}${formatted}`;
}

function MiniChartDot(props: DotProps & { metric: ChartMetric }) {
  const { cx, cy, payload, metric } = props;
  const value = payload?.value as number | null | undefined;

  if (typeof cx !== "number" || typeof cy !== "number" || value == null) {
    return null;
  }

  return (
    <g>
      <circle cx={cx} cy={cy} fill={metric.color} r={4} stroke="#f7fbff" strokeWidth={2} />
      <text fill="#61758f" fontSize="10" fontWeight="600" textAnchor="middle" x={cx} y={cy - 10}>
        {formatDecimal(value)}
      </text>
    </g>
  );
}

function sortMetricsBySavedOrder(metrics: ChartMetric[], savedOrder: string[]) {
  if (!savedOrder.length) {
    return metrics;
  }

  const rank = new Map(savedOrder.map((key, index) => [key, index]));

  return [...metrics].sort((left, right) => {
    const leftRank = rank.get(left.key) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = rank.get(right.key) ?? Number.MAX_SAFE_INTEGER;
    return leftRank - rightRank;
  });
}

function moveMetric(metrics: ChartMetric[], fromKey: string, toKey: string) {
  if (fromKey === toKey) {
    return metrics;
  }

  const nextMetrics = [...metrics];
  const fromIndex = nextMetrics.findIndex((metric) => metric.key === fromKey);
  const toIndex = nextMetrics.findIndex((metric) => metric.key === toKey);

  if (fromIndex === -1 || toIndex === -1) {
    return metrics;
  }

  const [movedMetric] = nextMetrics.splice(fromIndex, 1);
  nextMetrics.splice(toIndex, 0, movedMetric);
  return nextMetrics;
}

function moveMetricByOffset(metrics: ChartMetric[], key: string, offset: -1 | 1) {
  const fromIndex = metrics.findIndex((metric) => metric.key === key);

  if (fromIndex === -1) {
    return metrics;
  }

  const toIndex = fromIndex + offset;

  if (toIndex < 0 || toIndex >= metrics.length) {
    return metrics;
  }

  const nextMetrics = [...metrics];
  const [movedMetric] = nextMetrics.splice(fromIndex, 1);
  nextMetrics.splice(toIndex, 0, movedMetric);
  return nextMetrics;
}

async function persistMetricOrder(metricOrder: string[]) {
  const response = await fetch("/api/preferences/dashboard", {
    body: JSON.stringify({ metricOrder }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error("Failed to persist metric order");
  }
}

export function MiniTrendGrid({ chart, initialMetricOrder = [] }: MiniTrendGridProps) {
  const [orderedMetrics, setOrderedMetrics] = useState(chart.metrics);
  const [draggingMetricKey, setDraggingMetricKey] = useState<string | null>(null);
  const [dropTargetMetricKey, setDropTargetMetricKey] = useState<string | null>(null);
  const saveTimeoutIdRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  useEffect(() => {
    let savedOrder: string[] = [];
    const savedOrderRaw = window.localStorage.getItem(METRIC_ORDER_STORAGE_KEY);

    if (savedOrderRaw) {
      try {
        savedOrder = JSON.parse(savedOrderRaw) as string[];
      } catch {
        savedOrder = [];
      }
    }

    const preferredOrder = initialMetricOrder.length ? initialMetricOrder : savedOrder;
    const nextMetrics = sortMetricsBySavedOrder(chart.metrics, preferredOrder);

    setOrderedMetrics(nextMetrics);
    window.localStorage.setItem(METRIC_ORDER_STORAGE_KEY, JSON.stringify(nextMetrics.map((metric) => metric.key)));
  }, [chart.metrics, initialMetricOrder]);

  useEffect(() => {
    return () => {
      if (saveTimeoutIdRef.current) {
        window.clearTimeout(saveTimeoutIdRef.current);
      }
    };
  }, []);

  function applyMetricOrder(nextMetrics: ChartMetric[]) {
    setOrderedMetrics(nextMetrics);

    const nextMetricOrder = nextMetrics.map((metric) => metric.key);
    window.localStorage.setItem(METRIC_ORDER_STORAGE_KEY, JSON.stringify(nextMetricOrder));

    if (saveTimeoutIdRef.current) {
      window.clearTimeout(saveTimeoutIdRef.current);
    }

    saveTimeoutIdRef.current = window.setTimeout(() => {
      void persistMetricOrder(nextMetricOrder).catch(() => {
        toast.error("排序未同步到雲端。", {
          description: "目前裝置上的順序仍會保留，稍後再調整一次即可重試。",
        });
      });
    }, SAVE_ORDER_DEBOUNCE_MS);
  }

  if (!chart.points.length) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-[linear-gradient(180deg,rgba(247,251,255,0.78),rgba(229,239,247,0.9))] text-sm text-muted-foreground">
        尚無可納入圖表的紀錄。
      </div>
    );
  }

  const latestPoint = chart.points.at(-1);
  const previousPoint = chart.points.at(-2);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {orderedMetrics.map((metric, index) => {
        const latestValue = getNumericValue(latestPoint?.[metric.key]);
        const previousValue = getNumericValue(previousPoint?.[metric.key]);
        const delta = latestValue != null && previousValue != null ? latestValue - previousValue : null;
        const deltaToneClass = delta == null ? "text-muted-foreground" : delta >= 0 ? "text-primary" : "text-[#b85b73]";
        const points = chart.points.map((point) => ({
          date: String(point.date || ""),
          label: String(point.label || ""),
          value: getNumericValue(point[metric.key]),
        }));

        return (
          <Card
            className={`dashboard-card gap-3 border-white/60 bg-[linear-gradient(180deg,rgba(247,251,255,0.96),rgba(233,242,248,0.9))] p-4 ${draggingMetricKey === metric.key ? "dashboard-card-dragging" : ""} ${dropTargetMetricKey === metric.key ? "dashboard-card-drop-target" : ""}`}
            draggable
            key={metric.key}
            onDragEnd={() => {
              setDraggingMetricKey(null);
              setDropTargetMetricKey(null);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (!draggingMetricKey || draggingMetricKey === metric.key) {
                return;
              }

              if (dropTargetMetricKey !== metric.key) {
                setDropTargetMetricKey(metric.key);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();

              if (!draggingMetricKey || draggingMetricKey === metric.key) {
                setDropTargetMetricKey(null);
                return;
              }

              applyMetricOrder(moveMetric(orderedMetrics, draggingMetricKey, metric.key));
              setDropTargetMetricKey(null);
            }}
            onDragStart={() => setDraggingMetricKey(metric.key)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <GripVertical className="size-4 text-muted-foreground/80" />
                <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
              </div>
              <div className="flex items-center gap-1.5 text-right">
                <div className="flex items-center gap-1 sm:hidden">
                  <Button
                    aria-label={`將 ${metric.label} 上移`}
                    className="size-7 rounded-full"
                    disabled={index === 0}
                    onClick={() => applyMetricOrder(moveMetricByOffset(orderedMetrics, metric.key, -1))}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    aria-label={`將 ${metric.label} 下移`}
                    className="size-7 rounded-full"
                    disabled={index === orderedMetrics.length - 1}
                    onClick={() => applyMetricOrder(moveMetricByOffset(orderedMetrics, metric.key, 1))}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                </div>
                <p className={`text-sm font-semibold ${deltaToneClass}`}>{formatDelta(metric, delta)}</p>
              </div>
            </div>

            <div className="h-24 rounded-[1.1rem] border border-white/70 bg-[linear-gradient(180deg,rgba(247,251,255,0.84),rgba(226,238,246,0.96))] px-2 py-1.5 sm:h-28">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 16, right: 8, bottom: 2, left: 8 }}>
                  <YAxis domain={["dataMin - 1", "dataMax + 1"]} hide />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) {
                        return null;
                      }

                      const point = payload[0]?.payload as { date?: string; value?: number | null } | undefined;
                      return (
                        <div className="rounded-xl border border-border bg-white px-3 py-2 shadow-panel">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                            {formatChartDate(point?.date)}
                          </p>
                          <p className="mt-1 text-sm font-medium text-foreground">{formatMetricValue(metric, point?.value)}</p>
                        </div>
                      );
                    }}
                  />
                  <Line
                    dataKey="value"
                    dot={<MiniChartDot metric={metric} />}
                    isAnimationActive={false}
                    stroke={metric.color}
                    strokeLinecap="round"
                    strokeWidth={3}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        );
      })}
    </div>
  );
}