"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, type DragEndEvent, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { Eye, EyeOff, GripVertical } from "lucide-react";
import type { DotProps } from "recharts";
import { Customized, Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { toast } from "sonner";
import { useLocale } from "@/components/i18n-provider";
import { Card } from "@/components/ui/card";
import { DirectionalTrendOverlay } from "@/components/charts/directional-trend-line";
import { getMetricProgressDirection } from "@/lib/inbody/progress";
import type { ChartMetric, ChartPayload } from "@/lib/inbody/types";
import { formatChartDate, formatDecimal, formatMetricValue } from "@/lib/presentation";

interface MiniTrendGridProps {
  chart: ChartPayload;
  editMode?: boolean;
  initialMetricOrder?: string[];
  layout?: TrendGridLayout;
  onRenderStart?: () => void;
  onRenderComplete?: () => void;
  showTrendLine?: boolean;
}

const METRIC_ORDER_STORAGE_KEY = "insightup.dashboard.metric-order";
const HIDDEN_METRICS_STORAGE_KEY = "insightup.dashboard.hidden-metrics";
const SAVE_ORDER_DEBOUNCE_MS = 260;
const EMPTY_INITIAL_METRIC_ORDER: string[] = [];

export type TrendGridLayout = "auto" | "one" | "two";

const COMPACT_CARD_CLASS = "min-h-[7.4rem] gap-1 py-2 pl-3 pr-3";
const COMPACT_CHART_CLASS = "h-[4rem] rounded-[0.9rem] px-1 py-0 sm:h-[4.75rem]";
const AUTO_TWO_COLUMN_BREAKPOINT_CLASS = "min-[900px]:grid-cols-2";
const METRIC_REVEAL_INTERVAL_MS = 280;
const TREND_TONE_COLOR = {
  negative: "rgb(var(--danger))",
  neutral: "rgb(var(--primary-strong))",
  positive: "rgb(var(--success))",
} as const;

const LAYOUT_GRID_CLASS_MAP: Record<TrendGridLayout, string> = {
  auto: `grid grid-cols-1 gap-2 ${AUTO_TWO_COLUMN_BREAKPOINT_CLASS}`,
  one: "grid gap-2 grid-cols-1",
  two: "grid grid-cols-2 gap-2",
};

function getMetricOrderStorageKey(view: ChartPayload["view"]) {
  return view === "overall" ? METRIC_ORDER_STORAGE_KEY : `${METRIC_ORDER_STORAGE_KEY}.${view}`;
}

function getHiddenMetricsStorageKey(view: ChartPayload["view"]) {
  return view === "overall" ? HIDDEN_METRICS_STORAGE_KEY : `${HIDDEN_METRICS_STORAGE_KEY}.${view}`;
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

type MiniChartDotProps = DotProps & {
  dimmed?: boolean;
  index?: number;
  metric: ChartMetric;
  payload?: any;
  totalPoints?: number;
  visibleLabelIndexes?: Set<number> | null;
};

function MiniChartDot(props: MiniChartDotProps) {
  const { cx, cy, dimmed = false, index = 0, metric, payload, totalPoints = 0, visibleLabelIndexes } = props;
  const value = payload?.value as number | null | undefined;

  if (typeof cx !== "number" || typeof cy !== "number" || value == null) {
    return null;
  }

  const shouldShowLabel = visibleLabelIndexes ? visibleLabelIndexes.has(index) || index === totalPoints - 1 : true;

  return (
    <g>
      <circle cx={cx} cy={cy} fill={metric.color} opacity={dimmed ? 0.42 : 1} r={4} stroke="#f7fbff" strokeWidth={2} />
      <text
        data-dot-label="true"
        data-dot-label-index={index}
        fill="#61758f"
        fontSize="10"
        fontWeight="600"
        opacity={shouldShowLabel ? (dimmed ? 0.5 : 1) : 0}
        pointerEvents="none"
        textAnchor="middle"
        x={cx}
        y={cy - 10}
      >
        {formatDecimal(value)}
      </text>
    </g>
  );
}
const DOT_LABEL_FONT_WIDTH_PX = 6.5;
const DOT_LABEL_MIN_WIDTH_PX = 18;
const DOT_LABEL_GAP_PX = 10;
const CHART_PLOT_HORIZONTAL_PADDING_PX = 32;

function estimateDotLabelWidth(value: number | null) {
  if (value == null) {
    return DOT_LABEL_MIN_WIDTH_PX;
  }

  return Math.max(DOT_LABEL_MIN_WIDTH_PX, formatDecimal(value).length * DOT_LABEL_FONT_WIDTH_PX);
}

function buildVisibleDotLabelIndexes(points: Array<{ value: number | null }>, cardWidth: number) {
  const visibleIndexes = new Set<number>();

  if (!points.length) {
    return visibleIndexes;
  }

  if (points.length === 1 || cardWidth <= 0) {
    visibleIndexes.add(0);
    visibleIndexes.add(points.length - 1);
    return visibleIndexes;
  }

  const plotWidth = Math.max(cardWidth - CHART_PLOT_HORIZONTAL_PADDING_PX, 1);
  const stepX = points.length > 1 ? plotWidth / (points.length - 1) : plotWidth;
  const labels = points.map((point, index) => {
    const width = estimateDotLabelWidth(point.value);
    const x = stepX * index;
    return {
      index,
      left: x - width / 2,
      right: x + width / 2,
    };
  });

  visibleIndexes.add(0);
  let lastRight = labels[0].right;

  for (let index = 1; index < labels.length - 1; index += 1) {
    const label = labels[index];
    if (label.left >= lastRight + DOT_LABEL_GAP_PX) {
      visibleIndexes.add(label.index);
      lastRight = label.right;
    }
  }

  const lastLabel = labels[labels.length - 1];
  const keptIndexes = Array.from(visibleIndexes).sort((left, right) => left - right);

  for (let index = keptIndexes.length - 1; index >= 0; index -= 1) {
    const keptIndex = keptIndexes[index];
    if (keptIndex === 0 || keptIndex === lastLabel.index) {
      continue;
    }

    const keptLabel = labels[keptIndex];
    if (keptLabel.right + DOT_LABEL_GAP_PX > lastLabel.left) {
      visibleIndexes.delete(keptIndex);
      continue;
    }

    break;
  }

  visibleIndexes.add(lastLabel.index);

  if (labels[0].right + DOT_LABEL_GAP_PX > lastLabel.left && points.length > 1) {
    visibleIndexes.delete(0);
  }

  return visibleIndexes;
}

function buildLinearTrendPoints(points: Array<{ date: string; label: string; value: number | null }>) {
  const samples = points
    .map((point, index) => ({ index, value: point.value }))
    .filter((point): point is { index: number; value: number } => point.value != null);

  if (samples.length < 2) {
    return {
      direction: "flat" as const,
      points: points.map((point) => ({ ...point, trendValue: null })),
      slope: 0,
    };
  }

  const count = samples.length;
  const sumX = samples.reduce((total, point) => total + point.index, 0);
  const sumY = samples.reduce((total, point) => total + point.value, 0);
  const sumXY = samples.reduce((total, point) => total + point.index * point.value, 0);
  const sumXX = samples.reduce((total, point) => total + point.index * point.index, 0);
  const denominator = count * sumXX - sumX * sumX;

  if (denominator === 0) {
    return {
      direction: "flat" as const,
      points: points.map((point) => ({ ...point, trendValue: null })),
      slope: 0,
    };
  }

  const slope = (count * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / count;

  return {
    direction: slope > 0 ? ("up" as const) : slope < 0 ? ("down" as const) : ("flat" as const),
    points: points.map((point, index) => ({ ...point, trendValue: slope * index + intercept })),
    slope,
  };
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

function hasSameMetricState(left: ChartMetric[], right: ChartMetric[]) {
  return (
    left.length === right.length &&
    left.every((metric, index) => {
      const candidate = right[index];
      return (
        metric.key === candidate?.key &&
        metric.label === candidate?.label &&
        metric.color === candidate?.color &&
        metric.unit === candidate?.unit &&
        metric.axis === candidate?.axis
      );
    })
  );
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

  return `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`;
}

interface SortableMetricCardProps {
  canHide: boolean;
  deltaTone: ReturnType<typeof getMetricProgressDirection>;
  editMode: boolean;
  formattedDelta: string;
  headerValueText?: string | null;
  metric: ChartMetric;
  onHide: (metricKey: string) => void;
  points: Array<{ date: string; label: string; value: number | null }>;
  showTrendLine: boolean;
}

function SortableMetricCard({ canHide, deltaTone, editMode, formattedDelta, headerValueText, metric, onHide, points, showTrendLine }: SortableMetricCardProps) {
  const { attributes, isDragging, listeners, setActivatorNodeRef, setNodeRef, transform, transition } = useSortable({
    id: metric.key,
    transition: {
      duration: 120,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
    },
  });
  const cardElementRef = useRef<HTMLDivElement | null>(null);
  const [cardWidth, setCardWidth] = useState(0);

  useEffect(() => {
    const node = cardElementRef.current;

    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }

    const syncCardWidth = () => {
      setCardWidth(node.getBoundingClientRect().width);
    };

    syncCardWidth();

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      setCardWidth(entry.contentRect.width);
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [points]);

  function handleCardRef(node: HTMLDivElement | null) {
    cardElementRef.current = node;
    setNodeRef(node);
  }

  const visibleLabelIndexes = useMemo(() => buildVisibleDotLabelIndexes(points, cardWidth), [cardWidth, points]);
  const trendLine = useMemo(() => buildLinearTrendPoints(points), [points]);
  const chartPoints = showTrendLine ? trendLine.points : points.map((point) => ({ ...point, trendValue: null }));
  const trendDirectionTone = getMetricProgressDirection(metric.key, trendLine.slope);
  const trendLineStroke = TREND_TONE_COLOR[trendDirectionTone];
  const shouldUseDeltaTone = showTrendLine && deltaTone !== "neutral";
  const deltaToneClass = deltaTone === "positive" ? "text-success" : deltaTone === "negative" ? "text-danger" : "";

  return (
    <Card
      className={`dashboard-card surface-chart-shell relative overflow-hidden [will-change:transform] ${COMPACT_CARD_CLASS} ${
        isDragging ? "z-20 cursor-grabbing border-accent/65 opacity-95 shadow-[0_22px_46px_rgba(16,35,63,0.18)]" : ""
      } ${editMode ? "border-accent/70 bg-card shadow-[0_14px_30px_rgba(23,52,93,0.13)]" : ""}`}
      data-dashboard-metric-key={metric.key}
      data-dragging={isDragging ? "true" : undefined}
      data-editing={editMode ? "true" : undefined}
      ref={handleCardRef}
      style={{
        transform: transformToCss(transform),
        transition: isDragging ? "none" : transition,
      }}
    >

      <div className="grid h-7 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {editMode ? (
            <button
              aria-label={`隱藏 ${metric.label}`}
              className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-danger/8 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!canHide}
              onClick={() => onHide(metric.key)}
              title={canHide ? `隱藏 ${metric.label}` : "至少保留 1 個指標"}
              type="button"
            >
              <EyeOff className="size-4" />
            </button>
          ) : (
            <button
              aria-label={`移動 ${metric.label}`}
              className="grid size-7 shrink-0 touch-none cursor-grab place-items-center rounded-full text-muted-foreground transition-colors duration-100 hover:bg-primary/7 hover:text-primary active:cursor-grabbing active:bg-primary/10"
              ref={setActivatorNodeRef}
              type="button"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-4" />
            </button>
          )}
          <div className="flex min-w-0 items-baseline gap-2">
            <p className="truncate text-sm font-medium leading-none text-muted-foreground">{metric.label}</p>
            {headerValueText ? (
              <p className="truncate font-display text-base leading-none tabular-nums" style={{ color: metric.color }}>{headerValueText}</p>
            ) : null}
          </div>
        </div>
        <div className="flex min-w-0 items-center justify-end text-right">
          <p
            className={`whitespace-nowrap text-sm font-semibold leading-none tabular-nums ${shouldUseDeltaTone ? deltaToneClass : ""}`}
            style={shouldUseDeltaTone ? undefined : { color: metric.color }}
          >
            {formattedDelta}
          </p>
        </div>
      </div>

      <div className={`surface-chart-shell ${COMPACT_CHART_CLASS}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartPoints} margin={{ top: 18, right: 16, bottom: 2, left: 16 }}>
            <YAxis domain={["dataMin - 1", "dataMax + 1"]} hide />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) {
                  return null;
                }

                const valuePayload = payload.find((item) => item.dataKey === "value") ?? payload[0];
                const point = valuePayload?.payload as { date?: string; value?: number | null } | undefined;
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
              dot={<MiniChartDot dimmed={showTrendLine} metric={metric} totalPoints={points.length} visibleLabelIndexes={visibleLabelIndexes} />}
              isAnimationActive={false}
              stroke={metric.color}
              strokeOpacity={showTrendLine ? 0.24 : 0}
              strokeLinecap="round"
              strokeWidth={showTrendLine ? 2.4 : 3}
            />
            <Customized component={(props: any) => <DirectionalTrendOverlay {...props} strokeOpacity={showTrendLine ? 0.18 : 1} />} />
            {showTrendLine ? (
              <Line
                activeDot={false}
                dataKey="trendValue"
                dot={false}
                isAnimationActive={false}
                stroke={trendLineStroke}
                strokeLinecap="round"
                strokeOpacity={0.34}
                strokeWidth={11}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function MiniTrendGrid({
  chart,
  editMode = false,
  initialMetricOrder = EMPTY_INITIAL_METRIC_ORDER,
  layout = "auto",
  onRenderStart,
  onRenderComplete,
  showTrendLine = false,
}: MiniTrendGridProps) {
  const locale = useLocale();
  const [isChartReady, setIsChartReady] = useState(false);
  const [visibleMetricCount, setVisibleMetricCount] = useState(0);
  const [hiddenMetricKeys, setHiddenMetricKeys] = useState<string[]>([]);
  const [isAutoTwoColumn, setIsAutoTwoColumn] = useState(false);
  const [orderedMetrics, setOrderedMetrics] = useState(chart.metrics);
  const orderedMetricsRef = useRef(chart.metrics);
  const visibleMetricCountRef = useRef(0);
  const saveTimeoutIdRef = useRef<number | null>(null);
  const renderStartKeyRef = useRef("");
  const didNotifyRenderCompleteRef = useRef(false);
  const renderCompleteKeyRef = useRef("");
  const onRenderStartRef = useRef(onRenderStart);
  const onRenderCompleteRef = useRef(onRenderComplete);
  const visibleMetricKeys = useMemo(
    () => orderedMetrics.filter((metric) => !hiddenMetricKeys.includes(metric.key)).map((metric) => metric.key),
    [hiddenMetricKeys, orderedMetrics],
  );
  const visibleMetricKey = visibleMetricKeys.join(",");
  const visibleMetricTotal = visibleMetricKeys.length;
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 2,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    onRenderStartRef.current = onRenderStart;
  }, [onRenderStart]);

  useEffect(() => {
    onRenderCompleteRef.current = onRenderComplete;
  }, [onRenderComplete]);

  useEffect(() => {
    visibleMetricCountRef.current = visibleMetricCount;
  }, [visibleMetricCount]);

  useEffect(() => {
    let firstFrame = 0;
    const renderStartKey = `${chart.view}:${chart.points.length}`;

    setIsChartReady(false);
    setVisibleMetricCount(0);

    firstFrame = window.requestAnimationFrame(() => {
      if (renderStartKeyRef.current !== renderStartKey) {
        renderStartKeyRef.current = renderStartKey;
        onRenderStartRef.current?.();
      }

      setIsChartReady(true);
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
    };
  }, [chart.points.length, chart.view]);

  useEffect(() => {
    if (!isChartReady) {
      return;
    }

    const initialVisibleMetricCount = Math.max(1, Math.min(visibleMetricCountRef.current || 1, visibleMetricTotal));
    setVisibleMetricCount(initialVisibleMetricCount);

    const timers = Array.from({ length: Math.max(visibleMetricTotal - initialVisibleMetricCount, 0) }, (_, index) =>
      window.setTimeout(() => {
        setVisibleMetricCount((current) => Math.max(current, initialVisibleMetricCount + index + 1));
      }, index * METRIC_REVEAL_INTERVAL_MS),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [isChartReady, visibleMetricKey, visibleMetricTotal]);

  useEffect(() => {
    if (!isChartReady) {
      didNotifyRenderCompleteRef.current = false;
      return;
    }

    const isComplete = !chart.points.length || visibleMetricCount >= visibleMetricTotal;
    const renderCompleteKey = `${chart.view}:${chart.points.length}:${visibleMetricKey}`;

    if (renderCompleteKeyRef.current !== renderCompleteKey) {
      renderCompleteKeyRef.current = renderCompleteKey;
      didNotifyRenderCompleteRef.current = false;
    }

    if (!isComplete || didNotifyRenderCompleteRef.current) {
      return;
    }

    didNotifyRenderCompleteRef.current = true;
    onRenderCompleteRef.current?.();
  }, [chart.points.length, chart.view, isChartReady, visibleMetricCount, visibleMetricKey, visibleMetricTotal]);

  useEffect(() => {
    if (layout !== "auto") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 900px)");
    const syncAutoColumns = () => setIsAutoTwoColumn(mediaQuery.matches);

    syncAutoColumns();
    mediaQuery.addEventListener("change", syncAutoColumns);

    return () => {
      mediaQuery.removeEventListener("change", syncAutoColumns);
    };
  }, [layout]);

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

    if (!hasSameMetricState(orderedMetricsRef.current, nextMetrics)) {
      orderedMetricsRef.current = nextMetrics;
      setOrderedMetrics(nextMetrics);
    }

    window.localStorage.setItem(getMetricOrderStorageKey(chart.view), JSON.stringify(nextMetrics.map((metric) => metric.key)));
  }, [chart.metrics, chart.view, initialMetricOrder]);

  useEffect(() => {
    const hiddenMetricsRaw = window.localStorage.getItem(getHiddenMetricsStorageKey(chart.view));

    if (!hiddenMetricsRaw) {
      setHiddenMetricKeys([]);
      return;
    }

    try {
      const parsed = JSON.parse(hiddenMetricsRaw) as string[];
      const availableKeys = new Set(chart.metrics.map((metric) => metric.key));
      setHiddenMetricKeys(parsed.filter((key) => availableKeys.has(key)));
    } catch {
      setHiddenMetricKeys([]);
    }
  }, [chart.metrics, chart.view]);

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
        toast.error(locale === "en" ? "Unable to save card order" : "無法儲存卡片排序", {
          description: locale === "en" ? "This adjustment is saved on this device, but you may need to adjust it again after signing in." : "這次調整已保留在此裝置，重新登入後可能需要再調整一次。",
        });
      });
    }, SAVE_ORDER_DEBOUNCE_MS);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const visibleMetrics = orderedMetricsRef.current.filter((metric) => !hiddenMetricKeys.includes(metric.key));
    const hiddenMetrics = orderedMetricsRef.current.filter((metric) => hiddenMetricKeys.includes(metric.key));
    const oldIndex = visibleMetrics.findIndex((metric) => metric.key === active.id);
    const newIndex = visibleMetrics.findIndex((metric) => metric.key === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    applyMetricOrder([...arrayMove(visibleMetrics, oldIndex, newIndex), ...hiddenMetrics]);
  }

  function applyHiddenMetricKeys(nextHiddenMetricKeys: string[]) {
    setHiddenMetricKeys(nextHiddenMetricKeys);
    window.localStorage.setItem(getHiddenMetricsStorageKey(chart.view), JSON.stringify(nextHiddenMetricKeys));
  }

  function hideMetric(metricKey: string) {
    if (orderedMetrics.length - hiddenMetricKeys.length <= 1 || hiddenMetricKeys.includes(metricKey)) {
      return;
    }

    applyHiddenMetricKeys([...hiddenMetricKeys, metricKey]);
  }

  function restoreMetric(metricKey: string) {
    applyHiddenMetricKeys(hiddenMetricKeys.filter((key) => key !== metricKey));
  }

  function restoreAllMetrics() {
    applyHiddenMetricKeys([]);
  }

  if (!isChartReady) {
    return (
      <Card className="surface-state-panel min-h-[52vh] rounded-[1.75rem] p-4">
        <div className="grid h-full gap-2">
          <div className="surface-soft-card h-10 animate-pulse rounded-[0.9rem]" />
          <div className="surface-soft-card h-[calc(100%-2.5rem)] animate-pulse rounded-[1.2rem]" />
        </div>
      </Card>
    );
  }

  if (!chart.points.length) {
    return (
      <div className="surface-state-panel flex min-h-72 items-center justify-center rounded-[1.75rem] text-sm text-muted-foreground">
        {locale === "en" ? "There are no records yet to include in the chart." : "尚無可納入圖表的紀錄。"}
      </div>
    );
  }

  const latestPoint = chart.points.at(-1);
  const previousPoint = chart.points.at(-2);
  const visibleMetrics = orderedMetrics.filter((metric) => !hiddenMetricKeys.includes(metric.key));
  const hiddenMetrics = orderedMetrics.filter((metric) => hiddenMetricKeys.includes(metric.key));
  const canHideVisibleMetric = visibleMetrics.length > 1;
  const showHeaderValue = layout === "one" || (layout === "auto" && !isAutoTwoColumn);

  return (
    <div className="space-y-2">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
        <SortableContext items={visibleMetrics.map((metric) => metric.key)} strategy={rectSortingStrategy}>
          <div className={LAYOUT_GRID_CLASS_MAP[layout]}>
            {visibleMetrics.map((metric, index) => {
              const latestValue = getNumericValue(latestPoint?.[metric.key]);
              const previousValue = getNumericValue(previousPoint?.[metric.key]);
              const delta = latestValue != null && previousValue != null ? latestValue - previousValue : null;
              const points = chart.points.map((point) => ({
                date: String(point.date || ""),
                label: String(point.label || ""),
                value: getNumericValue(point[metric.key]),
              }));
              return (
                <div
                  className={`transition-[opacity,transform] duration-520 ease-out motion-reduce:transition-none ${
                    index < visibleMetricCount ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2.5 opacity-0"
                  }`}
                  key={metric.key}
                >
                  <SortableMetricCard
                    canHide={canHideVisibleMetric}
                    deltaTone={getMetricProgressDirection(metric.key, delta)}
                    editMode={editMode}
                    formattedDelta={formatDelta(metric, delta)}
                    headerValueText={showHeaderValue ? formatMetricValue(metric, latestValue) : null}
                    metric={metric}
                    onHide={hideMetric}
                    points={points}
                    showTrendLine={showTrendLine}
                  />
                </div>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {editMode && hiddenMetrics.length ? (
        <section className="rounded-[1.1rem] border border-dashed border-border/80 bg-card/55 px-3 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{locale === "en" ? "Hidden metrics" : "已隱藏指標"}</p>
            <button
              className="cursor-pointer rounded-lg px-2 py-1 text-xs font-semibold text-primary transition-colors duration-150 hover:bg-primary/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={restoreAllMetrics}
              type="button"
            >
              {locale === "en" ? "Restore all" : "全部復原"}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {hiddenMetrics.map((metric) => (
              <button
                className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-border/75 bg-card px-3 text-sm font-medium text-foreground transition-colors duration-150 hover:border-primary/45 hover:bg-primary/7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                key={metric.key}
                onClick={() => restoreMetric(metric.key)}
                type="button"
              >
                <Eye className="size-4 text-muted-foreground" />
                <span>{metric.label}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
