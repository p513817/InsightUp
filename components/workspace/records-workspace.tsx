"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Activity, Check, LayoutTemplate, Pencil, Share2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocale } from "@/components/i18n-provider";
import { MiniTrendGrid, type TrendGridLayout } from "@/components/charts/mini-trend-grid";
import { RecordEmptyState } from "@/components/records/record-empty-state";
import { RecordFormDialog } from "@/components/records/record-form-dialog";
import { RecordManager } from "@/components/records/record-manager";
import { StatsScrollbarRow } from "@/components/ui/stats-scrollbar-row";
import { buildChartPayload } from "@/lib/inbody/records";
import { type RecordFormValues } from "@/lib/inbody/schema";
import { CHART_VIEWS, type ChartPayload, type ChartViewKey, type InbodyRecord, type SegmentPartKey } from "@/lib/inbody/types";
import { formatCompactDate, formatLongDate } from "@/lib/presentation";

interface RecordsWorkspaceProps {
  initialDashboardMetricOrder?: string[];
  initialRecords: InbodyRecord[];
  mode: "dashboard" | "records";
}

type TrendMode = "overall" | "segmental";

const TREND_LAYOUT_STORAGE_KEY = "insightup.dashboard.trend-layout";

const TREND_LAYOUT_OPTIONS: Array<{ value: TrendGridLayout; label: string }> = [
  { value: "auto", label: "自動" },
  { value: "one", label: "單欄" },
  { value: "two", label: "雙欄" },
];

const MIN_TWO_COLUMN_WIDTH = 360;

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

function TrendModeButton({
  active,
  children,
  icon,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold transition sm:px-4 ${
        active
          ? "bg-[linear-gradient(135deg,rgb(var(--primary))_0%,rgb(var(--primary-strong))_100%)] text-primary-foreground shadow-[0_8px_16px_rgba(23,52,93,0.14)]"
          : "text-muted-foreground hover:bg-primary/7 hover:text-foreground"
      }`}
      onClick={onClick}
      role="tab"
      type="button"
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function TrendToolButton({
  active,
  children,
  label,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={`grid size-10 cursor-pointer place-items-center rounded-xl border text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        active
          ? "border-primary/45 bg-primary/10 text-primary"
          : "border-border/70 bg-card/92 hover:border-accent/55 hover:bg-accent/10 hover:text-foreground"
      }`}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

export function RecordsWorkspace({
  initialDashboardMetricOrder = [],
  initialRecords,
  mode,
}: RecordsWorkspaceProps) {
  const router = useRouter();
  const locale = useLocale();
  const [records, setRecords] = useState(sortRecords(initialRecords));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InbodyRecord | null>(null);
  const [busyRecordId, setBusyRecordId] = useState<string | null>(null);
  const [trendMode, setTrendMode] = useState<TrendMode>("overall");
  const [trendLayout, setTrendLayout] = useState<TrendGridLayout>("auto");
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const [supportsTwoColumnLayout, setSupportsTwoColumnLayout] = useState(true);
  const [trendEditMode, setTrendEditMode] = useState(false);

  const overallChart = buildChartPayload(records, "overall", locale);
  const segmentalCharts = SEGMENT_CHART_VIEWS.map((view) => ({
    ...view,
    chart: keepPrimarySegmentMetrics(buildChartPayload(records, view.key, locale)),
  }));
  const latestRecord = records.at(-1);
  const includedCount = records.filter((record) => record.isIncludedInCharts).length;
  const excludedCount = records.length - includedCount;

  useEffect(() => {
    const savedLayout = window.localStorage.getItem(TREND_LAYOUT_STORAGE_KEY);

    if (savedLayout === "auto" || savedLayout === "one" || savedLayout === "two") {
      setTrendLayout(savedLayout);
    }
  }, []);

  useEffect(() => {
    function syncSupportedLayouts() {
      const nextSupportsTwoColumnLayout = window.innerWidth >= MIN_TWO_COLUMN_WIDTH;
      setSupportsTwoColumnLayout(nextSupportsTwoColumnLayout);

      if (!nextSupportsTwoColumnLayout) {
        setTrendLayout((current) => (current === "two" ? "auto" : current));
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
    setLayoutMenuOpen(false);
    window.localStorage.setItem(TREND_LAYOUT_STORAGE_KEY, nextLayout);
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
        <div className="pb-24 sm:pb-28">
          <RecordEmptyState
            actionLabel={locale === "en" ? "Add first record" : "新增第一筆紀錄"}
            description={locale === "en" ? "After adding your first record, this area will show weight, muscle, body fat, and segment trends." : "新增第一筆紀錄後，這裡會顯示體重、肌肉量、體脂與部位趨勢。"}
            onAdd={openCreateDialog}
          />
        </div>
      );
    }

    return (
      <div className="space-y-4 pb-24 sm:space-y-5 sm:pb-28">
        <section className="space-y-4">
          <div className="sticky top-[var(--app-header-sticky-offset,0px)] z-30 -mx-1 px-1 py-1 transition-[top] duration-[420ms] ease-out motion-reduce:transition-none">
            <div
              aria-label={locale === "en" ? "Trend analysis mode" : "趨勢分析模式"}
              className="mx-auto grid max-w-sm grid-cols-2 gap-1 rounded-full border border-border/70 bg-card/92 p-1 shadow-panel backdrop-blur"
              role="tablist"
            >
              <TrendModeButton active={trendMode === "overall"} icon={<Activity className="size-4" />} onClick={() => setTrendMode("overall")}>
                {locale === "en" ? "Overall trend" : "整體趨勢"}
              </TrendModeButton>
              <TrendModeButton active={trendMode === "segmental"} icon={<UserRound className="size-4" />} onClick={() => setTrendMode("segmental")}>
                {locale === "en" ? "Segmental trend" : "部位別趨勢"}
              </TrendModeButton>
            </div>
          </div>

          <div className="-mt-1 flex justify-end px-1">
            <div className="relative flex items-center gap-1.5">
              <TrendToolButton active={layoutMenuOpen} label={locale === "en" ? "Adjust layout columns" : "調整趨勢欄數"} onClick={() => setLayoutMenuOpen((current) => !current)}>
                <LayoutTemplate className="size-4" />
              </TrendToolButton>

              {layoutMenuOpen ? (
                <div className="absolute right-0 top-12 z-40 w-36 rounded-2xl border border-border/80 bg-card/98 p-1.5 shadow-panel backdrop-blur">
                  {TREND_LAYOUT_OPTIONS.map((option) => {
                    const disabled = option.value === "two" && !supportsTwoColumnLayout;

                    return (
                      <button
                        className={`flex h-10 w-full items-center justify-between rounded-xl px-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:text-muted-foreground/45 ${
                          disabled
                            ? ""
                            : `cursor-pointer hover:bg-primary/8 ${trendLayout === option.value ? "text-primary" : "text-foreground"}`
                        }`}
                        disabled={disabled}
                        key={option.value}
                        onClick={() => applyTrendLayout(option.value)}
                        title={disabled ? (locale === "en" ? "Two columns are not supported on this screen width." : "目前螢幕寬度不支援雙欄") : undefined}
                        type="button"
                      >
                        <span>{option.label}</span>
                        {trendLayout === option.value ? <Check className="size-4" /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <TrendToolButton
                active={trendEditMode}
                label={trendEditMode ? (locale === "en" ? "Finish editing visible metrics" : "結束編輯顯示指標") : (locale === "en" ? "Edit visible metrics" : "編輯顯示指標")}
                onClick={() => setTrendEditMode((current) => !current)}
              >
                <Pencil className="size-4" />
              </TrendToolButton>
              <TrendToolButton label={locale === "en" ? "Share trend data" : "分享趨勢數據"} onClick={() => router.push("/share")}>
                <Share2 className="size-4" />
              </TrendToolButton>
            </div>
          </div>

          {trendMode === "overall" ? (
            <MiniTrendGrid
              chart={overallChart}
              editMode={trendEditMode}
              initialMetricOrder={initialDashboardMetricOrder}
              layout={trendLayout}
            />
          ) : (
            <div className="space-y-4">
              {segmentalCharts.map((segment) => (
                <section className="space-y-3" key={segment.key}>
                  <div className="flex items-center gap-2 px-1">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/8 text-primary">
                      <SegmentIcon view={segment.key} />
                    </span>
                    <h3 className="font-display text-lg leading-tight text-foreground">{segment.label}</h3>
                  </div>
                  <MiniTrendGrid chart={segment.chart} editMode={trendEditMode} layout={trendLayout} />
                </section>
              ))}
            </div>
          )}
        </section>
      </div>
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
