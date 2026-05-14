"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { MiniTrendGrid } from "@/components/charts/mini-trend-grid";
import { TrendSummaryFab } from "@/components/charts/trend-summary-fab";
import { RecordFormDialog } from "@/components/records/record-form-dialog";
import { RecordManager } from "@/components/records/record-manager";
import { Button } from "@/components/ui/button";
import { StatsScrollbarRow } from "@/components/ui/stats-scrollbar-row";
import { buildChartPayload } from "@/lib/inbody/records";
import { type RecordFormValues } from "@/lib/inbody/schema";
import { CHART_VIEWS, type ChartViewKey, type InbodyRecord } from "@/lib/inbody/types";
import { formatCompactDate, formatLongDate } from "@/lib/presentation";

interface RecordsWorkspaceProps {
  initialDashboardMetricOrder?: string[];
  initialRecords: InbodyRecord[];
  mode: "dashboard" | "records";
}

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

export function RecordsWorkspace({ initialDashboardMetricOrder = [], initialRecords, mode }: RecordsWorkspaceProps) {
  const [records, setRecords] = useState(sortRecords(initialRecords));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InbodyRecord | null>(null);
  const [busyRecordId, setBusyRecordId] = useState<string | null>(null);
  const [selectedChartView, setSelectedChartView] = useState<ChartViewKey>("overall");
  const [isChartViewMenuOpen, setIsChartViewMenuOpen] = useState(false);
  const chartViewMenuRef = useRef<HTMLDivElement>(null);

  const chart = buildChartPayload(records, selectedChartView);
  const latestRecord = records.at(-1);
  const includedCount = records.filter((record) => record.isIncludedInCharts).length;
  const excludedCount = records.length - includedCount;
  const selectedChartViewLabel = selectedChartView === "overall"
    ? "整體"
    : CHART_VIEWS.find((view) => view.key === selectedChartView)?.label || "整體";

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!chartViewMenuRef.current?.contains(event.target as Node)) {
        setIsChartViewMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsChartViewMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleSave(values: RecordFormValues) {
    try {
      if (editingRecord) {
        const response = await requestJson<{ record: InbodyRecord }>(`/api/records/${editingRecord.id}`, {
          body: JSON.stringify(values),
          method: "PATCH",
        });
        setRecords((current) => sortRecords(current.map((record) => (record.id === response.record.id ? response.record : record))));
        toast.success("紀錄已更新。");
        setEditingRecord(null);
        return;
      }

      const response = await requestJson<{ record: InbodyRecord }>("/api/records", {
        body: JSON.stringify(values),
        method: "POST",
      });
      setRecords((current) => sortRecords([...current, response.record]));
      toast.success("已建立新的 InBody 紀錄。");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "儲存失敗。");
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
      toast.success(nextValue ? "紀錄已納入圖表分析。" : "紀錄已排除出圖表分析。", {
        description: nextValue ? "歷史資料仍會保留。" : "紀錄仍會保留在清單中。",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "更新 inclusion 失敗。");
    } finally {
      setBusyRecordId(null);
    }
  }

  async function handleDelete(record: InbodyRecord) {
    if (!window.confirm(`確定要刪除 ${formatLongDate(record.date)} 這筆紀錄嗎？它會以 soft delete 方式隱藏。`)) {
      return;
    }

    setBusyRecordId(record.id);
    try {
      await requestJson<{ success: boolean }>(`/api/records/${record.id}`, {
        method: "DELETE",
      });
      setRecords((current) => current.filter((entry) => entry.id !== record.id));
      toast.success("紀錄已刪除。", {
        description: "資料以 soft delete 方式自主要畫面隱藏。",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "刪除失敗。");
    } finally {
      setBusyRecordId(null);
    }
  }

  function openCreateDialog() {
    setEditingRecord(null);
    setDialogOpen(true);
  }

  function openEditDialog(record: InbodyRecord) {
    setEditingRecord(record);
    setDialogOpen(true);
  }

  if (mode === "dashboard") {
    return (
      <>
        <div className="space-y-4 pb-24 sm:space-y-5 sm:pb-28">
          <section className="space-y-3">
            <MiniTrendGrid chart={chart} initialMetricOrder={initialDashboardMetricOrder} />
          </section>
        </div>
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-4 z-40 sm:bottom-7 sm:left-7" ref={chartViewMenuRef}>
          {isChartViewMenuOpen ? (
            <div className="surface-menu absolute bottom-[calc(100%+0.65rem)] left-0 z-30 w-[min(10.5rem,calc(100vw-2rem))] overflow-hidden rounded-[1rem] p-1.5">
              <div className="grid grid-cols-1 gap-0.5" role="menu">
                {CHART_VIEWS.map((view) => {
                  const active = selectedChartView === view.key;
                  const label = view.key === "overall" ? "整體" : view.label;

                  return (
                    <button
                      aria-pressed={active}
                      className={`flex h-11 w-full items-center justify-between rounded-[0.8rem] px-3 text-left text-sm font-semibold transition active:scale-[0.98] ${
                        active
                          ? "bg-[linear-gradient(135deg,rgb(var(--primary))_0%,rgb(var(--primary-strong))_100%)] text-primary-foreground shadow-[0_8px_16px_rgba(23,52,93,0.14)]"
                          : "text-foreground hover:bg-primary/7"
                      }`}
                      key={view.key}
                      onClick={() => {
                        setSelectedChartView(view.key);
                        setIsChartViewMenuOpen(false);
                      }}
                      role="menuitemradio"
                      type="button"
                    >
                      <span className="truncate">{label}</span>
                      <Check className={`size-4 shrink-0 ${active ? "opacity-100" : "opacity-0"}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <Button
            aria-expanded={isChartViewMenuOpen}
            aria-haspopup="menu"
            className="h-10 rounded-full px-3.5 shadow-panel sm:h-11 sm:px-4"
            onClick={() => setIsChartViewMenuOpen((current) => !current)}
            type="button"
          >
            <span className="truncate text-sm font-medium">部位: {selectedChartViewLabel}</span>
            <ChevronDown className={`size-4 text-primary-foreground transition ${isChartViewMenuOpen ? "rotate-180" : ""}`} />
          </Button>
        </div>
        <TrendSummaryFab />
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
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">最新紀錄</p>
              <p className="mt-1 font-display text-[1.2rem] leading-tight text-foreground sm:text-[1.35rem]">
                <span className="sm:hidden">{formatCompactDate(latestRecord?.date)}</span>
                <span className="hidden sm:inline">{formatLongDate(latestRecord?.date)}</span>
              </p>
            </div>
            <div className="surface-soft-card min-w-[8.75rem] shrink-0 rounded-[0.875rem] px-3 py-3 sm:min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">已納入分析</p>
              <p className="mt-1 font-display text-[1.2rem] leading-tight text-foreground sm:text-[1.35rem]">{includedCount}/{records.length || 0}</p>
            </div>
            <div className="surface-soft-card min-w-[8.75rem] shrink-0 rounded-[0.875rem] px-3 py-3 sm:min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">已排除</p>
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
