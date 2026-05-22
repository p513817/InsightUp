"use client";

import { useEffect, useRef, useState } from "react";
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, type DragEndEvent, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import type { DotProps } from "recharts";
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/page-loading";
import type { ChartMetric, ChartPayload } from "@/lib/inbody/types";
import { formatChartDate, formatDecimal, formatMetricValue } from "@/lib/presentation";

interface MiniTrendGridProps {
  chart: ChartPayload;
  initialMetricOrder?: string[];
}

const METRIC_ORDER_STORAGE_KEY = "insightup.dashboard.metric-order";
const SAVE_ORDER_DEBOUNCE_MS = 260;

function getMetricOrderStorageKey(view: ChartPayload["view"]) {
  return view === "overall" ? METRIC_ORDER_STORAGE_KEY : `${METRIC_ORDER_STORAGE_KEY}.${view}`;
}

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

type MiniChartDotProps = DotProps & { metric: ChartMetric; payload?: any };

function MiniChartDot(props: MiniChartDotProps) {
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

function transformToCss(transform: ReturnType<typeof useSortable>["transform"]) {
  if (!transform) {
    return undefined;
  }

  return `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`;
}

interface SortableMetricCardProps {
  deltaToneClass: string;
  formattedDelta: string;
  metric: ChartMetric;
  points: Array<{ date: string; label: string; value: number | null }>;
}

function SortableMetricCard({ deltaToneClass, formattedDelta, metric, points }: SortableMetricCardProps) {
  const { attributes, isDragging, listeners, setActivatorNodeRef, setNodeRef, transform, transition } = useSortable({ id: metric.key });

  return (
    <Card
      className={`dashboard-card surface-chart-shell relative gap-3 overflow-hidden py-4 pl-4 pr-4 [will-change:transform] ${
        isDragging ? "z-20 cursor-grabbing border-accent/65 opacity-95 shadow-[0_22px_46px_rgba(16,35,63,0.18)]" : ""
      }`}
      data-dashboard-metric-key={metric.key}
      data-dragging={isDragging ? "true" : undefined}
      ref={setNodeRef}
      style={{
        transform: transformToCss(transform),
        transition,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            aria-label={`拖曳排序 ${metric.label}`}
            className="grid size-8 shrink-0 touch-none cursor-grab place-items-center rounded-full text-muted-foreground transition hover:bg-primary/7 hover:text-primary active:cursor-grabbing active:bg-primary/10"
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
          <p className="truncate text-sm font-medium text-muted-foreground">{metric.label}</p>
        </div>
        <div className="flex items-center gap-1.5 text-right">
          <p className={`text-sm font-semibold ${deltaToneClass}`}>{formattedDelta}</p>
        </div>
      </div>

      <div className="surface-chart-shell h-24 rounded-[1.1rem] px-2 py-1.5 sm:h-28">
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
                  <div className="surface-tooltip rounded-xl px-3 py-2">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{formatChartDate(point?.date)}</p>
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
}

export function MiniTrendGrid({ chart, initialMetricOrder = [] }: MiniTrendGridProps) {
  const [isChartReady, setIsChartReady] = useState(false);
  const [orderedMetrics, setOrderedMetrics] = useState(chart.metrics);
  const orderedMetricsRef = useRef(chart.metrics);
  const saveTimeoutIdRef = useRef<number | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    let firstFrame = 0;
    let secondFrame = 0;

    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        setIsChartReady(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, []);

  useEffect(() => {
    let savedOrder: string[] = [];
    const savedOrderRaw = window.localStorage.getItem(getMetricOrderStorageKey(chart.view));

    if (savedOrderRaw) {
      try {
        savedOrder = JSON.parse(savedOrderRaw) as string[];
      } catch {
        savedOrder = [];
      }
    }

    const preferredOrder = chart.view === "overall" && initialMetricOrder.length ? initialMetricOrder : savedOrder;
    const nextMetrics = sortMetricsBySavedOrder(chart.metrics, preferredOrder);

    orderedMetricsRef.current = nextMetrics;
    setOrderedMetrics(nextMetrics);
    window.localStorage.setItem(getMetricOrderStorageKey(chart.view), JSON.stringify(nextMetrics.map((metric) => metric.key)));
  }, [chart.metrics, chart.view, initialMetricOrder]);

  useEffect(() => {
    return () => {
      if (saveTimeoutIdRef.current) {
        window.clearTimeout(saveTimeoutIdRef.current);
      }
    };
  }, []);

  function applyMetricOrder(nextMetrics: ChartMetric[]) {
    orderedMetricsRef.current = nextMetrics;
    setOrderedMetrics(nextMetrics);

    const nextMetricOrder = nextMetrics.map((metric) => metric.key);
    window.localStorage.setItem(getMetricOrderStorageKey(chart.view), JSON.stringify(nextMetricOrder));

    if (chart.view !== "overall") {
      return;
    }

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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = orderedMetricsRef.current.findIndex((metric) => metric.key === active.id);
    const newIndex = orderedMetricsRef.current.findIndex((metric) => metric.key === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    applyMetricOrder(arrayMove(orderedMetricsRef.current, oldIndex, newIndex));
  }

  if (!isChartReady) {
    return <PageLoading className="surface-state-panel min-h-[52vh] rounded-[1.75rem]" />;
  }

  if (!chart.points.length) {
    return (
      <div className="surface-state-panel flex min-h-72 items-center justify-center rounded-[1.75rem] text-sm text-muted-foreground">
        尚無可納入圖表的紀錄。
      </div>
    );
  }

  const latestPoint = chart.points.at(-1);
  const previousPoint = chart.points.at(-2);

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
      <SortableContext items={orderedMetrics.map((metric) => metric.key)} strategy={rectSortingStrategy}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {orderedMetrics.map((metric) => {
            const latestValue = getNumericValue(latestPoint?.[metric.key]);
            const previousValue = getNumericValue(previousPoint?.[metric.key]);
            const delta = latestValue != null && previousValue != null ? latestValue - previousValue : null;
            const deltaToneClass = delta == null ? "text-muted-foreground" : delta >= 0 ? "text-primary" : "text-danger";
            const points = chart.points.map((point) => ({
              date: String(point.date || ""),
              label: String(point.label || ""),
              value: getNumericValue(point[metric.key]),
            }));

            return (
              <SortableMetricCard
                deltaToneClass={deltaToneClass}
                formattedDelta={formatDelta(metric, delta)}
                key={metric.key}
                metric={metric}
                points={points}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
