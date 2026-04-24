"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MiniTrendGrid } from "@/components/charts/mini-trend-grid";
import { RecordFormDialog } from "@/components/records/record-form-dialog";
import { RecordManager } from "@/components/records/record-manager";
import { buildChartPayload, getLatestIncludedRecord } from "@/lib/inbody/records";
import { type RecordFormValues } from "@/lib/inbody/schema";
import { type InbodyRecord } from "@/lib/inbody/types";
import type { AppUserSummary } from "@/lib/presentation";
import { formatCompactDate, formatLongDate, formatRecordCountLabel, getUserInitials } from "@/lib/presentation";

interface RecordsWorkspaceProps {
  initialDashboardMetricOrder?: string[];
  initialRecords: InbodyRecord[];
  mode: "dashboard" | "profile";
  user: AppUserSummary;
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

export function RecordsWorkspace({ initialDashboardMetricOrder = [], initialRecords, mode, user }: RecordsWorkspaceProps) {
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

        <div className="relative z-10 space-y-5 sm:hidden">
          <div className="space-y-3">
            <p className="brand-kicker">Profile / Record Control</p>
            <div className="flex items-center gap-3">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={user.name} className="size-12 rounded-full border border-border object-cover shadow-[0_4px_12px_rgba(16,35,63,0.08)]" src={user.avatarUrl} />
              ) : (
                <div className="flex size-12 items-center justify-center rounded-full border border-border bg-[linear-gradient(135deg,rgba(121,215,195,0.42),rgba(28,54,95,0.12))] text-sm font-semibold text-foreground shadow-[0_4px_12px_rgba(16,35,63,0.08)]">
                  {getUserInitials(user.name)}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="break-words font-display text-[clamp(1.95rem,8vw,2.5rem)] leading-[1.08] text-foreground">{user.name}</h1>
                <p className="truncate text-sm text-muted-foreground">{user.email || "Signed in with Google"}</p>
              </div>
            </div>
            <p className="max-w-[34ch] text-sm leading-7 text-muted-foreground">
              新增、編輯並管理納入圖表的紀錄，同時保留完整歷史脈絡。
            </p>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <div className="min-w-[8.75rem] shrink-0 rounded-[1rem] border border-white/65 bg-white/82 px-3 py-3 shadow-[0_6px_16px_rgba(16,35,63,0.04)]">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Latest Included</p>
              <p className="mt-1 font-display text-[1.25rem] leading-tight text-foreground">{formatCompactDate(latestIncludedRecord?.date)}</p>
            </div>
            <div className="min-w-[7.25rem] shrink-0 rounded-[1rem] border border-white/65 bg-white/76 px-3 py-3 shadow-[0_6px_16px_rgba(16,35,63,0.04)]">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Coverage</p>
              <p className="mt-1 font-display text-[1.2rem] leading-tight text-foreground">{includedCount}/{records.length || 0}</p>
            </div>
            <div className="min-w-[7.25rem] shrink-0 rounded-[1rem] border border-white/65 bg-white/76 px-3 py-3 shadow-[0_6px_16px_rgba(16,35,63,0.04)]">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Library</p>
              <p className="mt-1 font-display text-[1.2rem] leading-tight text-foreground">{records.length}</p>
            </div>
            <div className="min-w-[7.25rem] shrink-0 rounded-[1rem] border border-white/65 bg-white/76 px-3 py-3 shadow-[0_6px_16px_rgba(16,35,63,0.04)]">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Joined</p>
              <p className="mt-1 font-display text-[1.2rem] leading-tight text-foreground">{formatCompactDate(user.createdAt)}</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 hidden flex-col gap-5 sm:flex">
          <div className="space-y-4">
            <p className="brand-kicker">Profile / Record Control</p>
            <div className="flex items-start gap-4 sm:items-center">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={user.name} className="size-14 rounded-full border border-border object-cover shadow-[0_6px_16px_rgba(16,35,63,0.10)]" src={user.avatarUrl} />
              ) : (
                <div className="flex size-14 items-center justify-center rounded-full border border-border bg-[linear-gradient(135deg,rgba(121,215,195,0.42),rgba(28,54,95,0.12))] text-base font-semibold text-foreground shadow-[0_6px_16px_rgba(16,35,63,0.10)]">
                  {getUserInitials(user.name)}
                </div>
              )}
              <div className="min-w-0 space-y-1">
                <h1 className="break-words font-display text-[clamp(2rem,8.5vw,2.75rem)] leading-tight text-foreground">{user.name}</h1>
                <p className="break-all text-sm leading-7 text-muted-foreground">{user.email || "Signed in with Google"}</p>
              </div>
            </div>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
              這裡是你的紀錄控制台。可以新增與編輯資料、管理圖表納入狀態，並保留完整歷史而不破壞分析脈絡。
            </p>
          </div>

          <div className="rounded-[1.25rem] border border-white/65 bg-white/76 p-3 shadow-[0_8px_18px_rgba(16,35,63,0.05)] sm:rounded-[1.4rem] sm:p-3.5">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1rem] border border-white/70 bg-white/88 px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Latest Included</p>
                <p className="mt-1 font-display text-[1.2rem] leading-tight text-foreground">{latestIncludedRecord ? formatLongDate(latestIncludedRecord.date) : "-"}</p>
              </div>
              <div className="rounded-[1rem] border border-white/70 bg-white/84 px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Coverage</p>
                <p className="mt-1 font-display text-[1.2rem] leading-tight text-foreground">{includedCount}/{records.length || 0}</p>
              </div>
              <div className="rounded-[1rem] border border-white/70 bg-white/84 px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Library</p>
                <p className="mt-1 font-display text-[1.2rem] leading-tight text-foreground">{formatRecordCountLabel(records.length)}</p>
              </div>
              <div className="rounded-[1rem] border border-white/70 bg-white/84 px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Joined</p>
                <p className="mt-1 font-display text-[1.2rem] leading-tight text-foreground">{formatLongDate(user.createdAt)}</p>
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