"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MiniTrendGrid } from "@/components/charts/mini-trend-grid";
import { RecordFormDialog } from "@/components/records/record-form-dialog";
import { RecordManager } from "@/components/records/record-manager";
import { buildChartPayload, getLatestIncludedRecord } from "@/lib/inbody/records";
import { type RecordFormValues } from "@/lib/inbody/schema";
import { type InbodyRecord } from "@/lib/inbody/types";
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

  const chart = buildChartPayload(records, "overall");
  const latestIncludedRecord = getLatestIncludedRecord(records);
  const includedCount = records.filter((record) => record.isIncludedInCharts).length;

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
      <div className="space-y-4 sm:space-y-5">
        <section className="matte-panel brand-grid-lines relative overflow-hidden rounded-[1.5rem] border border-border/70 px-4 py-4 shadow-panel sm:rounded-[1.75rem] sm:px-6 sm:py-5">
          <div className="brand-motion-line brand-motion-line-left" />
          <div className="brand-motion-line brand-motion-line-right" />

          <div className="relative z-10 mx-auto max-w-5xl space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <p className="brand-kicker">Dashboard / Motion Grid</p>
              <div>
                <h1 className="font-display text-2xl text-foreground sm:text-3xl">Motion Grid</h1>
                <p className="mt-1 text-sm leading-7 text-muted-foreground">
                  拖曳卡片調整順序，右上角查看最近兩筆變化。
                </p>
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-white/65 bg-white/76 p-3 shadow-[0_8px_18px_rgba(16,35,63,0.05)] sm:rounded-[1.4rem] sm:p-3.5">
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-[1.2fr_0.9fr_0.9fr]">
                <div className="min-w-[8.75rem] shrink-0 rounded-[1rem] border border-white/70 bg-white/88 px-3 py-3 sm:min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Latest Included</p>
                  <p className="mt-1 font-display text-[1.2rem] leading-tight text-foreground sm:text-[1.35rem]">
                    <span className="sm:hidden">{formatCompactDate(latestIncludedRecord?.date)}</span>
                    <span className="hidden sm:inline">{latestIncludedRecord ? formatLongDate(latestIncludedRecord.date) : "-"}</span>
                  </p>
                </div>
                <div className="min-w-[7.25rem] shrink-0 rounded-[1rem] border border-white/70 bg-white/84 px-3 py-3 sm:min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Coverage</p>
                  <p className="mt-1 font-display text-[1.2rem] leading-tight text-foreground sm:text-[1.35rem]">{includedCount}/{records.length || 0}</p>
                </div>
                <div className="min-w-[7.25rem] shrink-0 rounded-[1rem] border border-white/70 bg-white/84 px-3 py-3 sm:min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Library</p>
                  <p className="mt-1 font-display text-[1.2rem] leading-tight text-foreground sm:text-[1.35rem]">{records.length}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <MiniTrendGrid chart={chart} initialMetricOrder={initialDashboardMetricOrder} />
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="matte-panel brand-grid-lines relative overflow-hidden rounded-[1.75rem] border border-border/70 p-5 shadow-panel sm:rounded-[2rem] sm:p-8">
        <div className="brand-motion-line brand-motion-line-left" />
        <div className="brand-motion-line brand-motion-line-right" />

        <div className="relative z-10 mx-auto max-w-5xl space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <p className="brand-kicker">Records / Library Control</p>
            <div>
              <h1 className="font-display text-2xl text-foreground sm:text-3xl">Record Library</h1>
              <p className="mt-1 text-sm leading-7 text-muted-foreground">
                新增、編輯並管理 InBody 紀錄，決定哪些資料進入分析，但不破壞完整歷史脈絡。
              </p>
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-white/65 bg-white/76 p-3 shadow-[0_8px_18px_rgba(16,35,63,0.05)] sm:rounded-[1.4rem] sm:p-3.5">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-[1.05fr_0.95fr_1fr]">
              <div className="min-w-[8.75rem] shrink-0 rounded-[1rem] border border-white/70 bg-white/88 px-3 py-3 sm:min-w-0">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Create</p>
                <p className="mt-1 font-display text-[1.2rem] leading-tight text-foreground sm:text-[1.35rem]">Add or revise</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">把新的量測資料補進 library，維持時間軸完整。</p>
              </div>
              <div className="min-w-[8.75rem] shrink-0 rounded-[1rem] border border-white/70 bg-white/84 px-3 py-3 sm:min-w-0">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Control</p>
                <p className="mt-1 font-display text-[1.2rem] leading-tight text-foreground sm:text-[1.35rem]">Include rules</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">決定哪些紀錄要進圖表，哪些只保留在資料庫。</p>
              </div>
              <div className="min-w-[8.75rem] shrink-0 rounded-[1rem] border border-white/70 bg-white/84 px-3 py-3 sm:min-w-0">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">History</p>
                <p className="mt-1 font-display text-[1.2rem] leading-tight text-foreground sm:text-[1.35rem]">Safe archive</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">排除分析不等於刪除，所有判讀脈絡仍然保留。</p>
              </div>
            </div>
          </div>
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