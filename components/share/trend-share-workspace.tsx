"use client";

import { Check, Columns3, Download, Image as ImageIcon, ListChecks, Palette, Type, X } from "lucide-react";
import { toPng } from "html-to-image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildChartPayload } from "@/lib/inbody/records";
import type { ChartMetric, InbodyRecord } from "@/lib/inbody/types";
import { formatChartDate } from "@/lib/presentation";
import { cn } from "@/lib/utils";

type ShareStyle = "trend" | "current";
type ShareBackground = "light" | "dark" | "transparent";
type SharePosition = "top" | "center" | "bottom";
type TitleMode = "show" | "hide";
type TitleAlign = "left" | "center" | "right";
type ControlPanel = "style" | "background" | "title" | "layout" | "metrics";

type ShareMetric = {
  id: string;
  metric: ChartMetric;
  latestValue: number | null;
  previousValue: number | null;
  delta: number | null;
  points: Array<{ date: string; value: number | null }>;
};

const EXPORT_IMAGE_WIDTH = 1080;
const EXPORT_IMAGE_HEIGHT = 1920;
const TREND_CHART_MARGIN = { bottom: 8, left: 20, right: 20, top: 8 };
const TIMELINE_CHART_MARGIN = { bottom: 0, left: 20, right: 20, top: 0 };

const OVERALL_LABELS: Record<string, string> = {
  weight: "體重",
  muscle: "骨骼肌重",
  fat: "體脂肪重",
  fatPercent: "體脂率",
  score: "InBody 分數",
  visceralFatLevel: "內臟脂肪等級",
  bmr: "基礎代謝",
  recommendedCalories: "建議熱量",
};

const STYLE_OPTIONS: Array<{ value: ShareStyle; label: string }> = [
  { value: "trend", label: "趨勢" },
  { value: "current", label: "現況" },
];

const BACKGROUND_OPTIONS: Array<{ value: ShareBackground; label: string }> = [
  { value: "light", label: "淺色" },
  { value: "dark", label: "深色" },
  { value: "transparent", label: "透明" },
];

const POSITION_OPTIONS: Array<{ value: SharePosition; label: string }> = [
  { value: "top", label: "上" },
  { value: "center", label: "中" },
  { value: "bottom", label: "下" },
];

const COLUMN_OPTIONS: Array<{ value: 1 | 2; label: string }> = [
  { value: 1, label: "一欄" },
  { value: 2, label: "兩欄" },
];

const TITLE_MODE_OPTIONS: Array<{ value: TitleMode; label: string }> = [
  { value: "show", label: "顯示" },
  { value: "hide", label: "隱藏" },
];

const TITLE_ALIGN_OPTIONS: Array<{ value: TitleAlign; label: string }> = [
  { value: "left", label: "左" },
  { value: "center", label: "中" },
  { value: "right", label: "右" },
];

function getNumericValue(value: string | number | null | undefined) {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function withReadableMetricLabel(metric: ChartMetric) {
  return {
    ...metric,
    label: OVERALL_LABELS[metric.key] || metric.label,
  };
}

function formatDelta(delta: number | null) {
  if (delta == null) {
    return "-";
  }

  const formatted = formatShareNumber(Math.abs(delta));
  return `${delta > 0 ? "+" : delta < 0 ? "-" : ""}${formatted}`;
}

function formatShareNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "-";
  }

  return value.toFixed(1);
}

function formatTimelineDate(date: string | undefined) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("zh-TW", { month: "numeric", day: "numeric" }).format(new Date(date));
}

function getTitleAlignClass(align: TitleAlign) {
  if (align === "center") {
    return "items-center text-center";
  }

  if (align === "right") {
    return "items-end text-right";
  }

  return "items-start text-left";
}

function buildTimelineDates(points: ShareMetric["points"]) {
  const dates = points.map((point) => point.date).filter(Boolean);

  if (dates.length <= 4) {
    return dates;
  }

  const lastIndex = dates.length - 1;
  return [dates[0], dates[Math.round(lastIndex / 3)], dates[Math.round((lastIndex * 2) / 3)], dates[lastIndex]];
}

function TimelineTick({
  x = 0,
  y = 0,
  payload,
  fill,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
  fill?: string;
}) {
  return (
    <text
      dominantBaseline="text-after-edge"
      fill={fill}
      fontSize={10}
      fontWeight={700}
      textAnchor="middle"
      x={x}
      y={y + 12}
    >
      {formatTimelineDate(payload?.value)}
    </text>
  );
}

function buildOverallShareMetrics(records: InbodyRecord[]) {
  const chart = buildChartPayload(records, "overall");
  const latestPoint = chart.points.at(-1);
  const previousPoint = chart.points.at(-2);

  return chart.metrics.map((metric) => {
    const readableMetric = withReadableMetricLabel(metric);
    const latestValue = getNumericValue(latestPoint?.[metric.key]);
    const previousValue = getNumericValue(previousPoint?.[metric.key]);
    const delta = latestValue != null && previousValue != null ? latestValue - previousValue : null;

    return {
      id: metric.key,
      metric: readableMetric,
      latestValue,
      previousValue,
      delta,
      points: chart.points.map((point) => ({
        date: String(point.date || ""),
        value: getNumericValue(point[metric.key]),
      })),
    } satisfies ShareMetric;
  });
}

function getPreviewBackgroundClass(background: ShareBackground) {
  if (background === "dark") {
    return "border-white/12 bg-[#121826] text-white shadow-[0_22px_48px_rgba(10,18,32,0.24)]";
  }

  if (background === "transparent") {
    return "border-border/60 bg-transparent text-foreground shadow-none";
  }

  return "border-border/70 bg-[#f8fbff] text-[#10213a] shadow-[0_20px_48px_rgba(16,35,63,0.12)]";
}

function getMutedTextClass(background: ShareBackground) {
  return background === "dark" ? "text-white/62" : "text-muted-foreground";
}

function PillScrollGroup({ children }: { children: ReactNode }) {
  return <div className="flex max-w-full gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>;
}

function OptionPill({
  active,
  children,
  disabled = false,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "h-8 shrink-0 cursor-pointer rounded-full px-4 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "border border-border/70 bg-background/72 text-muted-foreground hover:border-primary/40 hover:bg-primary/8 hover:text-foreground",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function MetricTrendPreview({ background, item }: { background: ShareBackground; item: ShareMetric }) {
  return (
    <div className={cn("grid min-h-[2.45rem] min-w-0 grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-2 rounded-[0.75rem] px-2.5 py-1", background === "dark" ? "bg-white/7" : "bg-white/62")}>
      <div className="min-w-0">
        <p className={cn("truncate text-[0.6875rem] font-semibold leading-4", getMutedTextClass(background))}>{item.metric.label}</p>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
          <p className="font-display text-base leading-none tabular-nums">{formatShareNumber(item.latestValue)}</p>
          <p className="truncate text-[0.625rem] font-semibold leading-none text-muted-foreground tabular-nums">{formatDelta(item.delta)}</p>
        </div>
      </div>
      <div className="h-7 min-w-0">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={item.points} margin={TREND_CHART_MARGIN}>
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
                    <p className="mt-1 text-sm font-medium text-foreground">{formatShareNumber(point?.value)}</p>
                  </div>
                );
              }}
            />
            <Line dataKey="value" dot={{ fill: item.metric.color, r: 2.5, strokeWidth: 0 }} isAnimationActive={false} stroke={item.metric.color} strokeLinecap="round" strokeWidth={2} type="monotone">
              <LabelList
                dataKey="value"
                formatter={(value: number | null) => (value != null ? formatShareNumber(value) : "")}
                position="top"
                style={{ fill: background === "dark" ? "#ffffffa0" : "#1f3355", fontSize: 7.5, fontWeight: 700 }}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ShareTimelineChart({
  background,
  points,
  ticks,
}: {
  background: ShareBackground;
  points: ShareMetric["points"];
  ticks: string[];
}) {
  if (!points.length) {
    return null;
  }

  return (
    <div className="h-6 min-w-0">
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={points} margin={TIMELINE_CHART_MARGIN}>
          <XAxis
            axisLine={{ stroke: background === "dark" ? "#ffffff26" : "#0000001a" }}
            dataKey="date"
            interval={0}
            tick={<TimelineTick fill={background === "dark" ? "#ffffff55" : "#6b7280"} />}
            tickLine={false}
            ticks={ticks}
          />
          <YAxis hide />
          <Line dataKey="value" dot={false} isAnimationActive={false} stroke="transparent" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function MetricCurrentPreview({ background, item }: { background: ShareBackground; item: ShareMetric }) {
  return (
    <div className={cn("grid min-h-[2.45rem] min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[0.75rem] px-2.5 py-1", background === "dark" ? "bg-white/7" : "bg-white/62")}>
      <div className="min-w-0">
        <p className={cn("truncate text-[0.6875rem] font-semibold leading-4", getMutedTextClass(background))}>{item.metric.label}</p>
        <p className="mt-0.5 font-display text-base leading-none tabular-nums">{formatShareNumber(item.latestValue)}</p>
      </div>
      <p className="shrink-0 text-[0.625rem] font-semibold leading-none text-muted-foreground tabular-nums">{formatDelta(item.delta)}</p>
    </div>
  );
}

interface TrendShareWorkspaceProps {
  records: InbodyRecord[];
}

function SharePreviewContent({
  background,
  effectiveShareColumns,
  selectedMetrics,
  sharePosition,
  shareStyle,
  timelineDates,
  timelinePoints,
  titleAlign,
  titleMode,
}: {
  background: ShareBackground;
  effectiveShareColumns: 1 | 2;
  selectedMetrics: ShareMetric[];
  sharePosition: SharePosition;
  shareStyle: ShareStyle;
  timelineDates: string[];
  timelinePoints: ShareMetric["points"];
  titleAlign: TitleAlign;
  titleMode: TitleMode;
}) {
  return (
    <div className={cn("flex h-full min-w-0 flex-col gap-2", sharePosition === "top" ? "justify-start" : sharePosition === "center" ? "justify-center" : "justify-end")}>
      <div className="min-w-0">
        <div className={cn("flex min-w-0 flex-1 flex-col", getTitleAlignClass(titleAlign))}>
          <div className="min-w-0 max-w-full">{titleMode === "show" ? <h2 className="truncate font-display text-xl leading-tight">我的身體趨勢</h2> : null}</div>
        </div>
      </div>

      <div className={cn("grid min-w-0 gap-1.5", effectiveShareColumns === 1 ? "grid-cols-1" : "grid-cols-2")}>
        {selectedMetrics.length ? (
          selectedMetrics.map((item) =>
            shareStyle === "trend" ? (
              <MetricTrendPreview background={background} item={item} key={item.id} />
            ) : (
              <MetricCurrentPreview background={background} item={item} key={item.id} />
            ),
          )
        ) : (
          <div className={cn("rounded-[1rem] border border-dashed px-4 py-12 text-center text-sm", background === "dark" ? "border-white/16 text-white/62" : "border-border/80 text-muted-foreground")}>
            尚未選擇分享數據。
          </div>
        )}
      </div>

      <div className="grid min-w-0 grid-cols-[5.25rem_minmax(0,1fr)] items-end gap-2 px-2.5">
        <div className="flex h-6 items-end pb-[3px]">
          <p className={cn("truncate font-display text-sm leading-none", background === "dark" ? "text-white/55" : "text-muted-foreground/75")}>Insight Up</p>
        </div>
        {shareStyle === "trend" ? <ShareTimelineChart background={background} points={timelinePoints} ticks={timelineDates} /> : null}
      </div>
    </div>
  );
}

export function TrendShareWorkspace({ records }: TrendShareWorkspaceProps) {
  const router = useRouter();
  const shareMetrics = useMemo(() => buildOverallShareMetrics(records), [records]);
  const latestDate = records.filter((record) => record.isIncludedInCharts).at(-1)?.date ?? null;
  const defaultSelectedIds = useMemo(() => shareMetrics.slice(0, 4).map((item) => item.id), [shareMetrics]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [shareStyle, setShareStyle] = useState<ShareStyle>("trend");
  const [shareBackground, setShareBackground] = useState<ShareBackground>("light");
  const [sharePosition, setSharePosition] = useState<SharePosition>("bottom");
  const [shareColumns, setShareColumns] = useState<1 | 2>(2);
  const [titleMode, setTitleMode] = useState<TitleMode>("show");
  const [titleAlign, setTitleAlign] = useState<TitleAlign>("left");
  const [isSaving, setIsSaving] = useState(false);
  const [activeControl, setActiveControl] = useState<ControlPanel | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const selectedMetrics = useMemo(() => shareMetrics.filter((item) => selectedIds.includes(item.id)), [selectedIds, shareMetrics]);
  const timelinePoints = selectedMetrics[0]?.points ?? [];
  const timelineDates = buildTimelineDates(timelinePoints);
  const effectiveShareColumns = shareStyle === "trend" ? 1 : shareColumns;
  const hasEnoughData = records.filter((record) => record.isIncludedInCharts).length >= 2;

  useEffect(() => {
    setSelectedIds((current) => (current.length ? current : defaultSelectedIds));
  }, [defaultSelectedIds]);

  function toggleMetric(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function handleShareStyleChange(nextStyle: ShareStyle) {
    setShareStyle(nextStyle);
    if (nextStyle === "trend") {
      setShareColumns(1);
    }
  }

  function handleControlToggle(panel: ControlPanel) {
    setActiveControl((current) => (current === panel ? null : panel));
  }

  const saveImage = useCallback(async () => {
    if (!selectedMetrics.length) {
      toast.error("請先選擇至少一項分享數據。");
      return;
    }

    const previewNode = previewRef.current;
    if (!previewNode) return;

    setIsSaving(true);
    const toastId = toast.loading("正在產生圖片...");

    try {
      const sourceWidth = previewNode.offsetWidth;
      const sourceHeight = previewNode.offsetHeight;
      const exportWidth = EXPORT_IMAGE_WIDTH;
      const exportHeight = Math.round((EXPORT_IMAGE_WIDTH * sourceHeight) / sourceWidth);
      const dataUrl = await toPng(previewNode, {
        cacheBust: true,
        height: sourceHeight,
        width: sourceWidth,
        canvasHeight: exportHeight,
        canvasWidth: exportWidth,
        pixelRatio: 1,
        skipFonts: false,
        style: {
          height: `${sourceHeight}px`,
          margin: "0",
          width: `${sourceWidth}px`,
        },
      });

      const link = document.createElement("a");
      link.download = `insightup-trend-${latestDate ?? "share"}-${exportWidth}x${exportHeight}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("圖片已下載。", { id: toastId });
    } catch {
      toast.error("圖片下載失敗，請再試一次。", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  }, [latestDate, selectedMetrics]);

  if (!shareMetrics.length) {
    return (
      <div className="surface-state-panel flex min-h-[52vh] w-full max-w-full items-center justify-center overflow-hidden rounded-[1.75rem] px-6 text-center text-sm text-muted-foreground">
        目前沒有可分享的整體趨勢資料。
      </div>
    );
  }

  return (
    <div className="relative -mx-6 flex min-h-[calc(100vh-var(--app-header-offset,0px)-1rem)] w-[calc(100%+3rem)] max-w-none flex-col overflow-x-hidden px-4 pb-52 sm:px-6 lg:-mx-10 lg:w-[calc(100%+5rem)] lg:px-10">
      <h1 className="sr-only">分享趨勢數據</h1>

      <section className="flex min-h-[calc(100vh-var(--app-header-offset,0px)-16.5rem)] min-w-0 shrink-0 items-start justify-center pt-2">
        <div ref={previewRef} className={cn("relative mx-auto aspect-[9/16] h-[min(58vh,34rem)] max-w-full min-w-0 overflow-hidden border p-3 shadow-panel sm:p-4", getPreviewBackgroundClass(shareBackground))}>
          <SharePreviewContent
            background={shareBackground}
            effectiveShareColumns={effectiveShareColumns}
            selectedMetrics={selectedMetrics}
            sharePosition={sharePosition}
            shareStyle={shareStyle}
            timelineDates={timelineDates}
            timelinePoints={timelinePoints}
            titleAlign={titleAlign}
            titleMode={titleMode}
          />
        </div>
      </section>

      {!hasEnoughData ? (
        <div className="mt-3 rounded-[1.25rem] border border-border/70 bg-card/78 px-4 py-3 text-sm text-muted-foreground">
          至少需要 2 筆納入圖表的紀錄，趨勢變化才會更有參考價值。
        </div>
      ) : null}

      <div className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-40 mx-auto max-w-xl rounded-[1.25rem] border border-border/75 bg-card/95 p-3 shadow-panel backdrop-blur">
        {activeControl === "style" ? (
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">樣式</p>
            <PillScrollGroup>
              {STYLE_OPTIONS.map((option) => (
                <OptionPill active={shareStyle === option.value} key={option.value} onClick={() => handleShareStyleChange(option.value)}>
                  {option.label}
                </OptionPill>
              ))}
            </PillScrollGroup>
          </div>
        ) : null}

        {activeControl === "background" ? (
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">背景</p>
            <PillScrollGroup>
              {BACKGROUND_OPTIONS.map((option) => (
                <OptionPill active={shareBackground === option.value} key={option.value} onClick={() => setShareBackground(option.value)}>
                  {option.label}
                </OptionPill>
              ))}
            </PillScrollGroup>
          </div>
        ) : null}

        {activeControl === "title" ? (
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Title</p>
              <PillScrollGroup>
                {TITLE_MODE_OPTIONS.map((option) => (
                  <OptionPill active={titleMode === option.value} key={option.value} onClick={() => setTitleMode(option.value)}>
                    {option.label}
                  </OptionPill>
                ))}
              </PillScrollGroup>
            </div>
            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Title 對齊</p>
              <PillScrollGroup>
                {TITLE_ALIGN_OPTIONS.map((option) => (
                  <OptionPill active={titleAlign === option.value} key={option.value} onClick={() => setTitleAlign(option.value)}>
                    {option.label}
                  </OptionPill>
                ))}
              </PillScrollGroup>
            </div>
          </div>
        ) : null}

        {activeControl === "layout" ? (
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">位置</p>
              <PillScrollGroup>
                {POSITION_OPTIONS.map((option) => (
                  <OptionPill active={sharePosition === option.value} key={option.value} onClick={() => setSharePosition(option.value)}>
                    {option.label}
                  </OptionPill>
                ))}
              </PillScrollGroup>
            </div>
            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">欄位</p>
              <PillScrollGroup>
                {COLUMN_OPTIONS.map((option) => (
                  <OptionPill
                    active={effectiveShareColumns === option.value}
                    disabled={shareStyle === "trend" && option.value === 2}
                    key={String(option.value)}
                    onClick={() => setShareColumns(option.value)}
                  >
                    {option.label}
                  </OptionPill>
                ))}
              </PillScrollGroup>
            </div>
          </div>
        ) : null}

        {activeControl === "metrics" ? (
          <div className="min-w-0">
            <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">數據</p>
              <div className="flex shrink-0 gap-1.5">
                <button
                  className="h-7 cursor-pointer rounded-full border border-border/70 bg-background/72 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => setSelectedIds(shareMetrics.map((item) => item.id))}
                  type="button"
                >
                  全選
                </button>
                <button
                  className="h-7 cursor-pointer rounded-full px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-destructive/8 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => setSelectedIds([])}
                  type="button"
                >
                  清除
                </button>
              </div>
            </div>
            <div className="max-h-24 min-w-0 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-1.5">
                {shareMetrics.map((item) => {
                  const checked = selectedIds.includes(item.id);

                  return (
                    <button
                      aria-pressed={checked}
                      className={cn(
                        "flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        checked
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "border border-border/70 bg-background/72 text-muted-foreground hover:border-primary/40 hover:bg-primary/8 hover:text-foreground",
                      )}
                      key={item.id}
                      onClick={() => toggleMetric(item.id)}
                      type="button"
                    >
                      {checked && <Check className="size-3 shrink-0" />}
                      <span>{item.metric.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex items-end justify-between px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <Button aria-label="取消" className="pointer-events-auto size-12 rounded-full shadow-panel" onClick={() => router.back()} size="icon" type="button" variant="outline">
          <X className="size-5" />
        </Button>
        <div className="pointer-events-auto grid grid-cols-5 rounded-full border border-border/75 bg-card/95 p-1 shadow-panel backdrop-blur">
          <button
            aria-label="調整樣式"
            aria-pressed={activeControl === "style"}
            className={cn(
              "grid size-10 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              activeControl === "style" && "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgb(var(--primary)/0.18)]",
            )}
            onClick={() => handleControlToggle("style")}
            type="button"
          >
            <Palette className="size-4" />
          </button>
          <button
            aria-label="調整背景"
            aria-pressed={activeControl === "background"}
            className={cn(
              "grid size-10 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              activeControl === "background" && "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgb(var(--primary)/0.18)]",
            )}
            onClick={() => handleControlToggle("background")}
            type="button"
          >
            <ImageIcon className="size-4" />
          </button>
          <button
            aria-label="調整標題"
            aria-pressed={activeControl === "title"}
            className={cn(
              "grid size-10 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              activeControl === "title" && "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgb(var(--primary)/0.18)]",
            )}
            onClick={() => handleControlToggle("title")}
            type="button"
          >
            <Type className="size-4" />
          </button>
          <button
            aria-label="調整版面"
            aria-pressed={activeControl === "layout"}
            className={cn(
              "grid size-10 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              activeControl === "layout" && "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgb(var(--primary)/0.18)]",
            )}
            onClick={() => handleControlToggle("layout")}
            type="button"
          >
            <Columns3 className="size-4" />
          </button>
          <button
            aria-label="選擇數據"
            aria-pressed={activeControl === "metrics"}
            className={cn(
              "grid size-10 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              activeControl === "metrics" && "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgb(var(--primary)/0.18)]",
            )}
            onClick={() => handleControlToggle("metrics")}
            type="button"
          >
            <ListChecks className="size-4" />
          </button>
        </div>
        <Button aria-label="下載圖片" className="pointer-events-auto size-12 rounded-full shadow-panel" disabled={!selectedMetrics.length || isSaving} onClick={saveImage} size="icon" type="button">
          <Download className="size-5" />
        </Button>
      </div>
    </div>
  );
}
