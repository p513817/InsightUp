"use client";

import { Check, Columns3, Download, Image as ImageIcon, ListChecks, Maximize2, Minimize2, Palette, Pipette, RotateCcw, TrendingUp, Type, X } from "lucide-react";
import { toPng } from "html-to-image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Customized, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { DirectionalTrendOverlay } from "@/components/charts/directional-trend-line";
import { useLocale } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { buildChartPayload } from "@/lib/inbody/records";
import type { ChartMetric, InbodyRecord } from "@/lib/inbody/types";
import { formatChartDate } from "@/lib/presentation";
import { cn } from "@/lib/utils";

type ShareStyle = "trend" | "current";
type ShareBackground = "light" | "dark" | "transparent" | "custom";
type SharePosition = "top" | "center" | "bottom";
type TitleMode = "show" | "hide";
type TitleAlign = "left" | "center" | "right";
type ControlPanel = "style" | "background" | "title" | "layout" | "metrics" | "colors";
type TextColorTarget = "title" | "brand" | "date";

type ShareMetric = {
  id: string;
  metric: ChartMetric;
  latestValue: number | null;
  previousValue: number | null;
  delta: number | null;
  points: Array<{ date: string; value: number | null }>;
};

const EXPORT_IMAGE_WIDTH = 1080;
const SHARE_CAPTURE_RETRY_DELAY_MS = 180;
const TREND_CHART_MARGIN = { bottom: 8, left: 20, right: 20, top: 8 };
const TIMELINE_CHART_MARGIN = { bottom: 0, left: 20, right: 20, top: 0 };
const SHARE_COLOR_SWATCHES = ["#ffffff", "#64748b", "#2563eb", "#10b981", "#f59e0b", "#ef4444"];
const TIMELINE_MONTH_LABELS = ["Jan.", "Feb.", "Mar.", "Apr.", "May.", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];

const OVERALL_LABELS: Record<string, string> = {
  weight: "\u9ad4\u91cd",
  muscle: "\u9aa8\u9abc\u808c\u91cf",
  fat: "\u9ad4\u8102\u80aa\u91cf",
  fatPercent: "\u9ad4\u8102\u7387",
  score: "InBody \u5206\u6578",
  visceralFatLevel: "\u5167\u81df\u8102\u80aa\u7b49\u7d1a",
  bmr: "\u57fa\u790e\u4ee3\u8b1d\u7387",
  recommendedCalories: "\u5efa\u8b70\u71b1\u91cf",
};

const OVERALL_LABELS_EN: Record<string, string> = {
  weight: "Weight",
  muscle: "Skeletal muscle",
  fat: "Body fat",
  fatPercent: "Body fat %",
  score: "InBody score",
  visceralFatLevel: "Visceral fat level",
  bmr: "BMR",
  recommendedCalories: "Recommended calories",
};

function getNumericValue(value: string | number | null | undefined) {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isWhiteColor(color: string) {
  return color.toLowerCase() === "#ffffff" || color.toLowerCase() === "#fff";
}

function isPresetShareColor(color: string) {
  return SHARE_COLOR_SWATCHES.some((swatch) => swatch.toLowerCase() === color.toLowerCase());
}

function withReadableMetricLabel(metric: ChartMetric, labels: Record<string, string>) {
  return {
    ...metric,
    label: labels[metric.key] || metric.label,
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

function formatTimelineDateParts(date: string | undefined) {
  const [month = "", day = ""] = formatTimelineDate(date).split("/");
  const monthIndex = Number(month) - 1;

  return { day: day.padStart(2, "0"), month: TIMELINE_MONTH_LABELS[monthIndex] ?? month.padStart(2, "0") };
}

async function dataUrlToImageFile(dataUrl: string, fileName: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: "image/png" });
}

function canTryShareImageFile(file: File) {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }

  try {
    navigator.canShare?.({ files: [file] });
  } catch {
    // Some iOS browsers throw here even though navigator.share can still open.
  }

  return true;
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function waitForAnimationFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function waitForDelay(delayMs: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, delayMs));
}

async function waitForSharePreviewReady() {
  await document.fonts?.ready.catch(() => undefined);
  await waitForAnimationFrame();
  await waitForAnimationFrame();
}

async function renderSharePreviewImage(previewNode: HTMLDivElement) {
  await waitForSharePreviewReady();

  const sourceRect = previewNode.getBoundingClientRect();
  const sourceWidth = Math.max(1, Math.round(sourceRect.width));
  const sourceHeight = Math.max(1, Math.round(sourceRect.height));
  const exportWidth = EXPORT_IMAGE_WIDTH;
  const exportHeight = Math.round((exportWidth * sourceHeight) / sourceWidth);

  const options = {
    cacheBust: true,
    canvasHeight: exportHeight,
    canvasWidth: exportWidth,
    height: sourceHeight,
    pixelRatio: 1,
    scrollX: 0,
    scrollY: 0,
    skipFonts: false,
    style: {
      height: `${sourceHeight}px`,
      margin: "0",
      transform: "none",
      transformOrigin: "top left",
      width: `${sourceWidth}px`,
    },
    width: sourceWidth,
  };

  try {
    return {
      dataUrl: await toPng(previewNode, options),
      exportHeight,
      exportWidth,
    };
  } catch {
    await waitForDelay(SHARE_CAPTURE_RETRY_DELAY_MS);
    await waitForSharePreviewReady();

    return {
      dataUrl: await toPng(previewNode, options),
      exportHeight,
      exportWidth,
    };
  }
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

  if (dates.length <= 5) {
    return dates;
  }

  const lastIndex = dates.length - 1;
  return [dates[0], dates[Math.round(lastIndex / 4)], dates[Math.round(lastIndex / 2)], dates[Math.round((lastIndex * 3) / 4)], dates[lastIndex]];
}

interface ColorSwatchPickerProps {
  color: string;
  customLabel: string;
  disabled?: boolean;
  inputAriaLabel: string;
  onChange: (color: string) => void;
  swatchAriaLabelPrefix: string;
}

function ColorSwatchPicker({
  color,
  customLabel,
  disabled = false,
  inputAriaLabel,
  onChange,
  swatchAriaLabelPrefix,
}: ColorSwatchPickerProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-1.5 overflow-x-auto px-0 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", disabled && "pointer-events-none opacity-45 grayscale")}>
      {SHARE_COLOR_SWATCHES.map((swatch) => {
        const checked = color.toLowerCase() === swatch.toLowerCase();

        return (
          <span className="relative inline-flex h-6 w-5 shrink-0 items-center justify-center" key={`${swatchAriaLabelPrefix}-${swatch}`}>
            <button
              aria-label={`${swatchAriaLabelPrefix} ${swatch}`}
              className={cn(
                "size-5 shrink-0 cursor-pointer rounded-full border border-slate-200/90 transition-[box-shadow,border-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isWhiteColor(swatch) && "bg-white",
                checked ? "border-slate-500 shadow-[0_0_0_3px_rgba(148,163,184,0.16)]" : "hover:border-slate-300 hover:shadow-sm",
              )}
              disabled={disabled}
              onClick={() => onChange(swatch)}
              style={{
                backgroundColor: swatch,
                boxShadow: isWhiteColor(swatch) ? "inset 0 0 0 1px rgba(148, 163, 184, 0.3)" : undefined,
              }}
              type="button"
            />
            {checked ? (
              <Check
                className={cn(
                  "pointer-events-none absolute inset-0 m-auto size-2.5",
                  isWhiteColor(swatch) ? "text-slate-700 drop-shadow-[0_1px_1px_rgba(255,255,255,0.85)]" : "text-white drop-shadow-[0_1px_1px_rgba(15,23,42,0.7)]",
                )}
              />
            ) : null}
          </span>
        );
      })}
      <label
        className={cn(
          "inline-flex h-7 min-w-[3.75rem] shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full border bg-background/72 px-2 text-[0.625rem] font-medium leading-none text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-within:ring-2 focus-within:ring-primary",
          isPresetShareColor(color) ? "border-slate-200/90" : "border-slate-500 shadow-[0_0_0_3px_rgba(148,163,184,0.16)]",
        )}
      >
        <span className="relative size-5 rounded-full border border-slate-200/90 shadow-sm" style={{ backgroundColor: color }}>
          {!isPresetShareColor(color) ? (
            <Check
              className={cn(
                "pointer-events-none absolute inset-0 m-auto size-2.5",
                isWhiteColor(color) ? "text-slate-700 drop-shadow-[0_1px_1px_rgba(255,255,255,0.85)]" : "text-white drop-shadow-[0_1px_1px_rgba(15,23,42,0.7)]",
              )}
            />
          ) : null}
        </span>
        <span>{customLabel}</span>
        <input
          aria-label={inputAriaLabel}
          className="pointer-events-none fixed left-1/2 top-[38vh] size-8 -translate-x-1/2 opacity-0"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          type="color"
          value={color}
        />
      </label>
    </div>
  );
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
  const { day, month } = formatTimelineDateParts(payload?.value);

  if (!month || !day) {
    return null;
  }

  return (
    <g transform={`translate(${x}, ${y})`}>
      <text dominantBaseline="middle" fill={fill} fontSize={7.5} fontWeight={800} textAnchor="middle" x={0} y={4}>
        {month}
      </text>
      <text dominantBaseline="middle" fill={fill} fontSize={8} fontWeight={800} textAnchor="middle" x={0} y={13}>
        {day}
      </text>
    </g>
  );
}

function buildOverallShareMetrics(records: InbodyRecord[], labels: Record<string, string>, locale: string) {
  const chart = buildChartPayload(records, "overall", locale === "en" ? "en" : "zh-Hant");
  const latestPoint = chart.points.at(-1);
  const previousPoint = chart.points.at(-2);

  return chart.metrics.map((metric) => {
    const readableMetric = withReadableMetricLabel(metric, labels);
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
    return "bg-transparent text-foreground shadow-none";
  }

  if (background === "custom") {
    return "border-border/70 text-[#10213a] shadow-[0_20px_48px_rgba(16,35,63,0.12)]";
  }

  return "border-border/70 bg-[#f8fbff] text-[#10213a] shadow-[0_20px_48px_rgba(16,35,63,0.12)]";
}

function hexToRgba(hexColor: string, opacity: number) {
  const normalized = hexColor.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const alpha = Math.min(1, Math.max(0, opacity / 100));

  if (![red, green, blue].every(Number.isFinite)) {
    return `rgb(248 251 255 / ${alpha})`;
  }

  return `rgb(${red} ${green} ${blue} / ${alpha})`;
}

function getHexLuminance(hexColor: string) {
  const normalized = hexColor.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  if (![red, green, blue].every(Number.isFinite)) {
    return null;
  }

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function getAutomaticTextColor(background: ShareBackground, customColor: string, customOpacity: number) {
  if (background === "dark") {
    return "#f8fbff";
  }

  const luminance = background === "custom" ? getHexLuminance(customColor) : null;
  const useLightText = customOpacity >= 70 && luminance != null && luminance < 108;

  return useLightText ? "#f8fbff" : "#10213a";
}

function getAutomaticMutedTextColor(background: ShareBackground, customColor: string, customOpacity: number) {
  if (background === "dark") {
    return "rgb(255 255 255 / 0.55)";
  }

  const luminance = background === "custom" ? getHexLuminance(customColor) : null;
  const useLightText = customOpacity >= 70 && luminance != null && luminance < 108;

  return useLightText ? "rgb(255 255 255 / 0.62)" : "#64748b";
}

function getPreviewBackgroundStyle(background: ShareBackground, customColor: string, customOpacity: number): CSSProperties | undefined {
  if (background !== "custom") {
    return undefined;
  }

  return {
    backgroundColor: hexToRgba(customColor, customOpacity),
  };
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
        <p className="truncate text-[0.6875rem] font-semibold leading-4" style={{ color: item.metric.color }}>
          {item.metric.label}
        </p>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
          <p className="font-display text-base leading-none tabular-nums" style={{ color: item.metric.color }}>
            {formatShareNumber(item.latestValue)}
          </p>
          <p className="truncate text-[0.625rem] font-semibold leading-none tabular-nums" style={{ color: item.metric.color }}>
            {formatDelta(item.delta)}
          </p>
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
              <Line
              dataKey="value"
              dot={{ fill: item.metric.color, r: 2.5, strokeWidth: 0 }}
              isAnimationActive={false}
              stroke={item.metric.color}
              strokeOpacity={0}
              strokeLinecap="round"
              strokeWidth={2}
            >
              <LabelList
                dataKey="value"
                formatter={(value: number | null) => (value != null ? formatShareNumber(value) : "")}
                position="top"
                style={{ fill: item.metric.color, fontSize: 7.5, fontWeight: 700 }}
              />
            </Line>
            <Customized component={DirectionalTrendOverlay} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ShareTimelineChart({
  background,
  dateColor,
  points,
  ticks,
}: {
  background: ShareBackground;
  dateColor: string;
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
            tick={<TimelineTick fill={dateColor} />}
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
        <p className="truncate text-[0.6875rem] font-semibold leading-4" style={{ color: item.metric.color }}>
          {item.metric.label}
        </p>
        <p className="mt-0.5 font-display text-base leading-none tabular-nums" style={{ color: item.metric.color }}>
          {formatShareNumber(item.latestValue)}
        </p>
      </div>
      <p className="shrink-0 text-[0.625rem] font-semibold leading-none tabular-nums" style={{ color: item.metric.color }}>
        {formatDelta(item.delta)}
      </p>
    </div>
  );
}

interface TrendShareWorkspaceProps {
  records: InbodyRecord[];
}

function SharePreviewContent({
  background,
  brandColor,
  dateColor,
  effectiveShareColumns,
  selectedMetrics,
  sharePosition,
  shareStyle,
  timelineDates,
  timelinePoints,
  titleAlign,
  titleColor,
  titleMode,
  isEnglish,
}: {
  background: ShareBackground;
  brandColor: string;
  dateColor: string;
  effectiveShareColumns: 1 | 2;
  selectedMetrics: ShareMetric[];
  sharePosition: SharePosition;
  shareStyle: ShareStyle;
  timelineDates: string[];
  timelinePoints: ShareMetric["points"];
  titleAlign: TitleAlign;
  titleColor: string;
  titleMode: TitleMode;
  isEnglish: boolean;
}) {
  return (
    <div className={cn("flex h-full w-full min-w-0 flex-col gap-2", sharePosition === "top" ? "justify-start" : sharePosition === "center" ? "justify-center" : "justify-end")}>
      <div className="min-w-0">
        <div className={cn("flex min-w-0 w-full flex-1 flex-col", getTitleAlignClass(titleAlign))} style={{ color: titleColor }}>
          <div className="min-w-0 max-w-full">{titleMode === "show" ? <h2 className="truncate font-display text-xl leading-tight">{isEnglish ? "Trend overview" : "\u6211\u7684\u8eab\u9ad4\u8d8b\u52e2"}</h2> : null}</div>
        </div>
      </div>

      <div className={cn("grid w-full min-w-0 gap-1.5", effectiveShareColumns === 1 ? "grid-cols-1" : "grid-cols-2")}>
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
            {isEnglish ? "There are no trend records available to share right now." : "\u76ee\u524d\u6c92\u6709\u53ef\u5206\u4eab\u7684\u8d8b\u52e2\u8cc7\u6599\u3002"}
          </div>
        )}
      </div>

      <div className="grid w-full min-w-0 grid-cols-[5.25rem_minmax(0,1fr)] items-end gap-2 px-2.5">
        <div className="flex h-6 items-end pb-[3px]">
          <p className="truncate font-display text-sm leading-none" style={{ color: brandColor }}>Insight Up</p>
        </div>
        {shareStyle === "trend" ? <ShareTimelineChart background={background} dateColor={dateColor} points={timelinePoints} ticks={timelineDates} /> : null}
      </div>
    </div>
  );
}

export function TrendShareWorkspace({ records }: TrendShareWorkspaceProps) {
  const router = useRouter();
  const locale = useLocale();
  const isEnglish = locale === "en";
  const shareMetrics = useMemo(() => buildOverallShareMetrics(records, isEnglish ? OVERALL_LABELS_EN : OVERALL_LABELS, locale), [isEnglish, locale, records]);
  const latestDate = records.filter((record) => record.isIncludedInCharts).at(-1)?.date ?? null;
  const defaultSelectedIds = useMemo(() => shareMetrics.slice(0, 4).map((item) => item.id), [shareMetrics]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [metricColors, setMetricColors] = useState<Record<string, string>>({});
  const [syncMetricColors, setSyncMetricColors] = useState(false);
  const [shareStyle, setShareStyle] = useState<ShareStyle>("trend");
  const [shareBackground, setShareBackground] = useState<ShareBackground>("light");
  const [customBackgroundColor, setCustomBackgroundColor] = useState("#f8fbff");
  const [customBackgroundOpacity, setCustomBackgroundOpacity] = useState(100);
  const [sharePosition, setSharePosition] = useState<SharePosition>("bottom");
  const [shareColumns, setShareColumns] = useState<1 | 2>(2);
  const [titleMode, setTitleMode] = useState<TitleMode>("show");
  const [titleAlign, setTitleAlign] = useState<TitleAlign>("left");
  const [textColors, setTextColors] = useState<Partial<Record<TextColorTarget, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeControl, setActiveControl] = useState<ControlPanel | null>("style");
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const styleOptions = isEnglish
    ? [
        { value: "trend" as const, label: "Trend" },
        { value: "current" as const, label: "Current" },
      ]
    : [
        { value: "trend" as const, label: "\u8d8b\u52e2" },
        { value: "current" as const, label: "\u76ee\u524d" },
      ];
  const backgroundOptions = isEnglish
    ? [
        { value: "light" as const, label: "Light" },
        { value: "dark" as const, label: "Dark" },
        { value: "transparent" as const, label: "Transparent" },
        { value: "custom" as const, label: "Custom" },
      ]
    : [
        { value: "light" as const, label: "\u6dfa\u8272" },
        { value: "dark" as const, label: "\u6df1\u8272" },
        { value: "transparent" as const, label: "\u900f\u660e" },
        { value: "custom" as const, label: "\u81ea\u8a02" },
      ];
  const positionOptions = isEnglish
    ? [
        { value: "top" as const, label: "Top" },
        { value: "center" as const, label: "Center" },
        { value: "bottom" as const, label: "Bottom" },
      ]
    : [
        { value: "top" as const, label: "\u4e0a\u65b9" },
        { value: "center" as const, label: "\u7f6e\u4e2d" },
        { value: "bottom" as const, label: "\u4e0b\u65b9" },
      ];
  const columnOptions = isEnglish
    ? [
        { value: 1 as const, label: "One column" },
        { value: 2 as const, label: "Two columns" },
      ]
    : [
        { value: 1 as const, label: "\u4e00\u6b04" },
        { value: 2 as const, label: "\u5169\u6b04" },
      ];
  const titleModeOptions = isEnglish
    ? [
        { value: "show" as const, label: "Show" },
        { value: "hide" as const, label: "Hide" },
      ]
    : [
        { value: "show" as const, label: "\u986f\u793a" },
        { value: "hide" as const, label: "\u96b1\u85cf" },
      ];
  const titleAlignOptions = isEnglish
    ? [
        { value: "left" as const, label: "Left" },
        { value: "center" as const, label: "Center" },
        { value: "right" as const, label: "Right" },
      ]
    : [
        { value: "left" as const, label: "\u9760\u5de6" },
        { value: "center" as const, label: "\u7f6e\u4e2d" },
        { value: "right" as const, label: "\u9760\u53f3" },
      ];

  const previewRef = useRef<HTMLDivElement>(null);
  const coloredShareMetrics = useMemo(
    () =>
      shareMetrics.map((item) => ({
        ...item,
        metric: {
          ...item.metric,
          color: metricColors[item.id] ?? item.metric.color,
        },
      })),
    [metricColors, shareMetrics],
  );
  const selectedMetrics = useMemo(() => coloredShareMetrics.filter((item) => selectedIds.includes(item.id)), [coloredShareMetrics, selectedIds]);
  const syncMetricColor = syncMetricColors ? selectedMetrics[0]?.metric.color ?? null : null;
  const timelinePoints = selectedMetrics[0]?.points ?? [];
  const timelineDates = buildTimelineDates(timelinePoints);
  const effectiveShareColumns = shareStyle === "trend" ? 1 : shareColumns;
  const hasEnoughData = records.filter((record) => record.isIncludedInCharts).length >= 2;
  const automaticTitleColor = getAutomaticTextColor(shareBackground, customBackgroundColor, customBackgroundOpacity);
  const automaticMutedTextColor = getAutomaticMutedTextColor(shareBackground, customBackgroundColor, customBackgroundOpacity);
  const effectiveTitleColor = textColors.title ?? automaticTitleColor;
  const effectiveBrandColor = textColors.brand ?? automaticMutedTextColor;
  const effectiveDateColor = textColors.date ?? automaticMutedTextColor;
  const textColorOptions = [
    { value: "title" as const, label: isEnglish ? "Title" : "\u6a19\u984c", color: effectiveTitleColor },
    { value: "brand" as const, label: "Insight Up", color: effectiveBrandColor },
    { value: "date" as const, label: isEnglish ? "Date" : "\u65e5\u671f", color: effectiveDateColor },
  ];

  useEffect(() => {
    setSelectedIds((current) => (current.length ? current : defaultSelectedIds));
  }, [defaultSelectedIds]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    if (!syncMetricColors || !syncMetricColor) {
      return;
    }

    setMetricColors((current) => {
      const next = { ...current };
      let changed = false;

      for (const id of selectedIds) {
        if (next[id] !== syncMetricColor) {
          next[id] = syncMetricColor;
          changed = true;
        }
      }

      return changed ? next : current;
    });

    setTextColors((current) => {
      if (current.title === syncMetricColor && current.brand === syncMetricColor && current.date === syncMetricColor) {
        return current;
      }

      return {
        ...current,
        title: syncMetricColor,
        brand: syncMetricColor,
        date: syncMetricColor,
      };
    });
  }, [selectedIds, syncMetricColor, syncMetricColors]);

  function toggleMetric(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function updateMetricColor(id: string, color: string) {
    setMetricColors((current) => ({
      ...current,
      ...(syncMetricColors ? Object.fromEntries(selectedIds.map((selectedId) => [selectedId, color])) : { [id]: color }),
    }));

    if (syncMetricColors) {
      setTextColors((current) => ({
        ...current,
        title: color,
        brand: color,
        date: color,
      }));
    }
  }

  function resetMetricColors() {
    setMetricColors({});
    setTextColors({});
  }

  function updateTextColor(target: TextColorTarget, color: string) {
    setTextColors((current) => ({
      ...current,
      ...(syncMetricColors ? { title: color, brand: color, date: color } : { [target]: color }),
    }));

    if (syncMetricColors) {
      setMetricColors((current) => ({
        ...current,
        ...Object.fromEntries(selectedIds.map((selectedId) => [selectedId, color])),
      }));
    }
  }

  function resetTextColors() {
    setTextColors({});
  }

  function handleShareStyleChange(nextStyle: ShareStyle) {
    setShareStyle(nextStyle);
    if (nextStyle === "trend") {
      setShareColumns(1);
    }
  }

  function handleControlToggle(panel: ControlPanel) {
    setIsPreviewExpanded(false);
    setActiveControl((current) => (current === panel ? null : panel));
  }

  function handlePreviewExpandToggle() {
    setIsPreviewExpanded((current) => {
      const next = !current;
      if (next) {
        setActiveControl(null);
      }

      return next;
    });
  }

  
  const saveImage = useCallback(async () => {
    if (!selectedMetrics.length) {
      toast.error(isEnglish ? "Select at least one metric." : "\u8acb\u81f3\u5c11\u9078\u64c7\u4e00\u500b\u6307\u6a19\u3002");
      return;
    }

    const previewNode = previewRef.current;
    if (!previewNode) return;

    setIsSaving(true);
    const toastId = toast.loading(isEnglish ? "Generating image..." : "\u6b63\u5728\u7522\u751f\u5716\u7247...");

    try {
      const { dataUrl, exportHeight, exportWidth } = await renderSharePreviewImage(previewNode);
      const fileName = `insightup-trend-${latestDate ?? "share"}-${exportWidth}x${exportHeight}.png`;

      try {
        const imageFile = await dataUrlToImageFile(dataUrl, fileName);
        if (canTryShareImageFile(imageFile)) {
          try {
            await navigator.share({
              files: [imageFile],
              title: "Insight Up",
            });
            toast.success(isEnglish ? "System share opened." : "\u5df2\u958b\u555f\u7cfb\u7d71\u5206\u4eab\u3002", { id: toastId });
            return;
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
              toast.dismiss(toastId);
              return;
            }
          }
        }
      } catch {
        // File share support can fail independently; keep the download fallback available.
      }

      downloadDataUrl(dataUrl, fileName);
      toast.success(isEnglish ? "Image downloaded." : "\u5716\u7247\u5df2\u4e0b\u8f09\u3002", { id: toastId });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        toast.dismiss(toastId);
        return;
      }

      toast.error(isEnglish ? "Image download failed. Please try again." : "\u5716\u7247\u4e0b\u8f09\u5931\u6557\uff0c\u8acb\u518d\u8a66\u4e00\u6b21\u3002", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  }, [latestDate, selectedMetrics]);

  if (!shareMetrics.length) {
    return (
      <div className="surface-state-panel flex min-h-[52vh] w-full max-w-full items-center justify-center overflow-hidden rounded-[1.75rem] px-6 text-center text-sm text-muted-foreground">
        {isEnglish ? "There are no trend records available to share right now." : "\u76ee\u524d\u6c92\u6709\u53ef\u5206\u4eab\u7684\u8d8b\u52e2\u8cc7\u6599\u3002"}
      </div>
    );
      }

  return (
    <div
      className={cn(
        "relative -mx-6 grid h-[calc(100dvh-var(--app-header-offset,0px)-1rem)] w-[calc(100%+3rem)] max-w-none gap-3 overflow-hidden px-4 sm:px-6 lg:-mx-10 lg:w-[calc(100%+5rem)] lg:px-10",
        isPreviewExpanded ? "grid-rows-[minmax(0,9fr)_minmax(0,0fr)_minmax(5rem,1fr)]" : "grid-rows-[minmax(0,7fr)_minmax(0,2fr)_minmax(5rem,1fr)]",
      )}
    >
      <h1 className="sr-only">{isEnglish ? "Share trend data" : "\u5206\u4eab\u8d8b\u52e2\u6578\u64da"}</h1>

      <div className="contents">
      <section
        className="flex min-h-0 min-w-0 items-center justify-center overflow-auto pt-2"
      >
        <div
          ref={previewRef}
          className={cn(
            "relative mx-auto aspect-[9/16] h-full max-h-full max-w-full min-w-0 overflow-hidden p-3 shadow-panel sm:p-4",
            "lg:max-h-full",
            shareBackground !== "transparent" && "border",
            getPreviewBackgroundClass(shareBackground),
          )}
          style={{
            ...getPreviewBackgroundStyle(shareBackground, customBackgroundColor, customBackgroundOpacity),
            color: getAutomaticTextColor(shareBackground, customBackgroundColor, customBackgroundOpacity),
          }}
        >
          <SharePreviewContent
            background={shareBackground}
            brandColor={effectiveBrandColor}
            dateColor={effectiveDateColor}
            effectiveShareColumns={effectiveShareColumns}
            selectedMetrics={selectedMetrics}
            sharePosition={sharePosition}
            shareStyle={shareStyle}
            timelineDates={timelineDates}
            timelinePoints={timelinePoints}
            titleAlign={titleAlign}
            titleColor={effectiveTitleColor}
            titleMode={titleMode}
            isEnglish={isEnglish}
          />
        </div>
      </section>

      <aside className={cn("flex min-h-0 overflow-hidden rounded-[1.25rem] border border-border/75 bg-card/95 shadow-panel backdrop-blur", isPreviewExpanded && "invisible pointer-events-none")}>
      <div className="share-tools-scrollbar min-h-0 flex-1 overflow-y-auto py-4 pl-4 pr-2">
      {!hasEnoughData ? (
        <div className="mt-3 rounded-[1.25rem] border border-border/70 bg-card/78 px-4 py-3 text-sm text-muted-foreground">
          {"\u81f3\u5c11\u9700\u8981 2 \u7b46\u5df2\u7d0d\u5165\u5716\u8868\u7684\u8cc7\u6599\uff0c\u8da8\u52e2\u7dda\u624d\u6703\u66f4\u5b8c\u6574\u3002"}
        </div>
      ) : null}

      {activeControl ? (
        <div className="min-h-full min-w-0 pr-2">
        {activeControl === "style" ? (
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{isEnglish ? "Style" : "\u6a23\u5f0f"}</p>
            <PillScrollGroup>
              {styleOptions.map((option) => (
                <OptionPill active={shareStyle === option.value} key={option.value} onClick={() => handleShareStyleChange(option.value)}>
                  {option.label}
                </OptionPill>
              ))}
            </PillScrollGroup>
          </div>
        ) : null}

        {activeControl === "background" ? (
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{isEnglish ? "Background" : "\u80cc\u666f"}</p>
            <PillScrollGroup>
              {backgroundOptions.map((option) => (
                <OptionPill active={shareBackground === option.value} key={option.value} onClick={() => setShareBackground(option.value)}>
                  {option.label}
                </OptionPill>
              ))}
            </PillScrollGroup>
            {shareBackground === "custom" ? (
              <>
                <div className="mt-3 grid gap-3">
                  <div className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-2 rounded-xl border border-border/65 bg-background/64 px-3 py-2">
                    <span className="truncate text-sm font-semibold text-foreground">{isEnglish ? "Color" : "Color"}</span>
                    <ColorSwatchPicker
                      color={customBackgroundColor}
                      customLabel={isEnglish ? "Custom" : "\u81ea\u8a02"}
                      inputAriaLabel={isEnglish ? "Custom background color" : "Custom background color"}
                      onChange={setCustomBackgroundColor}
                      swatchAriaLabelPrefix={isEnglish ? "Background color" : "Background color"}
                    />
                  </div>
                  <div className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)_3rem] items-center gap-3 rounded-xl border border-border/65 bg-background/64 px-3 py-2">
                    <span className="text-sm font-semibold text-foreground">{isEnglish ? "Opacity" : "Opacity"}</span>
                    <input
                      aria-label={isEnglish ? "Background opacity" : "Background opacity"}
                      className="w-full accent-primary"
                      max="100"
                      min="0"
                      onChange={(event) => setCustomBackgroundOpacity(Number(event.target.value))}
                      type="range"
                      value={customBackgroundOpacity}
                    />
                    <span className="text-right text-xs font-semibold tabular-nums text-muted-foreground">{customBackgroundOpacity}%</span>
                  </div>
                </div>
                {false ? <div className="mt-3 grid gap-3">
                <div className="flex min-w-0 items-center justify-start gap-3">
                  <label
                    className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-border/70 bg-background/72 px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/8 hover:text-foreground focus-within:ring-2 focus-within:ring-primary"
                    style={{ color: customBackgroundColor }}
                  >
                    <span className="relative grid size-6 place-items-center rounded-full border border-white/80 shadow-sm" style={{ backgroundColor: customBackgroundColor }}>
                      <Pipette className="size-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]" />
                    </span>
                    <span>{isEnglish ? "Custom" : "\u81ea\u8a02"}</span>
                    <input
                      aria-label={isEnglish ? "Custom background color" : "Custom background color"}
                      className="pointer-events-none fixed left-1/2 top-[38vh] size-8 -translate-x-1/2 opacity-0"
                      onChange={(event) => setCustomBackgroundColor(event.target.value)}
                      type="color"
                      value={customBackgroundColor}
                    />
                  </label>
                </div>
                <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_3rem] items-center gap-3">
                  <span className="text-xs font-semibold text-muted-foreground">{isEnglish ? "Opacity" : "Opacity"}</span>
                  <input
                    aria-label="\u80cc\u666f\u900f\u660e\u5ea6"
                    className="w-full accent-primary"
                    max="100"
                    min="0"
                    onChange={(event) => setCustomBackgroundOpacity(Number(event.target.value))}
                    type="range"
                    value={customBackgroundOpacity}
                  />
                  <span className="text-right text-xs font-semibold tabular-nums text-muted-foreground">{customBackgroundOpacity}%</span>
                </div>
              </div> : null}
              </>
            ) : null}
          </div>
        ) : null}

        {activeControl === "title" ? (
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{isEnglish ? "Title" : "\u6a19\u984c"}</p>
              <PillScrollGroup>
              {titleModeOptions.map((option) => (
                  <OptionPill active={titleMode === option.value} key={option.value} onClick={() => setTitleMode(option.value)}>
                    {option.label}
                  </OptionPill>
                ))}
              </PillScrollGroup>
            </div>
            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{isEnglish ? "Alignment" : "\u5c0d\u9f4a"}</p>
              <PillScrollGroup>
              {titleAlignOptions.map((option) => (
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
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{isEnglish ? "Position" : "\u4f4d\u7f6e"}</p>
              <PillScrollGroup>
              {positionOptions.map((option) => (
                  <OptionPill active={sharePosition === option.value} key={option.value} onClick={() => setSharePosition(option.value)}>
                    {option.label}
                  </OptionPill>
                ))}
              </PillScrollGroup>
            </div>
            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{isEnglish ? "Columns" : "\u6b04\u4f4d"}</p>
              <PillScrollGroup>
                {columnOptions.map((option) => (
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

        {activeControl === "colors" ? (
          <div className="min-w-0">
            <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{isEnglish ? "Chart colors" : "\u5716\u8868\u984f\u8272"}</p>
              <div className="inline-flex h-7 shrink-0 rounded-full border border-border/70 bg-background/72 p-0.5">
                <button
                  aria-pressed={!syncMetricColors}
                  className={cn(
                    "h-6 cursor-pointer rounded-full px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    !syncMetricColors ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setSyncMetricColors(false)}
                  type="button"
                >
                  {isEnglish ? "Each" : "\u9010\u9805"}
                </button>
                <button
                  aria-pressed={syncMetricColors}
                  className={cn(
                    "h-6 cursor-pointer rounded-full px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    syncMetricColors ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setSyncMetricColors(true)}
                  type="button"
                >
                  {isEnglish ? "Sync" : "\u540c\u6b65"}
                </button>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                aria-label={isEnglish ? "Reset colors" : "\u91cd\u8a2d\u984f\u8272"}
                className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={resetMetricColors}
                type="button"
              >
                <RotateCcw className="size-3.5" />
              </button>
              </div>
            </div>
            <div className="min-w-0 pr-1">
              <div className="grid gap-2">
                {selectedMetrics.length ? selectedMetrics.map((item) => {
                  return (
                  <div className="grid min-w-0 grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-2 border-b border-border/45 py-1.5 last:border-b-0" key={item.id}>
                    <div className="flex min-w-0 items-center">
                      <span className="truncate text-sm font-semibold text-foreground">{item.metric.label}</span>
                    </div>
                    <ColorSwatchPicker
                      color={item.metric.color}
                      customLabel={isEnglish ? "Custom" : "\u81ea\u8a02"}
                      inputAriaLabel={`${item.metric.label} ${isEnglish ? "custom color" : "\u81ea\u8a02\u984f\u8272"}`}
                      onChange={(color) => updateMetricColor(item.id, color)}
                      swatchAriaLabelPrefix={item.metric.label}
                    />
                  </div>
                  );
                }) : (
                  <div className="rounded-xl border border-dashed border-border/70 bg-background/50 px-3 py-4 text-sm text-muted-foreground">
                    {isEnglish ? "Select chart items first, then adjust their colors." : "\u8acb\u5148\u9078\u64c7\u8981\u986f\u793a\u7684\u9805\u76ee\uff0c\u518d\u8abf\u6574\u984f\u8272\u3002"}
                  </div>
                )}
                <div className="mt-1 min-w-0 border-t border-border/60 pt-2">
                  <div className="grid gap-2">
                    {textColorOptions.map((option) => {
                      return (
                      <div className="grid min-w-0 grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-2 border-b border-border/45 py-1.5 last:border-b-0" key={option.value}>
                        <span className="truncate text-sm font-semibold text-foreground">{option.label}</span>
                        <ColorSwatchPicker
                          color={option.color}
                          customLabel={isEnglish ? "Custom" : "\u81ea\u8a02"}
                          inputAriaLabel={`${option.label} ${isEnglish ? "custom color" : "\u81ea\u8a02\u984f\u8272"}`}
                          onChange={(color) => updateTextColor(option.value, color)}
                          swatchAriaLabelPrefix={option.label}
                        />
                      </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeControl === "metrics" ? (
          <div className="min-w-0">
            <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{isEnglish ? "Metrics" : "\u6578\u64da"}</p>
              <div className="flex shrink-0 gap-1.5">
                <button
                  className="h-7 cursor-pointer rounded-full border border-border/70 bg-background/72 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => setSelectedIds(shareMetrics.map((item) => item.id))}
                  type="button"
                >
                  {isEnglish ? "Select all" : "\u5168\u9078"}
                </button>
                <button
                  className="h-7 cursor-pointer rounded-full px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-destructive/8 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => setSelectedIds([])}
                  type="button"
                >
                  {isEnglish ? "Clear" : "\u6e05\u9664"}
                </button>
              </div>
            </div>
            <div className="min-w-0 pr-1">
              <div className="flex flex-wrap gap-1.5">
                {coloredShareMetrics.map((item) => {
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
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.metric.color }} />
                      <span>{item.metric.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
        </div>
      ) : null}

      </div>
      </aside>
      </div>

      <div className="pointer-events-none relative z-50 flex min-h-0 items-center justify-between pb-[env(safe-area-inset-bottom)]">
        <Button aria-label={isEnglish ? "Cancel" : "\u53d6\u6d88"} className="pointer-events-auto size-12 rounded-full shadow-panel sm:size-12" onClick={() => router.back()} size="icon" type="button" variant="outline">
          <X className="size-5" />
        </Button>
        <div className="pointer-events-auto grid grid-cols-7 rounded-full border border-border/75 bg-card/95 p-1 shadow-panel backdrop-blur">
          <button
            aria-label={isPreviewExpanded ? (isEnglish ? "Exit expanded preview" : "\u95dc\u9589\u653e\u5927\u9810\u89bd") : isEnglish ? "Expand preview" : "\u653e\u5927\u9810\u89bd"}
            aria-pressed={isPreviewExpanded}
            className={cn(
              "grid size-9 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:size-10",
              isPreviewExpanded && "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgb(var(--primary)/0.18)]",
            )}
            onClick={handlePreviewExpandToggle}
            type="button"
          >
            {isPreviewExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
          <button
            aria-label="\u6a23\u5f0f"
            aria-pressed={activeControl === "style"}
            className={cn(
              "grid size-9 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:size-10",
              activeControl === "style" && "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgb(var(--primary)/0.18)]",
            )}
            onClick={() => handleControlToggle("style")}
            type="button"
          >
            <TrendingUp className="size-4" />
          </button>
          <button
            aria-label="\u80cc\u666f"
            aria-pressed={activeControl === "background"}
            className={cn(
              "grid size-9 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:size-10",
              activeControl === "background" && "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgb(var(--primary)/0.18)]",
            )}
            onClick={() => handleControlToggle("background")}
            type="button"
          >
            <ImageIcon className="size-4" />
          </button>
          <button
            aria-label="\u6a19\u984c"
            aria-pressed={activeControl === "title"}
            className={cn(
              "grid size-9 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:size-10",
              activeControl === "title" && "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgb(var(--primary)/0.18)]",
            )}
            onClick={() => handleControlToggle("title")}
            type="button"
          >
            <Type className="size-4" />
          </button>
          <button
            aria-label="\u7248\u9762"
            aria-pressed={activeControl === "layout"}
            className={cn(
              "grid size-9 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:size-10",
              activeControl === "layout" && "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgb(var(--primary)/0.18)]",
            )}
            onClick={() => handleControlToggle("layout")}
            type="button"
          >
            <Columns3 className="size-4" />
          </button>
          <button
            aria-label="\u5716\u8868\u984f\u8272"
            aria-pressed={activeControl === "colors"}
            className={cn(
              "grid size-9 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:size-10",
              activeControl === "colors" && "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgb(var(--primary)/0.18)]",
            )}
            onClick={() => handleControlToggle("colors")}
            type="button"
          >
            <Palette className="size-4" />
          </button>
          <button
            aria-label="\u6578\u64da"
            aria-pressed={activeControl === "metrics"}
            className={cn(
              "grid size-9 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:size-10",
              activeControl === "metrics" && "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgb(var(--primary)/0.18)]",
            )}
            onClick={() => handleControlToggle("metrics")}
            type="button"
          >
            <ListChecks className="size-4" />
          </button>
        </div>
        <Button aria-label={isEnglish ? "Download image" : "\u4e0b\u8f09\u5716\u7247"} className="ai-generate-pulse pointer-events-auto size-12 rounded-full shadow-panel sm:size-12" disabled={!selectedMetrics.length || isSaving} onClick={saveImage} size="icon" type="button">
          <Download className="size-5" />
        </Button>
      </div>
    </div>
  );
}
