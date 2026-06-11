"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Columns2, Eye, EyeOff, RectangleHorizontal, Share2, TrendingUp } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useLocale, useTranslations } from "@/components/i18n-provider";
import { MiniTrendGrid, type TrendGridLayout } from "@/components/charts/mini-trend-grid";
import { DashboardWelcomeDialog } from "@/components/dashboard/dashboard-welcome-dialog";
import { RecordEmptyState } from "@/components/records/record-empty-state";
import { RecordFormDialog } from "@/components/records/record-form-dialog";
import { RecordManager } from "@/components/records/record-manager";
import { PageLoading } from "@/components/ui/page-loading";
import { StatsScrollbarRow } from "@/components/ui/stats-scrollbar-row";
import { buildChartPayload } from "@/lib/inbody/records";
import { type RecordFormValues } from "@/lib/inbody/schema";
import { CHART_VIEWS, type ChartPayload, type ChartViewKey, type InbodyRecord, type SegmentPartKey } from "@/lib/inbody/types";
import { formatCompactDate, formatLongDate } from "@/lib/presentation";

interface RecordsWorkspaceProps {
  initialDashboardMetricOrder?: string[];
  initialOverallChart?: ChartPayload;
  initialRecords: InbodyRecord[];
  initialSegmentalCharts?: Array<{
    key: SegmentPartKey;
    chart: ChartPayload;
  }>;
  mode: "dashboard" | "records";
  showWelcomeDialog?: boolean;
}

type TrendMode = "overall" | "segmental";

const TREND_LAYOUT_STORAGE_KEY = "insightup.dashboard.trend-layout";
const TREND_LINE_STORAGE_KEY = "insightup.dashboard.trend-line";

const MIN_TWO_COLUMN_WIDTH = 360;
const OVERALL_CHART_METRIC_KEYS = ["weight", "muscle", "fat", "fatPercent", "score", "visceralFatLevel", "bmr", "recommendedCalories"];
const OVERALL_HIDDEN_METRICS_STORAGE_KEY = "insightup.dashboard.hidden-metrics";

type DashboardSegmentChart = {
  key: SegmentPartKey;
  label: string;
  chart: ChartPayload | null;
};

const SEGMENT_CHART_VIEWS = CHART_VIEWS.filter((view) => view.key !== "overall") as Array<{
  key: SegmentPartKey;
  label: string;
}>;

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || "Request failed.");
  }

  return response.json() as Promise<T>;
}

async function fetchChartPayload(view: ChartViewKey, metric?: string): Promise<ChartPayload> {
  const params = new URLSearchParams({ view });

  if (metric) {
    params.set("metric", metric);
  }

  const payload = await requestJson<{ chart: ChartPayload }>(`/api/chart-data?${params.toString()}`);
  return payload.chart;
}

function sortRecords(records: InbodyRecord[]) {
  return [...records].sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());
}

const SEGMENT_ICON_SRC: Record<SegmentPartKey, string> = {
  leftArm: "/icons/segments/arm-muscle.png",
  rightArm: "/icons/segments/arm-muscle.png",
  trunk: "/icons/segments/back.png",
  leftLeg: "/icons/segments/leg.png",
  rightLeg: "/icons/segments/leg.png",
};

function SegmentIcon({ view, className = "size-5" }: { view: SegmentPartKey; className?: string }) {
  const shouldMirror = view === "rightArm" || view === "leftLeg";

  return (
    <img
      alt=""
      aria-hidden="true"
      className={`${className} object-contain ${shouldMirror ? "-scale-x-100" : ""}`}
      src={SEGMENT_ICON_SRC[view]}
    />
  );
}

function keepPrimarySegmentMetrics(chart: ChartPayload): ChartPayload {
  return {
    ...chart,
    metrics: chart.metrics.filter((metric) => metric.key === "muscle" || metric.key === "fat"),
  };
}

function createEmptySegmentalCharts(labels: Record<SegmentPartKey, string>): DashboardSegmentChart[] {
  return SEGMENT_CHART_VIEWS.map((view) => ({
    key: view.key,
    label: labels[view.key],
    chart: null,
  }));
}

function mergeChartPayload(current: ChartPayload | null, incoming: ChartPayload, metricOrder: string[]): ChartPayload {
  if (!current) {
    return incoming;
  }

  const metricsByKey = new Map([...current.metrics, ...incoming.metrics].map((metric) => [metric.key, metric]));
  const metrics = Array.from(metricsByKey.values()).sort((left, right) => {
    const leftIndex = metricOrder.indexOf(left.key);
    const rightIndex = metricOrder.indexOf(right.key);
    return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
  });
  const pointsByDate = new Map<string, Record<string, string | number | null>>();

  [...current.points, ...incoming.points].forEach((point) => {
    const date = String(point.date || "");
    pointsByDate.set(date, {
      ...(pointsByDate.get(date) || {}),
      ...point,
    });
  });

  return {
    ...current,
    metrics,
    points: Array.from(pointsByDate.values()),
  };
}

function getExpectedVisibleOverallMetricKeys() {
  const hiddenMetricsRaw = window.localStorage.getItem(OVERALL_HIDDEN_METRICS_STORAGE_KEY);

  if (!hiddenMetricsRaw) {
    return OVERALL_CHART_METRIC_KEYS;
  }

  try {
    const hiddenMetricKeys = new Set(JSON.parse(hiddenMetricsRaw) as string[]);
    const visibleMetricKeys = OVERALL_CHART_METRIC_KEYS.filter((key) => !hiddenMetricKeys.has(key));
    return visibleMetricKeys.length ? visibleMetricKeys : OVERALL_CHART_METRIC_KEYS.slice(0, 1);
  } catch {
    return OVERALL_CHART_METRIC_KEYS;
  }
}

function TrendToolButton({
  active,
  children,
  label,
  edge,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  edge?: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={`flex h-9 min-w-[4.7rem] cursor-pointer items-center justify-center gap-1.5 border px-3.5 text-primary-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/70 ${
        edge === "left"
          ? "rounded-l-[1rem] rounded-r-[0.8rem]"
          : edge === "right"
            ? "rounded-l-[0.8rem] rounded-r-[1rem]"
            : "rounded-[0.9rem]"
      } ${
        active
          ? "border-transparent bg-white/22 text-primary-foreground shadow-[0_6px_14px_rgba(11,28,52,0.18),inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-1px_0_rgba(7,23,44,0.12)]"
          : "border-transparent bg-transparent text-primary-foreground/88 hover:bg-white/18 hover:text-primary-foreground"
      }`}
      onClick={onClick}
      title={label}
      type="button"
    >
      <span className="grid size-4 shrink-0 place-items-center">{children}</span>
      <span className="truncate text-[0.74rem] font-semibold leading-none">{label}</span>
    </button>
  );
}

export function RecordsWorkspace({
  initialDashboardMetricOrder = [],
  initialOverallChart,
  initialRecords,
  initialSegmentalCharts,
  mode,
  showWelcomeDialog = false,
}: RecordsWorkspaceProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const searchParams = useSearchParams();
  const [records, setRecords] = useState(sortRecords(initialRecords));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InbodyRecord | null>(null);
  const [busyRecordId, setBusyRecordId] = useState<string | null>(null);
  const searchTrendMode = searchParams.get("trend");
  const trendMode: TrendMode = searchTrendMode === "segmental" ? "segmental" : "overall";
  const [trendLayout, setTrendLayout] = useState<TrendGridLayout>("one");
  const [showTrendLine, setShowTrendLine] = useState(false);
  const [supportsTwoColumnLayout, setSupportsTwoColumnLayout] = useState(true);
  const [trendEditMode, setTrendEditMode] = useState(false);
  const [isDashboardChartRenderStarted, setIsDashboardChartRenderStarted] = useState(mode !== "dashboard");
  const [isDashboardChartRenderComplete, setIsDashboardChartRenderComplete] = useState(mode !== "dashboard");
  const [, setCompletedSegmentChartKeys] = useState<Set<SegmentPartKey>>(() => new Set());
  const segmentPartLabels = useMemo<Record<SegmentPartKey, string>>(
    () => ({
      leftArm: t("segmentParts.leftArm"),
      rightArm: t("segmentParts.rightArm"),
      trunk: t("segmentParts.trunk"),
      leftLeg: t("segmentParts.leftLeg"),
      rightLeg: t("segmentParts.rightLeg"),
    }),
    [t],
  );
  const [overallChart, setOverallChart] = useState<ChartPayload | null>(() =>
    initialOverallChart ?? (mode === "dashboard" ? null : buildChartPayload(records, "overall", locale)),
  );
  const [segmentalCharts, setSegmentalCharts] = useState<DashboardSegmentChart[]>(() =>
    initialSegmentalCharts
      ? initialSegmentalCharts.map((segment) => ({
          ...segment,
          label: segmentPartLabels[segment.key],
          chart: keepPrimarySegmentMetrics(segment.chart),
        }))
      : createEmptySegmentalCharts(segmentPartLabels),
  );
  const latestRecord = records.at(-1);
  const includedCount = records.filter((record) => record.isIncludedInCharts).length;
  const excludedCount = records.length - includedCount;
  const chartRequestVersionRef = useRef(0);
  const shouldShowDashboardLoading = mode === "dashboard" && records.length > 0 && !isDashboardChartRenderStarted;
  const shouldShowWelcomeDialog = showWelcomeDialog && isDashboardChartRenderComplete;

  useEffect(() => {
    if (mode === "dashboard") {
      return;
    }

    setOverallChart(buildChartPayload(records, "overall", locale));
    setSegmentalCharts(
      SEGMENT_CHART_VIEWS.map((view) => ({
        key: view.key,
        label: segmentPartLabels[view.key],
        chart: keepPrimarySegmentMetrics(buildChartPayload(records, view.key, locale)),
      })),
    );
  }, [locale, mode, records, segmentPartLabels]);

  useEffect(() => {
    if (mode !== "dashboard" || !records.length) {
      return;
    }

    const requestVersion = chartRequestVersionRef.current + 1;
    chartRequestVersionRef.current = requestVersion;
    setIsDashboardChartRenderStarted(false);
    setIsDashboardChartRenderComplete(false);
    setCompletedSegmentChartKeys(new Set());

    if (trendMode === "overall") {
      setOverallChart(null);

      OVERALL_CHART_METRIC_KEYS.forEach((metric) => {
        void fetchChartPayload("overall", metric)
          .then((chart) => {
            if (chartRequestVersionRef.current !== requestVersion) {
              return;
            }

            setOverallChart((current) => mergeChartPayload(current, chart, OVERALL_CHART_METRIC_KEYS));
            setIsDashboardChartRenderStarted(true);
          })
          .catch((error) => {
            toast.error(error instanceof Error ? error.message : "Failed to load chart data.");
            setIsDashboardChartRenderStarted(true);
          });
      });
      return;
    }

    setSegmentalCharts(createEmptySegmentalCharts(segmentPartLabels));

    SEGMENT_CHART_VIEWS.forEach((view) => {
      void fetchChartPayload(view.key)
        .then((chart) => {
          if (chartRequestVersionRef.current !== requestVersion) {
            return;
          }

          setIsDashboardChartRenderStarted(true);
          setSegmentalCharts((current) =>
            current.map((segment) =>
              segment.key === view.key
                ? {
                    ...segment,
                    chart: keepPrimarySegmentMetrics(chart),
                  }
                : segment,
            ),
          );
          })
          .catch((error) => {
          toast.error(error instanceof Error ? error.message : "Failed to load chart data.");
          setIsDashboardChartRenderStarted(true);
        });
    });
  }, [mode, records, segmentPartLabels, trendMode]);

  useEffect(() => {
    if (mode !== "dashboard" || !records.length) {
      setIsDashboardChartRenderStarted(true);
      setIsDashboardChartRenderComplete(true);
      setCompletedSegmentChartKeys(new Set());
      return;
    }

    setIsDashboardChartRenderStarted(false);
    setIsDashboardChartRenderComplete(false);
    setCompletedSegmentChartKeys(new Set());
  }, [mode, records.length, trendMode]);

  const handleDashboardChartRenderStart = useCallback(() => {
    if (mode === "dashboard") {
      setIsDashboardChartRenderStarted(true);
    }
  }, [mode]);

  const handleOverallChartRenderComplete = useCallback(() => {
    if (mode === "dashboard" && trendMode === "overall") {
      const expectedVisibleMetricKeys = getExpectedVisibleOverallMetricKeys();
      const expectedVisibleMetricKeySet = new Set(expectedVisibleMetricKeys);
      const loadedVisibleMetricCount = (overallChart?.metrics ?? []).filter((metric) => expectedVisibleMetricKeySet.has(metric.key)).length;

      if (loadedVisibleMetricCount < expectedVisibleMetricKeys.length) {
        return;
      }

      setIsDashboardChartRenderComplete(true);
    }
  }, [mode, overallChart?.metrics.length, trendMode]);

  const handleSegmentChartRenderComplete = useCallback((segmentKey: SegmentPartKey) => {
    if (mode !== "dashboard" || trendMode !== "segmental") {
      return;
    }

    setCompletedSegmentChartKeys((current) => {
      if (current.has(segmentKey)) {
        return current;
      }

      const next = new Set(current);
      next.add(segmentKey);

      if (next.size >= segmentalCharts.length) {
        setIsDashboardChartRenderComplete(true);
      }

      return next;
    });
  }, [mode, segmentalCharts.length, trendMode]);

  useEffect(() => {
    const savedLayout = window.localStorage.getItem(TREND_LAYOUT_STORAGE_KEY);

    if (savedLayout === "one" || savedLayout === "two") {
      setTrendLayout(savedLayout);
      return;
    }

    if (savedLayout === "auto") {
      setTrendLayout("one");
    }
  }, []);

  useEffect(() => {
    setShowTrendLine(window.localStorage.getItem(TREND_LINE_STORAGE_KEY) === "true");
  }, []);

  useEffect(() => {
    function syncSupportedLayouts() {
      const nextSupportsTwoColumnLayout = window.innerWidth >= MIN_TWO_COLUMN_WIDTH;
      setSupportsTwoColumnLayout(nextSupportsTwoColumnLayout);

      if (!nextSupportsTwoColumnLayout) {
        setTrendLayout((current) => (current === "two" ? "one" : current));
      }
    }

    syncSupportedLayouts();
    window.addEventListener("resize", syncSupportedLayouts);

    return () => {
      window.removeEventListener("resize", syncSupportedLayouts);
    };
  }, []);

  function applyTrendLayout(nextLayout: TrendGridLayout) {
    if (nextLayout === "two" && !supportsTwoColumnLayout) {
      return;
    }

    setTrendLayout(nextLayout);
    window.localStorage.setItem(TREND_LAYOUT_STORAGE_KEY, nextLayout);
  }

  function cycleTrendLayout() {
    const allowedLayouts = supportsTwoColumnLayout ? ["one", "two"] : ["one"];
    const currentIndex = allowedLayouts.indexOf(trendLayout);
    const nextLayout = allowedLayouts[(currentIndex + 1) % allowedLayouts.length] as TrendGridLayout;
    applyTrendLayout(nextLayout);
  }

  function toggleTrendLine() {
    setShowTrendLine((current) => {
      const next = !current;
      window.localStorage.setItem(TREND_LINE_STORAGE_KEY, String(next));
      return next;
    });
  }

  async function handleSave(values: RecordFormValues) {
    try {
      if (editingRecord) {
        const response = await requestJson<{ record: InbodyRecord }>(`/api/records/${editingRecord.id}`, {
          body: JSON.stringify(values),
          method: "PATCH",
        });
        setRecords((current) => sortRecords(current.map((record) => (record.id === response.record.id ? response.record : record))));
        toast.success(locale === "en" ? "Record updated." : "紀錄已更新");
        setEditingRecord(null);
        return;
      }

      const response = await requestJson<{ record: InbodyRecord }>("/api/records", {
        body: JSON.stringify(values),
        method: "POST",
      });
      setRecords((current) => sortRecords([...current, response.record]));
      toast.success(locale === "en" ? "Record created." : "已新增 InBody 紀錄");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : locale === "en" ? "Save failed." : "儲存失敗");
      throw error;
    }
  }

  async function handleToggleInclusion(record: InbodyRecord, nextValue: boolean) {
    setBusyRecordId(record.id);
    try {
      const response = await requestJson<{ record: InbodyRecord }>(`/api/records/${record.id}`, {
        body: JSON.stringify({ isIncludedInCharts: nextValue }),
        method: "PATCH",
      });
      setRecords((current) => current.map((entry) => (entry.id === response.record.id ? response.record : entry)));
      toast.success(nextValue ? (locale === "en" ? "Included in chart analysis." : "紀錄已納入圖表分析") : (locale === "en" ? "Excluded from chart analysis." : "紀錄已排除出圖表分析"), {
        description: nextValue ? (locale === "en" ? "This record will affect the trend chart again." : "這筆資料會重新影響趨勢圖。") : (locale === "en" ? "The record stays, but is excluded from trend calculations." : "紀錄仍會保留，只是不納入趨勢計算。"),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : locale === "en" ? "Failed to update chart inclusion." : "更新圖表納入狀態失敗");
    } finally {
      setBusyRecordId(null);
    }
  }

  async function handleDelete(record: InbodyRecord) {
    if (!window.confirm(locale === "en" ? `Delete ${formatLongDate(record.date)}? This keeps the data via soft delete.` : `確定要刪除 ${formatLongDate(record.date)} 的紀錄嗎？這會以 soft delete 保留資料。`)) {
      return;
    }

    setBusyRecordId(record.id);
    try {
      await requestJson<{ success: boolean }>(`/api/records/${record.id}`, {
        method: "DELETE",
      });
      setRecords((current) => current.filter((entry) => entry.id !== record.id));
      toast.success(locale === "en" ? "Record deleted." : "紀錄已刪除", {
        description: locale === "en" ? "The data is kept in the database via soft delete." : "資料已用 soft delete 保留在資料庫中。",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : locale === "en" ? "Delete failed." : "刪除失敗");
    } finally {
      setBusyRecordId(null);
    }
  }

  function openCreateDialog() {
    if (mode === "records") {
      router.push("/records/new");
      return;
    }

    setEditingRecord(null);
    setDialogOpen(true);
  }

  function openEditDialog(record: InbodyRecord) {
    if (mode === "records") {
      router.push(`/records/${record.id}/edit`);
      return;
    }

    setEditingRecord(record);
    setDialogOpen(true);
  }

  if (mode === "dashboard") {
    if (!records.length) {
      return (
        <>
        <div className="pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-[calc(7rem+env(safe-area-inset-bottom))]">
          <RecordEmptyState
            actionLabel={locale === "en" ? "Add first record" : "新增第一筆紀錄"}
            description={locale === "en" ? "After adding your first record, this area will show weight, muscle, body fat, and segment trends." : "新增第一筆紀錄後，這裡會顯示體重、肌肉量、體脂與部位趨勢。"}
            onAdd={openCreateDialog}
          />
        </div>
        <DashboardWelcomeDialog open={shouldShowWelcomeDialog} />
        </>
      );
    }

    return (
      <>
      <div className="relative space-y-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:space-y-5 sm:pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {shouldShowDashboardLoading ? (
          <div className="absolute inset-x-0 top-0 z-10 rounded-[1.75rem] bg-background/92 backdrop-blur-sm">
            <PageLoading />
          </div>
        ) : null}

        <section className={`space-y-4 transition-opacity duration-150 ${shouldShowDashboardLoading ? "pointer-events-none opacity-0" : "opacity-100"}`}>
          {trendMode === "overall" ? (
            overallChart ? (
              <MiniTrendGrid
                chart={overallChart}
                editMode={trendEditMode}
                initialMetricOrder={initialDashboardMetricOrder}
                layout={trendLayout}
                onRenderStart={handleDashboardChartRenderStart}
                onRenderComplete={handleOverallChartRenderComplete}
                showTrendLine={showTrendLine}
              />
            ) : (
              <div className="surface-state-panel min-h-[52vh] rounded-[1.75rem]" />
            )
          ) : (
            <div className="space-y-3.5">
              {segmentalCharts.map((segment, index) => (
                <section className="space-y-2.5" key={segment.key}>
                  {segment.chart ? (
                    <>
                      <div className="flex items-center gap-2 px-1">
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/8 text-primary">
                          <SegmentIcon view={segment.key} />
                        </span>
                        <h3 className="font-display text-[1.02rem] leading-tight text-foreground">{segment.label}</h3>
                      </div>
                      <MiniTrendGrid
                        chart={segment.chart}
                        editMode={trendEditMode}
                        layout={trendLayout}
                        onRenderStart={handleDashboardChartRenderStart}
                        onRenderComplete={() => handleSegmentChartRenderComplete(segment.key)}
                        showTrendLine={showTrendLine}
                      />
                    </>
                  ) : (
                    <div className="surface-state-panel flex min-h-[16rem] items-center justify-center rounded-[1.5rem] p-4">
                      <div className="grid w-full gap-3">
                        <div className="surface-soft-card h-7 w-32 animate-pulse rounded-full" />
                        <div className="surface-soft-card h-44 animate-pulse rounded-[1.25rem]" />
                      </div>
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </section>

        <div
          className={`pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.95rem)] z-30 flex justify-center px-3 transition-[opacity,transform] ease-out motion-reduce:transition-none sm:bottom-4 ${
            isDashboardChartRenderComplete
              ? "translate-y-0 opacity-100 duration-1000"
              : "translate-y-6 opacity-0 duration-200"
          }`}
        >
          <div className="pointer-events-auto inline-flex items-center gap-0.5 rounded-[1.25rem] border border-primary/38 bg-[linear-gradient(135deg,rgb(var(--primary))_0%,rgb(var(--primary-strong))_100%)] px-0.5 py-0.5 text-primary-foreground shadow-[0_12px_24px_rgba(23,52,93,0.22)]">
            <TrendToolButton
              active={trendLayout === "two"}
              edge="left"
              label={t("dashboardTrendUi.layout")}
              onClick={cycleTrendLayout}
            >
              {trendLayout === "two" ? <Columns2 className="size-4" /> : <RectangleHorizontal className="size-4" />}
            </TrendToolButton>
            <TrendToolButton active={trendEditMode} label={t("dashboardTrendUi.visibility")} onClick={() => setTrendEditMode((current) => !current)}>
              {trendEditMode ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </TrendToolButton>
            <TrendToolButton active={showTrendLine} label={t("dashboardTrendUi.trendLine")} onClick={toggleTrendLine}>
              <TrendingUp className="size-4" />
            </TrendToolButton>
            <TrendToolButton edge="right" label={t("dashboardTrendUi.shareShort")} onClick={() => router.push("/share")}>
              <Share2 className="size-4" />
            </TrendToolButton>
          </div>
        </div>
      </div>
      <DashboardWelcomeDialog open={shouldShowWelcomeDialog} />
      </>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-8">
      <section className="relative p-1 sm:p-2">
        <div className="relative z-10 mx-auto max-w-5xl">
          <StatsScrollbarRow
            className="stats-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-[1.05fr_0.95fr_1fr]"
          >
            <div className="surface-glass-card min-w-[8.75rem] shrink-0 rounded-[0.875rem] px-3 py-3 sm:min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{locale === "en" ? "Latest measurement" : "最近量測"}</p>
              <p className="mt-1 font-display text-[1.2rem] leading-tight text-foreground sm:text-[1.35rem]">
                {formatCompactDate(latestRecord?.date)}
              </p>
            </div>
            <div className="surface-soft-card min-w-[8.75rem] shrink-0 rounded-[0.875rem] px-3 py-3 sm:min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{locale === "en" ? "Included in charts" : "納入圖表"}</p>
              <p className="mt-1 font-display text-[1.2rem] leading-tight text-foreground sm:text-[1.35rem]">
                {includedCount}/{records.length || 0}
              </p>
            </div>
            <div className="surface-soft-card min-w-[8.75rem] shrink-0 rounded-[0.875rem] px-3 py-3 sm:min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{locale === "en" ? "Excluded" : "已排除"}</p>
              <p className="mt-1 font-display text-[1.2rem] leading-tight text-foreground sm:text-[1.35rem]">{excludedCount}</p>
            </div>
          </StatsScrollbarRow>
        </div>
      </section>

      <RecordManager
        busyRecordId={busyRecordId}
        mode={mode}
        onAdd={openCreateDialog}
        onDelete={handleDelete}
        onEdit={openEditDialog}
        onToggleInclusion={handleToggleInclusion}
        records={records}
      />

      <RecordFormDialog
        initialRecord={editingRecord}
        latestRecordForAutofill={latestRecord}
        onOpenChange={(nextOpen) => {
          setDialogOpen(nextOpen);
          if (!nextOpen) {
            setEditingRecord(null);
          }
        }}
        onSubmit={handleSave}
        open={dialogOpen}
      />
    </div>
  );
}
