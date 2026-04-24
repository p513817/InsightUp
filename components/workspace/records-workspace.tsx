"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MiniTrendGrid } from "@/components/charts/mini-trend-grid";
import { RecordFormDialog } from "@/components/records/record-form-dialog";
import { RecordManager } from "@/components/records/record-manager";
import { Card } from "@/components/ui/card";
import { buildChartPayload, getLatestIncludedRecord } from "@/lib/inbody/records";
import { type RecordFormValues } from "@/lib/inbody/schema";
import { type InbodyRecord } from "@/lib/inbody/types";
import type { AppUserSummary } from "@/lib/presentation";
import { formatLongDate, formatRecordCountLabel, getUserInitials } from "@/lib/presentation";

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
      <div className="space-y-6">
        <section className="space-y-4">
          <div>
            <h1 className="font-display text-3xl text-foreground sm:text-[2.75rem]">你的 InBody 指數總覽</h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              每張卡片只看一個指數，右上角顯示最後一次與前一次的差異。Included {includedCount}/{records.length || 0}，最後一筆為 {latestIncludedRecord ? formatLongDate(latestIncludedRecord.date) : "-"}。
            </p>
          </div>
          <MiniTrendGrid chart={chart} initialMetricOrder={initialDashboardMetricOrder} />
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <Card className="gap-6 bg-[#f8f1e4] p-8">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={user.name} className="size-14 rounded-full border border-border object-cover" src={user.avatarUrl} />
              ) : (
                <div className="flex size-14 items-center justify-center rounded-full border border-border bg-card text-base font-semibold text-foreground">
                  {getUserInitials(user.name)}
                </div>
              )}
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{user.email || "Signed in with Google"}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="gap-2 bg-card p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Latest included</p>
              <p className="font-display text-3xl text-foreground">{latestIncludedRecord ? formatLongDate(latestIncludedRecord.date) : "-"}</p>
            </Card>
            <Card className="gap-2 bg-card p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Coverage</p>
              <p className="font-display text-3xl text-foreground">{includedCount}/{records.length || 0}</p>
            </Card>
            <Card className="gap-2 bg-card p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Account created</p>
              <p className="font-display text-3xl text-foreground">{formatLongDate(user.createdAt)}</p>
            </Card>
          </div>
        </Card>
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