"use client";

import { Check, Columns3, Download, ListChecks, Maximize2, Minimize2, Palette, RotateCcw, TrendingUp, Type } from "lucide-react";
import { toPng } from "html-to-image";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Customized, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { DirectionalTrendOverlay } from "@/components/charts/directional-trend-line";
import { useLocale, useTranslations } from "@/components/i18n-provider";
import { FAB_BASE_CLASS, FAB_PRIMARY_TONE_CLASS } from "@/components/ui/floating-action-styles";
import { buildChartPayload } from "@/lib/inbody/records";
import type { ChartMetric, InbodyRecord } from "@/lib/inbody/types";
import { formatChartDate } from "@/lib/presentation";
import { cn } from "@/lib/utils";

type ShareStyle = "trend" | "current" | "cid";
type ShareBackground = "light" | "dark" | "transparent" | "custom";
type ShareLayout = "one" | "two";
type ShareAspect = "auto" | "1-1" | "3-4" | "9-16";
type SharePosition = "top" | "center" | "bottom";
type TitleMode = "show" | "hide";
type TitleAlign = "left" | "center" | "right";
type ControlPanel = "style" | "visual" | "title" | "layout" | "metrics";
type TextColorTarget = "title" | "brand" | "date";

type ShareMetric = {
  id: string;
  metric: ChartMetric;
  latestValue: number | null;
  previousValue: number | null;
  delta: number | null;
  points: Array<{ date: string; value: number | null }>;
};

type CidBodyType = "C" | "I" | "D";
type CidSizeType = "large" | "small" | null;

type CidMetric = {
  color: string;
  id: string;
  label: string;
  percentage: number | null;
  value: number | null;
};

const EXPORT_IMAGE_WIDTH = 1080;
const SHARE_CAPTURE_RETRY_DELAY_MS = 180;
const TREND_CHART_MARGIN = { bottom: 8, left: 20, right: 20, top: 8 };
const TIMELINE_CHART_MARGIN = { bottom: 0, left: 20, right: 20, top: 0 };
const TIMELINE_TICK_MAX_FONT_SIZE = 8;
const TIMELINE_TICK_MIN_FONT_SIZE = 5.75;
const TIMELINE_TICK_READABLE_FONT_SIZE = 7.5;
const TIMELINE_TICK_MIN_READABLE_SLOT_WIDTH = 28;
const TIMELINE_TICK_SIDE_PADDING = 3;
const TIMELINE_TICK_AVERAGE_CHAR_WIDTH = 0.58;
const SHARE_COLOR_SWATCHES = ["#ffffff", "#64748b", "#2563eb", "#10b981", "#f59e0b", "#ef4444"];
const DEFAULT_RECORD_LIMIT = 5;
const DEFAULT_SELECTED_METRIC_IDS = ["weight", "muscle", "fatPercent"];
const SHARE_TEXT_SHADOW_LIGHT =
  "0 1px 0 rgba(255,255,255,0.74), 0 2px 5px rgba(16,35,63,0.12), 0 8px 18px rgba(16,35,63,0.08)";
const SHARE_TEXT_SHADOW_DARK =
  "0 1px 1px rgba(0,0,0,0.38), 0 3px 8px rgba(0,0,0,0.28), 0 10px 22px rgba(0,0,0,0.18)";
const CID_METRIC_IDS = ["weight", "muscle", "fat"];
const CID_SCALE_PADDING = 10;
const CID_SCALE_STEP = 10;
const CID_SCALE_MIN_SPAN = 60;
const CID_STANDARD_BMI = 22;
const ROUND_ICON_PRESS_CLASS =
  "transition-[background-color,color,box-shadow,transform,filter] duration-150 active:scale-[0.92] active:rotate-6 active:brightness-95";

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

function getShareTextShadow(background: ShareBackground) {
  return background === "dark" ? SHARE_TEXT_SHADOW_DARK : SHARE_TEXT_SHADOW_LIGHT;
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

function resolveCidScale(metrics: CidMetric[]) {
  const percentages = metrics.map((item) => item.percentage).filter((value): value is number => value != null && Number.isFinite(value));
  const dataMin = Math.min(100, ...percentages);
  const dataMax = Math.max(100, ...percentages);
  let min = Math.floor((dataMin - CID_SCALE_PADDING) / CID_SCALE_STEP) * CID_SCALE_STEP;
  let max = Math.ceil((dataMax + CID_SCALE_PADDING) / CID_SCALE_STEP) * CID_SCALE_STEP;

  if (max - min < CID_SCALE_MIN_SPAN) {
    const midpoint = (min + max) / 2;
    min = Math.floor((midpoint - CID_SCALE_MIN_SPAN / 2) / CID_SCALE_STEP) * CID_SCALE_STEP;
    max = Math.ceil((midpoint + CID_SCALE_MIN_SPAN / 2) / CID_SCALE_STEP) * CID_SCALE_STEP;
  }

  const ticks = Array.from({ length: 4 }, (_, index) => Math.round(min + ((max - min) * index) / 3));

  if (!ticks.includes(100)) {
    const nearestIndex = ticks.reduce((nearest, tick, index) => (Math.abs(tick - 100) < Math.abs(ticks[nearest] - 100) ? index : nearest), 0);
    ticks[nearestIndex] = 100;
    ticks.sort((a, b) => a - b);
  }

  return { max, min, ticks };
}

function getCidScalePosition(percentage: number, scale: { min: number; max: number }) {
  return Math.max(0, Math.min(100, ((percentage - scale.min) / (scale.max - scale.min)) * 100));
}

function getCidStandardFatRatio(gender: InbodyRecord["gender"]) {
  if (gender === "male") {
    return 0.18;
  }

  if (gender === "female") {
    return 0.25;
  }

  return 0.23;
}

function getCidStandardMuscleRatio(gender: InbodyRecord["gender"]) {
  if (gender === "male") {
    return 0.45;
  }

  if (gender === "female") {
    return 0.36;
  }

  return 0.42;
}

function getCidStandardWeight(record: InbodyRecord | null, fallbackWeight: number | null) {
  const height = getNumericValue(record?.height);

  if (height && height > 0) {
    return CID_STANDARD_BMI * (height / 100) ** 2;
  }

  return fallbackWeight && fallbackWeight > 0 ? fallbackWeight : null;
}

function buildCidMetricAnalysis(record: InbodyRecord | null, metrics: ShareMetric[]) {
  const weight = getNumericValue(record?.weight);
  const muscle = getNumericValue(record?.muscle);
  const fat = getNumericValue(record?.fat);
  const standardWeight = getCidStandardWeight(record, weight);
  const gender = record?.gender ?? "unknown";

  const standardValues = {
    fat: standardWeight != null ? standardWeight * getCidStandardFatRatio(gender) : null,
    muscle: standardWeight != null ? standardWeight * getCidStandardMuscleRatio(gender) : null,
    weight: standardWeight,
  };

  const values = { fat, muscle, weight };

  return CID_METRIC_IDS.map((id) => {
    const item = metrics.find((metric) => metric.id === id);
    const value = values[id as keyof typeof values];
    const standardValue = standardValues[id as keyof typeof standardValues];

    return {
      color: item?.metric.color ?? "#17345d",
      id,
      label: item?.metric.label ?? id,
      percentage: value != null && standardValue != null && standardValue > 0 ? (value / standardValue) * 100 : null,
      value,
    };
  });
}

function resolveCidBodyType(metrics: CidMetric[]) {
  const weight = metrics.find((item) => item.id === "weight")?.percentage;
  const muscle = metrics.find((item) => item.id === "muscle")?.percentage;
  const fat = metrics.find((item) => item.id === "fat")?.percentage;

  if (weight == null || muscle == null || fat == null) {
    return "I" as const;
  }

  const tolerance = 4;

  if (muscle + tolerance < weight && muscle + tolerance < fat) {
    return "C" as const;
  }

  if (muscle > weight + tolerance && muscle > fat + tolerance) {
    return "D" as const;
  }

  return "I" as const;
}

function resolveCidSizeType(metrics: CidMetric[], bodyType: CidBodyType) {
  if (bodyType === "I") {
    return null;
  }

  const weight = metrics.find((item) => item.id === "weight")?.percentage;

  if (weight == null) {
    return null;
  }

  if (weight >= 110) {
    return "large" as const;
  }

  if (weight <= 90) {
    return "small" as const;
  }

  return null;
}

function formatTimelineDateParts(date: string | undefined) {
  if (!date) {
    return { day: "", month: "" };
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
  }).formatToParts(new Date(date));

  return {
    day: parts.find((part) => part.type === "day")?.value ?? "",
    month: parts.find((part) => part.type === "month")?.value ?? "",
  };
}

function fitTimelineLabel(text: string, slotWidth: number, preferredFontSize: number) {
  if (!text || slotWidth <= 0) {
    return {
      fontSize: preferredFontSize,
      text,
    };
  }

  const availableWidth = Math.max(4, slotWidth - TIMELINE_TICK_SIDE_PADDING * 2);
  const glyphs = Array.from(text);
  const estimatedWidth = glyphs.length * preferredFontSize * TIMELINE_TICK_AVERAGE_CHAR_WIDTH;

  if (estimatedWidth <= availableWidth) {
    return {
      fontSize: preferredFontSize,
      text,
    };
  }

  const fittedFontSize = Math.max(
    TIMELINE_TICK_MIN_FONT_SIZE,
    Math.min(preferredFontSize, availableWidth / (glyphs.length * TIMELINE_TICK_AVERAGE_CHAR_WIDTH)),
  );
  const fittedWidth = glyphs.length * fittedFontSize * TIMELINE_TICK_AVERAGE_CHAR_WIDTH;

  if (fittedWidth <= availableWidth) {
    return {
      fontSize: fittedFontSize,
      text,
    };
  }

  return {
    fontSize: TIMELINE_TICK_MIN_FONT_SIZE,
    text,
  };
}

function getMinimumTimelineTickSlotWidth() {
  return Math.max(
    TIMELINE_TICK_MIN_READABLE_SLOT_WIDTH,
    3 * TIMELINE_TICK_READABLE_FONT_SIZE * TIMELINE_TICK_AVERAGE_CHAR_WIDTH + TIMELINE_TICK_SIDE_PADDING * 2,
  );
}

function normalizeTimelineSampleCount(sampleCount: number, dateCount: number) {
  const clampedCount = Math.min(dateCount, Math.max(2, sampleCount));

  if (clampedCount >= dateCount || clampedCount <= 2 || clampedCount % 2 === dateCount % 2) {
    return clampedCount;
  }

  return Math.max(2, clampedCount - 1);
}

function sampleTimelineDates(dates: string[], sampleCount: number) {
  if (dates.length <= sampleCount) {
    return dates;
  }

  const lastIndex = dates.length - 1;
  const normalizedSampleCount = normalizeTimelineSampleCount(sampleCount, dates.length);

  if (normalizedSampleCount >= dates.length) {
    return dates;
  }

  if (normalizedSampleCount <= 2) {
    return [dates[0], dates[lastIndex]];
  }

  const indexes = new Set([0, lastIndex]);
  const middleIndex = lastIndex / 2;

  if (normalizedSampleCount % 2 === 1) {
    indexes.add(Math.round(middleIndex));
  }

  const pairCount = Math.floor((normalizedSampleCount - indexes.size) / 2);

  for (let pairIndex = 1; pairIndex <= pairCount; pairIndex += 1) {
    const leftIndex = Math.max(1, Math.min(Math.floor(middleIndex), Math.round((lastIndex * pairIndex) / (normalizedSampleCount - 1))));
    indexes.add(leftIndex);
    indexes.add(lastIndex - leftIndex);
  }

  for (let index = 1; indexes.size < normalizedSampleCount && index < lastIndex; index += 1) {
    indexes.add(index);
    if (indexes.size < normalizedSampleCount) {
      indexes.add(lastIndex - index);
    }
  }

  return Array.from(indexes)
    .sort((a, b) => a - b)
    .map((index) => dates[index]);
}

function getVisibleTimelineDates(dates: string[], timelineWidth: number) {
  if (!dates.length || timelineWidth <= 0) {
    return dates;
  }

  const plotWidth = Math.max(0, timelineWidth - TIMELINE_CHART_MARGIN.left - TIMELINE_CHART_MARGIN.right);
  const slotWidth = plotWidth / dates.length;

  if (slotWidth >= getMinimumTimelineTickSlotWidth()) {
    return dates;
  }

  const sampleCount = Math.floor(plotWidth / getMinimumTimelineTickSlotWidth());

  return sampleTimelineDates(dates, sampleCount);
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
  return points.map((point) => point.date).filter(Boolean);
}

function getShareAspectClass(aspect: ShareAspect) {
  if (aspect === "auto") {
    return "h-auto min-h-0 w-full";
  }

  if (aspect === "1-1") {
    return "aspect-square h-auto w-full";
  }

  if (aspect === "3-4") {
    return "aspect-[3/4] h-full w-auto";
  }

  return "aspect-[9/16] h-full w-auto";
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
                `size-5 shrink-0 cursor-pointer rounded-full border border-slate-200/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${ROUND_ICON_PRESS_CLASS}`,
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
  slotWidth,
  textShadow,
  visibleDateSet,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
  fill?: string;
  slotWidth: number;
  textShadow: string;
  visibleDateSet: Set<string>;
}) {
  const value = payload?.value;

  if (!value || !visibleDateSet.has(value)) {
    return null;
  }

  const { day, month } = formatTimelineDateParts(value);

  if (!month || !day) {
    return null;
  }

  const monthLabel = fitTimelineLabel(month, slotWidth, 7.5);
  const dayLabel = fitTimelineLabel(day, slotWidth, TIMELINE_TICK_MAX_FONT_SIZE);

  return (
    <g transform={`translate(${x}, ${y})`}>
      <text dominantBaseline="middle" fill={fill} fontSize={monthLabel.fontSize} fontWeight={800} style={{ textShadow }} textAnchor="middle" x={0} y={4}>
        {monthLabel.text}
      </text>
      <text dominantBaseline="middle" fill={fill} fontSize={dayLabel.fontSize} fontWeight={800} style={{ textShadow }} textAnchor="middle" x={0} y={13}>
        {dayLabel.text}
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

function buildOverallMetricLabels(t: ReturnType<typeof useTranslations>) {
  return {
    weight: t("shareTrend.metrics.weight"),
    muscle: t("shareTrend.metrics.muscle"),
    fat: t("shareTrend.metrics.fat"),
    fatPercent: t("shareTrend.metrics.fatPercent"),
    score: t("shareTrend.metrics.score"),
    visceralFatLevel: t("shareTrend.metrics.visceralFatLevel"),
    bmr: t("shareTrend.metrics.bmr"),
    recommendedCalories: t("shareTrend.metrics.recommendedCalories"),
  };
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

function MetricTrendPreview({ background, item, textShadow, visibleDates }: { background: ShareBackground; item: ShareMetric; textShadow: string; visibleDates: string[] }) {
  const visibleDateSet = useMemo(() => new Set(visibleDates), [visibleDates]);
  const chartPoints = useMemo(
    () =>
      item.points.map((point) => ({
        ...point,
        labelValue: visibleDateSet.has(point.date) ? point.value : null,
      })),
    [item.points, visibleDateSet],
  );

  return (
    <div className={cn("grid min-h-[2.45rem] min-w-0 grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-2 rounded-[0.75rem] px-2.5 py-1", background === "dark" ? "bg-white/7" : "bg-white/62")}>
      <div className="min-w-0">
        <p className="truncate text-[0.6875rem] font-semibold leading-4" style={{ color: item.metric.color, textShadow }}>
          {item.metric.label}
        </p>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
          <p className="font-display text-base leading-none tabular-nums" style={{ color: item.metric.color, textShadow }}>
            {formatShareNumber(item.latestValue)}
          </p>
          <p className="truncate text-[0.625rem] font-semibold leading-none tabular-nums" style={{ color: item.metric.color, textShadow }}>
            {formatDelta(item.delta)}
          </p>
        </div>
      </div>
      <div className="h-7 min-w-0">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={chartPoints} margin={TREND_CHART_MARGIN}>
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
                dataKey="labelValue"
                formatter={(value: number | null) => (value != null ? formatShareNumber(value) : "")}
                position="top"
                style={{ fill: item.metric.color, fontSize: 7.5, fontWeight: 700, textShadow }}
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
  onVisibleTicksChange,
  points,
  textShadow,
  ticks,
}: {
  background: ShareBackground;
  dateColor: string;
  onVisibleTicksChange: (ticks: string[]) => void;
  points: ShareMetric["points"];
  textShadow: string;
  ticks: string[];
}) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const visibleTicks = useMemo(() => getVisibleTimelineDates(ticks, timelineWidth), [ticks, timelineWidth]);
  const visibleTickSet = useMemo(() => new Set(visibleTicks), [visibleTicks]);
  const tickSlotWidth = visibleTicks.length ? timelineWidth / visibleTicks.length : 0;

  useEffect(() => {
    onVisibleTicksChange(visibleTicks);
  }, [onVisibleTicksChange, visibleTicks]);

  useEffect(() => {
    const node = timelineRef.current;

    if (!node) {
      return;
    }

    const measuredNode = node;

    function syncWidth() {
      setTimelineWidth(measuredNode.getBoundingClientRect().width);
    }

    syncWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", syncWidth);
      return () => window.removeEventListener("resize", syncWidth);
    }

    const observer = new ResizeObserver(syncWidth);
    observer.observe(measuredNode);

    return () => observer.disconnect();
  }, []);

  if (!points.length) {
    return null;
  }

  return (
    <div className="h-6 min-w-0" ref={timelineRef}>
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={points} margin={TIMELINE_CHART_MARGIN}>
          <XAxis
            axisLine={{ stroke: background === "dark" ? "#ffffff26" : "#0000001a" }}
            dataKey="date"
            interval={0}
            tick={<TimelineTick fill={dateColor} slotWidth={tickSlotWidth} textShadow={textShadow} visibleDateSet={visibleTickSet} />}
            tickLine={false}
            ticks={visibleTicks}
          />
          <YAxis hide />
          <Line dataKey="value" dot={false} isAnimationActive={false} stroke="transparent" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function MetricCurrentPreview({ background, item, textShadow }: { background: ShareBackground; item: ShareMetric; textShadow: string }) {
  return (
    <div className={cn("grid min-h-[2.45rem] min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[0.75rem] px-2.5 py-1", background === "dark" ? "bg-white/7" : "bg-white/62")}>
      <div className="min-w-0">
        <p className="truncate text-[0.6875rem] font-semibold leading-4" style={{ color: item.metric.color, textShadow }}>
          {item.metric.label}
        </p>
        <p className="mt-0.5 font-display text-base leading-none tabular-nums" style={{ color: item.metric.color, textShadow }}>
          {formatShareNumber(item.latestValue)}
        </p>
      </div>
      <p className="shrink-0 text-[0.625rem] font-semibold leading-none tabular-nums" style={{ color: item.metric.color, textShadow }}>
        {formatDelta(item.delta)}
      </p>
    </div>
  );
}

function CidScaleAxis({
  background,
  color,
  metrics,
  textShadow,
}: {
  background: ShareBackground;
  color: string;
  metrics: CidMetric[];
  textShadow: string;
}) {
  const scale = resolveCidScale(metrics);

  return (
    <div className="relative h-4 min-w-0">
      {scale.ticks.map((tick) => (
        <span
          className={cn("absolute bottom-0 -translate-x-1/2 text-[0.5rem] font-black leading-none tabular-nums", tick === 100 ? "opacity-75" : "opacity-45")}
          key={tick}
          style={{
            color: color || (background === "dark" ? "#ffffff" : "#10213a"),
            left: `${getCidScalePosition(tick, scale)}%`,
            textShadow,
          }}
        >
          {tick}
        </span>
      ))}
    </div>
  );
}

function CidSharePreview({
  background,
  bodyType,
  brandColor,
  brandLabel,
  headingColor,
  metrics,
  sizeType,
  textShadow,
}: {
  background: ShareBackground;
  bodyType: CidBodyType;
  brandColor: string;
  brandLabel: string;
  headingColor: string;
  metrics: CidMetric[];
  sizeType: CidSizeType;
  textShadow: string;
}) {
  const t = useTranslations();
  const scale = resolveCidScale(metrics);
  const standardMarkerLeft = `${getCidScalePosition(100, scale)}%`;
  const markerPoints = metrics.map((item) => {
    const percentage = item.percentage ?? 0;
    const x = getCidScalePosition(percentage, scale);

    return { item, width: `${Math.max(4, x)}%` };
  });

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-col gap-2">
      <div className={cn("relative rounded-[1.15rem] px-3.5 py-2.5", background === "dark" ? "bg-white/8" : "bg-white/68")}>
        <p className="absolute right-3 top-3 max-w-[4.75rem] truncate text-right font-display text-sm leading-none" style={{ color: brandColor, textShadow }}>
          {brandLabel}
        </p>
        <div className="flex min-w-0 items-end gap-2">
          <p className="font-display text-[4.8rem] font-black leading-[0.82]" style={{ color: headingColor, textShadow }}>
            {bodyType}
          </p>
          <div className="min-w-0 pb-0.5 pr-12">
            <p className="font-display text-2xl font-black leading-none" style={{ color: headingColor, textShadow }}>
              {t("shareTrend.cidBodyType")}
              {sizeType ? <span className="ml-1 text-base font-black opacity-80">{t(`shareTrend.cidSize.${sizeType}`)}</span> : null}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[0.68rem] font-semibold leading-tight opacity-75" style={{ color: headingColor, textShadow }}>
              {t(`shareTrend.cidDescriptions.${bodyType}`)}
            </p>
          </div>
        </div>
      </div>

      <div className={cn("rounded-[1.15rem] px-3.5 py-2.5", background === "dark" ? "bg-white/7" : "bg-white/62")}>
        <div className="grid min-w-0 grid-cols-[3.75rem_minmax(0,1fr)_2.65rem] items-center gap-x-2">
          <div className="grid gap-2">
            {markerPoints.map(({ item }) => (
              <p className="flex h-4 items-center truncate text-[0.7rem] font-black leading-none" key={item.id} style={{ color: item.color, textShadow }}>
                {item.label}
              </p>
            ))}
          </div>
          <div className="relative grid gap-2">
            {markerPoints.map(({ item, width }) => (
              <div className="flex h-4 items-center" key={item.id}>
                <div className={cn("relative h-3 w-full overflow-hidden rounded-full", background === "dark" ? "bg-white/12" : "bg-slate-900/8")}>
                  <div className="h-full rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 14px ${item.color}55`, width }} />
                  <span className="absolute inset-y-0 w-px bg-white/80 shadow-[0_0_0_1px_rgba(16,35,63,0.18)]" style={{ left: standardMarkerLeft }} />
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-2">
            {markerPoints.map(({ item }) => (
              <p className="flex h-4 items-center justify-end text-right font-display text-sm font-black leading-none tabular-nums" key={item.id} style={{ color: item.color, textShadow }}>
                {formatShareNumber(item.value)}
              </p>
            ))}
          </div>
          <div aria-hidden />
          <CidScaleAxis background={background} color={headingColor} metrics={metrics} textShadow={textShadow} />
          <div aria-hidden />
        </div>
      </div>
    </div>
  );
}

interface TrendShareWorkspaceProps {
  records: InbodyRecord[];
}

function SharePreviewContent({
  background,
  brandColor,
  cidBodyType,
  cidHeadingColor,
  cidMetrics,
  cidSizeType,
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
  emptyLabel,
  previewTitle,
  brandLabel,
}: {
  background: ShareBackground;
  brandColor: string;
  cidBodyType: CidBodyType;
  cidHeadingColor: string;
  cidMetrics: CidMetric[];
  cidSizeType: CidSizeType;
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
  emptyLabel: string;
  previewTitle: string;
  brandLabel: string;
}) {
  const [visibleTimelineDates, setVisibleTimelineDates] = useState<string[]>(timelineDates);
  const textShadow = getShareTextShadow(background);

  useEffect(() => {
    setVisibleTimelineDates(timelineDates);
  }, [timelineDates]);

  const handleVisibleTicksChange = useCallback((nextVisibleTimelineDates: string[]) => {
    setVisibleTimelineDates((current) => (current.join("|") === nextVisibleTimelineDates.join("|") ? current : nextVisibleTimelineDates));
  }, []);

  return (
    <div className={cn("flex h-full w-full min-w-0 flex-col gap-2", sharePosition === "top" ? "justify-start" : sharePosition === "center" ? "justify-center" : "justify-end")}>
      <div className="min-w-0">
        <div className={cn("flex min-w-0 w-full flex-1 flex-col", getTitleAlignClass(titleAlign))} style={{ color: titleColor, textShadow }}>
          <div className="min-w-0 max-w-full">{titleMode === "show" ? <h2 className="truncate font-display text-xl leading-tight">{previewTitle}</h2> : null}</div>
        </div>
      </div>

      {shareStyle === "cid" ? (
        <CidSharePreview background={background} bodyType={cidBodyType} brandColor={brandColor} brandLabel={brandLabel} headingColor={cidHeadingColor} metrics={cidMetrics} sizeType={cidSizeType} textShadow={textShadow} />
      ) : (
        <div className={cn("grid w-full min-w-0 gap-1.5", effectiveShareColumns === 1 ? "grid-cols-1" : "grid-cols-2")}>
          {selectedMetrics.length ? (
          selectedMetrics.map((item) =>
            shareStyle === "trend" ? (
              <MetricTrendPreview background={background} item={item} key={item.id} textShadow={textShadow} visibleDates={visibleTimelineDates} />
            ) : (
              <MetricCurrentPreview background={background} item={item} key={item.id} textShadow={textShadow} />
            ),
          )
        ) : (
          <div className={cn("rounded-[1rem] border border-dashed px-4 py-12 text-center text-sm", background === "dark" ? "border-white/16 text-white/62" : "border-border/80 text-muted-foreground")}>
            {emptyLabel}
          </div>
        )}
        </div>
      )}

      {shareStyle !== "cid" ? (
        <div className="grid w-full min-w-0 grid-cols-[5.25rem_minmax(0,1fr)] items-end gap-2 px-2.5">
          <div className="flex h-6 items-end pb-[3px]">
            <p className="truncate font-display text-sm leading-none" style={{ color: brandColor, textShadow }}>{brandLabel}</p>
          </div>
          {shareStyle === "trend" ? <ShareTimelineChart background={background} dateColor={dateColor} onVisibleTicksChange={handleVisibleTicksChange} points={timelinePoints} textShadow={textShadow} ticks={timelineDates} /> : null}
        </div>
      ) : null}
    </div>
  );
}

export function TrendShareWorkspace({ records }: TrendShareWorkspaceProps) {
  const locale = useLocale();
  const t = useTranslations();
  const metricLabels = useMemo(() => buildOverallMetricLabels(t), [t]);
  const includedRecords = useMemo(() => records.filter((record) => record.isIncludedInCharts), [records]);
  const maxRecordCount = includedRecords.length;
  const defaultPreviewTitle = t("shareTrend.previewTitle");
  const [recordLimit, setRecordLimit] = useState<number | null>(() => DEFAULT_RECORD_LIMIT);
  const [shareStyle, setShareStyle] = useState<ShareStyle>("trend");
  const [previewTitle, setPreviewTitle] = useState(defaultPreviewTitle);
  const [hasEditedPreviewTitle, setHasEditedPreviewTitle] = useState(false);
  const visibleRecords = useMemo(() => {
    if (!recordLimit || shareStyle !== "trend") {
      return records;
    }

    const includedRecordIds = new Set(includedRecords.slice(-recordLimit).map((record) => record.id));
    return records.filter((record) => !record.isIncludedInCharts || includedRecordIds.has(record.id));
  }, [includedRecords, recordLimit, records, shareStyle]);
  const shareMetrics = useMemo(() => buildOverallShareMetrics(visibleRecords, metricLabels, locale), [locale, metricLabels, visibleRecords]);
  const latestDate = includedRecords.at(-1)?.date ?? null;
  const defaultSelectedIds = useMemo(() => {
    const availableIds = new Set(shareMetrics.map((item) => item.id));
    const preferredIds = DEFAULT_SELECTED_METRIC_IDS.filter((id) => availableIds.has(id));
    return preferredIds.length ? preferredIds : shareMetrics.slice(0, 3).map((item) => item.id);
  }, [shareMetrics]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [metricColors, setMetricColors] = useState<Record<string, string>>({});
  const [syncMetricColors, setSyncMetricColors] = useState(false);
  const [shareBackground, setShareBackground] = useState<ShareBackground>("light");
  const [customBackgroundColor, setCustomBackgroundColor] = useState("#f8fbff");
  const [customBackgroundOpacity, setCustomBackgroundOpacity] = useState(100);
  const [sharePosition, setSharePosition] = useState<SharePosition>("bottom");
  const [shareLayout, setShareLayout] = useState<ShareLayout>("two");
  const [shareAspect, setShareAspect] = useState<ShareAspect>("auto");
  const [titleMode, setTitleMode] = useState<TitleMode>("hide");
  const [titleAlign, setTitleAlign] = useState<TitleAlign>("left");
  const [textColors, setTextColors] = useState<Partial<Record<TextColorTarget, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeControl, setActiveControl] = useState<ControlPanel>("style");
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const effectiveRecordLimit = recordLimit ?? maxRecordCount;
  const styleOptions = [
    { value: "trend" as const, label: t("shareTrend.styleTrend") },
    { value: "current" as const, label: t("shareTrend.styleCurrent") },
    { value: "cid" as const, label: t("shareTrend.cid") },
  ];
  const backgroundOptions = [
    { value: "light" as const, label: t("shareTrend.backgroundLight") },
    { value: "dark" as const, label: t("shareTrend.backgroundDark") },
    { value: "transparent" as const, label: t("shareTrend.backgroundTransparent") },
    { value: "custom" as const, label: t("shareTrend.backgroundCustom") },
  ];
  const positionOptions = [
    { value: "top" as const, label: t("shareTrend.positionTop") },
    { value: "center" as const, label: t("shareTrend.positionCenter") },
    { value: "bottom" as const, label: t("shareTrend.positionBottom") },
  ];
  const columnOptions = [
    { value: "one" as const, label: t("shareTrend.oneColumn") },
    { value: "two" as const, label: t("shareTrend.twoColumns") },
  ];
  const aspectOptions = [
    { value: "auto" as const, label: t("shareTrend.aspectAuto") },
    { value: "1-1" as const, label: t("shareTrend.aspectSquare") },
    { value: "3-4" as const, label: t("shareTrend.aspectPortrait") },
    { value: "9-16" as const, label: t("shareTrend.aspectStory") },
  ];
  const titleModeOptions = [
    { value: "show" as const, label: t("shareTrend.show") },
    { value: "hide" as const, label: t("shareTrend.hide") },
  ];
  const titleAlignOptions = [
    { value: "left" as const, label: t("shareTrend.alignLeft") },
    { value: "center" as const, label: t("shareTrend.alignCenter") },
    { value: "right" as const, label: t("shareTrend.alignRight") },
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
  const cidShareMetrics = useMemo(() => CID_METRIC_IDS.map((id) => coloredShareMetrics.find((item) => item.id === id)).filter((item): item is ShareMetric => Boolean(item)), [coloredShareMetrics]);
  const colorControlledMetrics = shareStyle === "cid" ? cidShareMetrics : selectedMetrics;
  const colorControlledMetricIds = useMemo(() => colorControlledMetrics.map((item) => item.id), [colorControlledMetrics]);
  const syncMetricColor = syncMetricColors ? colorControlledMetrics[0]?.metric.color ?? null : null;
  const timelinePoints = selectedMetrics[0]?.points ?? [];
  const timelineDates = buildTimelineDates(timelinePoints);
  const effectiveShareColumns = shareStyle === "trend" || shareLayout !== "two" ? 1 : 2;
  const effectiveSharePosition = shareAspect === "auto" ? "top" : sharePosition;
  const latestIncludedRecord = includedRecords.at(-1) ?? null;
  const cidMetrics = useMemo(() => buildCidMetricAnalysis(latestIncludedRecord, coloredShareMetrics), [coloredShareMetrics, latestIncludedRecord]);
  const cidBodyType = useMemo(() => resolveCidBodyType(cidMetrics), [cidMetrics]);
  const cidSizeType = useMemo(() => resolveCidSizeType(cidMetrics, cidBodyType), [cidBodyType, cidMetrics]);
  const hasEnoughData = maxRecordCount >= 2;
  const automaticTitleColor = getAutomaticTextColor(shareBackground, customBackgroundColor, customBackgroundOpacity);
  const automaticMutedTextColor = getAutomaticMutedTextColor(shareBackground, customBackgroundColor, customBackgroundOpacity);
  const effectiveTitleColor = textColors.title ?? automaticTitleColor;
  const effectiveBrandColor = textColors.brand ?? automaticMutedTextColor;
  const effectiveDateColor = textColors.date ?? automaticMutedTextColor;
  const effectiveCidHeadingColor = syncMetricColors ? colorControlledMetrics[0]?.metric.color ?? effectiveTitleColor : effectiveTitleColor;
  const textColorOptions = [
    { value: "title" as const, label: t("shareTrend.titlePanel"), color: effectiveTitleColor },
    { value: "brand" as const, label: t("shareTrend.brand"), color: effectiveBrandColor },
    { value: "date" as const, label: t("shareTrend.date"), color: effectiveDateColor },
  ];

  useEffect(() => {
    setSelectedIds((current) => (current.length ? current : defaultSelectedIds));
  }, [defaultSelectedIds]);

  useEffect(() => {
    if (!hasEditedPreviewTitle) {
      setPreviewTitle(defaultPreviewTitle);
    }
  }, [defaultPreviewTitle, hasEditedPreviewTitle]);

  useEffect(() => {
    if (recordLimit != null && recordLimit >= maxRecordCount) {
      setRecordLimit(null);
    }
  }, [maxRecordCount, recordLimit]);

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

      for (const id of colorControlledMetricIds) {
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
  }, [colorControlledMetricIds, syncMetricColor, syncMetricColors]);

  function toggleMetric(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function updateMetricColor(id: string, color: string) {
    setMetricColors((current) => ({
      ...current,
      ...(syncMetricColors ? Object.fromEntries(colorControlledMetricIds.map((selectedId) => [selectedId, color])) : { [id]: color }),
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
        ...Object.fromEntries(colorControlledMetricIds.map((selectedId) => [selectedId, color])),
      }));
    }
  }

  function resetTextColors() {
    setTextColors({});
  }

  function handleShareStyleChange(nextStyle: ShareStyle) {
    setShareStyle(nextStyle);
    if (nextStyle === "trend" || nextStyle === "cid") {
      setShareLayout((current) => (current === "two" ? "one" : current));
    }
  }

  function applyRecordLimit(nextLimit: number) {
    const normalizedLimit = Math.min(maxRecordCount, Math.max(2, nextLimit));
    setRecordLimit(normalizedLimit >= maxRecordCount ? null : normalizedLimit);
  }

  function handleControlToggle(panel: ControlPanel) {
    setIsPreviewExpanded(false);
    setActiveControl(panel);
  }

  function handlePreviewExpandToggle() {
    setIsPreviewExpanded((current) => !current);
  }

  
  const saveImage = useCallback(async () => {
    if (shareStyle !== "cid" && !selectedMetrics.length) {
      toast.error(t("shareTrend.selectAtLeastOneMetric"));
      return;
    }

    const previewNode = previewRef.current;
    if (!previewNode) return;

    setIsSaving(true);
    const toastId = toast.loading(t("shareTrend.generatingImage"));

    try {
      const { dataUrl, exportHeight, exportWidth } = await renderSharePreviewImage(previewNode);
      const fileName = `insightup-trend-${latestDate ?? "share"}-${exportWidth}x${exportHeight}.png`;

      try {
        const imageFile = await dataUrlToImageFile(dataUrl, fileName);
        if (canTryShareImageFile(imageFile)) {
          try {
            await navigator.share({
              files: [imageFile],
              title: t("shareTrend.brand"),
            });
            toast.success(t("shareTrend.systemShareOpened"), { id: toastId });
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
      toast.success(t("shareTrend.imageDownloaded"), { id: toastId });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        toast.dismiss(toastId);
        return;
      }

      toast.error(t("shareTrend.imageDownloadFailed"), { id: toastId });
    } finally {
      setIsSaving(false);
    }
  }, [latestDate, selectedMetrics, shareStyle, t]);

  if (!shareMetrics.length) {
    return (
      <div className="surface-state-panel flex min-h-[52vh] w-full max-w-full items-center justify-center overflow-hidden rounded-[1.75rem] px-6 text-center text-sm text-muted-foreground">
        {t("shareTrend.empty")}
      </div>
    );
      }

  return (
    <div
      className={cn(
        "relative mx-auto grid w-full max-w-[30rem] gap-3 overflow-hidden",
        isPreviewExpanded
          ? "fixed inset-0 z-[80] h-dvh max-w-none grid-rows-[minmax(0,1fr)_minmax(0,0fr)_minmax(4.75rem,auto)] bg-background px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)]"
          : "h-[calc(100dvh-var(--app-header-offset,0px)-1rem)] grid-rows-[minmax(0,7fr)_minmax(0,2fr)_minmax(5rem,1fr)]",
      )}
    >
      <h1 className="sr-only">{t("shareTrend.title")}</h1>

      <div className="contents">
      <section
        className={cn("flex min-h-0 min-w-0 items-center justify-center overflow-auto", isPreviewExpanded ? "pt-0" : "pt-2")}
      >
        <div className="relative flex h-full max-h-full w-full max-w-[30rem] min-w-0 items-center justify-center">
        <div
          ref={previewRef}
          className={cn(
            "relative mx-auto max-h-full max-w-full min-w-0 overflow-hidden p-3 shadow-panel sm:p-4",
            getShareAspectClass(shareAspect),
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
            cidBodyType={cidBodyType}
            cidHeadingColor={effectiveCidHeadingColor}
            cidMetrics={cidMetrics}
            cidSizeType={cidSizeType}
            dateColor={effectiveDateColor}
            effectiveShareColumns={effectiveShareColumns}
            selectedMetrics={selectedMetrics}
            sharePosition={effectiveSharePosition}
            shareStyle={shareStyle}
            timelineDates={timelineDates}
            timelinePoints={timelinePoints}
            titleAlign={titleAlign}
            titleColor={effectiveTitleColor}
            titleMode={titleMode}
            emptyLabel={t("shareTrend.empty")}
            previewTitle={previewTitle}
            brandLabel={t("shareTrend.brand")}
          />
        </div>
        {isPreviewExpanded ? (
        <div className="absolute right-2 top-2 z-20 flex items-center gap-2">
          <button
            aria-label={t("shareTrend.exitExpandedPreview")}
            aria-pressed={isPreviewExpanded}
            className={cn(
              `grid size-11 cursor-pointer place-items-center rounded-full border border-border/75 bg-card/92 text-muted-foreground shadow-panel backdrop-blur hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${ROUND_ICON_PRESS_CLASS}`,
              "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgb(var(--primary)/0.18)]",
            )}
            onClick={handlePreviewExpandToggle}
            type="button"
          >
            <Minimize2 className="size-5" />
          </button>
        </div>
        ) : null}
        </div>
      </section>

      <aside className={cn("flex min-h-0 overflow-hidden rounded-[1.25rem] border border-border/75 bg-card/95 shadow-panel backdrop-blur", isPreviewExpanded && "invisible pointer-events-none")}>
      <div className="share-tools-scrollbar min-h-0 flex-1 overflow-y-auto py-4 pl-4 pr-2">
      {!hasEnoughData ? (
        <div className="mt-3 rounded-[1.25rem] border border-border/70 bg-card/78 px-4 py-3 text-sm text-muted-foreground">
          {t("shareTrend.needMoreRecords")}
        </div>
      ) : null}

      <div className="min-h-full min-w-0 pr-2">
        {activeControl === "style" ? (
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("shareTrend.style")}</p>
            <PillScrollGroup>
              {styleOptions.map((option) => (
                <OptionPill active={shareStyle === option.value} disabled={option.value === "trend" && maxRecordCount < 2} key={option.value} onClick={() => handleShareStyleChange(option.value)}>
                  {option.label}
                </OptionPill>
              ))}
            </PillScrollGroup>
          </div>
        ) : null}

        {activeControl === "visual" ? (
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("shareTrend.background")}</p>
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
                    <span className="truncate text-sm font-semibold text-foreground">{t("shareTrend.color")}</span>
                    <ColorSwatchPicker
                      color={customBackgroundColor}
                      customLabel={t("shareTrend.custom")}
                      inputAriaLabel={t("shareTrend.backgroundCustom")}
                      onChange={setCustomBackgroundColor}
                      swatchAriaLabelPrefix={t("shareTrend.background")}
                    />
                  </div>
                  <div className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)_3rem] items-center gap-3 rounded-xl border border-border/65 bg-background/64 px-3 py-2">
                    <span className="text-sm font-semibold text-foreground">{t("shareTrend.opacity")}</span>
                    <input
                      aria-label={`${t("shareTrend.background")} ${t("shareTrend.opacity")}`}
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
              </>
            ) : null}
          </div>
        ) : null}

        {activeControl === "title" ? (
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <label className="min-w-0 sm:col-span-2">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("shareTrend.titleText")}</span>
              <input
                className="h-11 w-full rounded-2xl border border-border/70 bg-background/80 px-4 text-sm font-semibold text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground/65 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                onChange={(event) => {
                  setHasEditedPreviewTitle(true);
                  setPreviewTitle(event.target.value);
                }}
                placeholder={t("shareTrend.titlePlaceholder")}
                value={previewTitle}
              />
            </label>
            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("shareTrend.titlePanel")}</p>
              <PillScrollGroup>
              {titleModeOptions.map((option) => (
                  <OptionPill active={titleMode === option.value} key={option.value} onClick={() => setTitleMode(option.value)}>
                    {option.label}
                  </OptionPill>
                ))}
              </PillScrollGroup>
            </div>
            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("shareTrend.alignment")}</p>
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
            <div className="min-w-0 sm:col-span-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("shareTrend.aspectRatio")}</p>
              <PillScrollGroup>
                {aspectOptions.map((option) => (
                  <OptionPill active={shareAspect === option.value} key={option.value} onClick={() => setShareAspect(option.value)}>
                    {option.label}
                  </OptionPill>
                ))}
              </PillScrollGroup>
            </div>
            <div className={cn("min-w-0", shareStyle === "trend" && "sm:col-span-2")}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("shareTrend.position")}</p>
              <PillScrollGroup>
              {positionOptions.map((option) => (
                  <OptionPill active={sharePosition === option.value} disabled={shareAspect === "auto"} key={option.value} onClick={() => setSharePosition(option.value)}>
                    {option.label}
                  </OptionPill>
              ))}
              </PillScrollGroup>
            </div>
            {shareStyle !== "cid" ? (
            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("shareTrend.layout")}</p>
              <PillScrollGroup>
                {columnOptions.map((option) => (
                  <OptionPill
                    active={shareLayout === option.value}
                    disabled={shareStyle === "trend" && option.value === "two"}
                    key={String(option.value)}
                    onClick={() => setShareLayout(option.value)}
                  >
                    {option.label}
                  </OptionPill>
                ))}
              </PillScrollGroup>
            </div>
            ) : null}
            <div className="min-w-0 sm:col-span-2">
              <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("shareTrend.records")}</p>
                <p className="truncate text-xs font-semibold text-muted-foreground">
                  {recordLimit == null ? t("shareTrend.allRecords", { count: maxRecordCount }) : t("shareTrend.latestRecords", { count: effectiveRecordLimit })}
                </p>
              </div>
              <div className="rounded-xl border border-border/65 bg-background/64 px-3 py-3">
                <input
                  aria-label={t("shareTrend.visibleRecordCount")}
                  className="block w-full accent-primary disabled:opacity-40"
                  disabled={shareStyle !== "trend" || maxRecordCount < 2}
                  max={Math.max(2, maxRecordCount)}
                  min="2"
                  onChange={(event) => applyRecordLimit(Number(event.target.value))}
                  type="range"
                  value={effectiveRecordLimit || 2}
                />
              </div>
            </div>
          </div>
        ) : null}

        {activeControl === "visual" ? (
          <div className="mt-4 min-w-0">
            <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("shareTrend.chartColors")}</p>
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
                  {t("shareTrend.each")}
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
                  {t("shareTrend.sync")}
                </button>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                aria-label={t("shareTrend.resetColors")}
                className={`inline-flex size-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-primary/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${ROUND_ICON_PRESS_CLASS}`}
                onClick={resetMetricColors}
                type="button"
              >
                <RotateCcw className="size-3.5" />
              </button>
              </div>
            </div>
            <div className="min-w-0 pr-1">
              <div className="grid gap-2">
                {colorControlledMetrics.length ? colorControlledMetrics.map((item) => {
                  return (
                  <div className="grid min-w-0 grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-2 border-b border-border/45 py-1.5 last:border-b-0" key={item.id}>
                    <div className="flex min-w-0 items-center">
                      <span className="truncate text-sm font-semibold text-foreground">{item.metric.label}</span>
                    </div>
                    <ColorSwatchPicker
                      color={item.metric.color}
                      customLabel={t("shareTrend.custom")}
                      inputAriaLabel={`${item.metric.label} ${t("shareTrend.customColor")}`}
                      onChange={(color) => updateMetricColor(item.id, color)}
                      swatchAriaLabelPrefix={item.metric.label}
                    />
                  </div>
                  );
                }) : (
                  <div className="rounded-xl border border-dashed border-border/70 bg-background/50 px-3 py-4 text-sm text-muted-foreground">
                    {t("shareTrend.selectMetricsFirst")}
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
                          customLabel={t("shareTrend.custom")}
                          inputAriaLabel={`${option.label} ${t("shareTrend.customColor")}`}
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
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("shareTrend.metricsPanel")}</p>
              <div className="flex shrink-0 gap-1.5">
                <button
                  className="h-7 cursor-pointer rounded-full border border-border/70 bg-background/72 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={shareStyle === "cid"}
                  onClick={() => setSelectedIds(shareMetrics.map((item) => item.id))}
                  type="button"
                >
                  {t("shareTrend.selectAll")}
                </button>
                <button
                  className="h-7 cursor-pointer rounded-full px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-destructive/8 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={shareStyle === "cid"}
                  onClick={() => setSelectedIds([])}
                  type="button"
                >
                  {t("shareTrend.clear")}
                </button>
              </div>
            </div>
            <div className="min-w-0 pr-1">
              <div className="flex flex-wrap gap-1.5">
                {coloredShareMetrics.map((item) => {
                  const cidLocked = shareStyle === "cid";
                  const checked = cidLocked ? CID_METRIC_IDS.includes(item.id) : selectedIds.includes(item.id);

                  return (
                    <button
                      aria-pressed={checked}
                      className={cn(
                        "flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-45",
                        checked
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "border border-border/70 bg-background/72 text-muted-foreground hover:border-primary/40 hover:bg-primary/8 hover:text-foreground",
                      )}
                      disabled={cidLocked}
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

      </div>
      </aside>
      </div>

      <div
        className={cn(
          "pointer-events-none z-50",
          isPreviewExpanded
            ? "absolute inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] mx-auto flex max-w-[30rem] justify-end"
            : "relative grid min-h-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 pb-[env(safe-area-inset-bottom)]",
        )}
      >
        {!isPreviewExpanded ? (
          <button
            aria-label={t("shareTrend.downloadImage")}
            className={`pointer-events-auto grid size-11 cursor-pointer place-items-center justify-self-start rounded-full border border-border/75 bg-card/95 text-muted-foreground shadow-panel backdrop-blur hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-45 ${ROUND_ICON_PRESS_CLASS}`}
            disabled={(shareStyle !== "cid" && !selectedMetrics.length) || isSaving}
            onClick={saveImage}
            type="button"
          >
            <Download className="size-5" />
          </button>
        ) : null}
        <div className={cn("pointer-events-auto grid grid-cols-5 justify-self-center rounded-full border border-border/75 bg-card/95 p-1 shadow-panel backdrop-blur", isPreviewExpanded && "hidden")}>
          <button
            aria-label={t("shareTrend.style")}
            aria-pressed={activeControl === "style"}
            className={cn(
              `grid size-11 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-primary/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${ROUND_ICON_PRESS_CLASS}`,
              activeControl === "style" && "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgb(var(--primary)/0.18)]",
            )}
            onClick={() => handleControlToggle("style")}
            type="button"
          >
            <TrendingUp className="size-4" />
          </button>
          <button
            aria-label={t("dashboardTrendUi.layout")}
            aria-pressed={activeControl === "layout"}
            className={cn(
              `grid size-11 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-primary/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${ROUND_ICON_PRESS_CLASS}`,
              activeControl === "layout" && "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgb(var(--primary)/0.18)]",
            )}
            onClick={() => handleControlToggle("layout")}
            type="button"
          >
            <Columns3 className="size-4" />
          </button>
          <button
            aria-label={`${t("shareTrend.background")} ${t("shareTrend.chartColors")}`}
            aria-pressed={activeControl === "visual"}
            className={cn(
              `grid size-11 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-primary/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${ROUND_ICON_PRESS_CLASS}`,
              activeControl === "visual" && "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgb(var(--primary)/0.18)]",
            )}
            onClick={() => handleControlToggle("visual")}
            type="button"
          >
            <Palette className="size-4" />
          </button>
          <button
            aria-label={t("shareTrend.titlePanel")}
            aria-pressed={activeControl === "title"}
            className={cn(
              `grid size-11 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-primary/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${ROUND_ICON_PRESS_CLASS}`,
              activeControl === "title" && "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgb(var(--primary)/0.18)]",
            )}
            onClick={() => handleControlToggle("title")}
            type="button"
          >
            <Type className="size-4" />
          </button>
          <button
            aria-label={t("shareTrend.metricsPanel")}
            aria-pressed={activeControl === "metrics"}
            className={cn(
              `grid size-11 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-primary/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${ROUND_ICON_PRESS_CLASS}`,
              activeControl === "metrics" && "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgb(var(--primary)/0.18)]",
            )}
            onClick={() => handleControlToggle("metrics")}
            type="button"
          >
            <ListChecks className="size-4" />
          </button>
        </div>
        {isPreviewExpanded ? (
          <button
            aria-label={t("shareTrend.downloadImage")}
            className={cn(
              "ai-generate-pulse pointer-events-auto grid cursor-pointer place-items-center bg-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-45",
              FAB_BASE_CLASS,
              FAB_PRIMARY_TONE_CLASS,
            )}
            disabled={(shareStyle !== "cid" && !selectedMetrics.length) || isSaving}
            onClick={saveImage}
            type="button"
          >
            <Download className="size-6 sm:size-7" />
          </button>
        ) : (
          <button
            aria-label={t("shareTrend.expandPreview")}
            aria-pressed={false}
            className={`pointer-events-auto grid size-11 cursor-pointer place-items-center justify-self-end rounded-full border border-border/75 bg-card/95 text-muted-foreground shadow-panel backdrop-blur hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${ROUND_ICON_PRESS_CLASS}`}
            onClick={handlePreviewExpandToggle}
            type="button"
          >
            <Maximize2 className="size-5" />
          </button>
        )}
      </div>
    </div>
  );
}
