"use client";

import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { MetricSummaryGrid } from "@/components/charts/metric-summary-grid";
import { TrendChart } from "@/components/charts/trend-chart";
import { RecordFormDialog } from "@/components/records/record-form-dialog";
import { RecordManager } from "@/components/records/record-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  buildChartPayload,
  getDefaultChartView,
  getLatestIncludedRecord,
} from "@/lib/inbody/records";
import { type RecordFormValues } from "@/lib/inbody/schema";
import { CHART_VIEWS, type ChartViewKey, type InbodyRecord } from "@/lib/inbody/types";
import type { AppUserSummary } from "@/lib/presentation";
import { formatLongDate, formatRecordCountLabel, getUserInitials } from "@/lib/presentation";

interface RecordsWorkspaceProps {
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

export function RecordsWorkspace({ initialRecords, mode, user }: RecordsWorkspaceProps) {
  const [records, setRecords] = useState(sortRecords(initialRecords));
  const [activeView, setActiveView] = useState<ChartViewKey>(getDefaultChartView());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InbodyRecord | null>(null);
  const [busyRecordId, setBusyRecordId] = useState<string | null>(null);

  const chart = buildChartPayload(records, activeView);
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

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="gap-6 bg-[#f8f1e4]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <Badge>{mode === "dashboard" ? "Dashboard" : "Profile Settings"}</Badge>
              <div>
                <h1 className="font-display text-4xl text-foreground">
                  {mode === "dashboard" ? "Body Composition Trends" : "Personal Record Control Center"}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                  {mode === "dashboard"
                    ? "切換整體與區域視角，觀察每筆紀錄在圖表中的變化，並維持對資料可信度的控制權。"
                    : "集中管理帳號資訊、紀錄狀態與圖表 inclusion 規則，保留完整歷史但避免不可靠數據扭曲分析。"}
                </p>
              </div>
            </div>

            <Button onClick={openCreateDialog}>
              <Plus className="size-4" />
              新增紀錄
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="gap-2 bg-card p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Latest included record</p>
              <p className="font-display text-3xl text-foreground">{latestIncludedRecord ? formatLongDate(latestIncludedRecord.date) : "-"}</p>
              <p className="text-sm text-muted-foreground">Included records only affect chart analysis.</p>
            </Card>
            <Card className="gap-2 bg-card p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Coverage</p>
              <p className="font-display text-3xl text-foreground">{includedCount}/{records.length || 0}</p>
              <p className="text-sm text-muted-foreground">{formatRecordCountLabel(records.length)}</p>
            </Card>
            <Card className="gap-2 bg-card p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Interaction model</p>
              <p className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Sparkles className="size-4 text-primary" />
                {activeView === "overall" ? "Overall metrics" : `Segmental: ${CHART_VIEWS.find((view) => view.key === activeView)?.label}`}
              </p>
              <p className="text-sm text-muted-foreground">Switch views without leaving the same primary chart surface.</p>
            </Card>
          </div>
        </Card>

        <Card className="gap-5 bg-[#1d2a24] text-[#f7f2e8]">
          <div className="flex items-center gap-4">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={user.name} className="size-16 rounded-full border border-white/20 object-cover" src={user.avatarUrl} />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg font-semibold">
                {getUserInitials(user.name)}
              </div>
            )}
            <div>
              <h2 className="font-display text-3xl">{user.name}</h2>
              <p className="mt-1 text-sm text-[#d3d9d1]">{user.email || "Signed in with Google"}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#a4b3a6]">Account created {formatLongDate(user.createdAt)}</p>
            </div>
          </div>
          <p className="text-sm leading-7 text-[#d3d9d1]">
            OAuth callback 已改成環境變數驅動。開發與正式環境只需要切換 `.env` 和 Supabase Allowed Redirect URLs，不需要改程式碼。
          </p>
        </Card>
      </section>

      <Card className="gap-6">
        <div className="space-y-3">
          <h2 className="font-display text-3xl text-foreground">Primary Chart Surface</h2>
          <p className="text-sm leading-7 text-muted-foreground">所有圖表都共用同一個 chart panel。切換視角時保留操作位置與指標摘要，不再拆成多塊互相干擾的圖區。</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {CHART_VIEWS.map((view) => (
            <Button
              key={view.key}
              size="sm"
              variant={activeView === view.key ? "default" : "outline"}
              onClick={() => setActiveView(view.key)}
            >
              {view.label}
            </Button>
          ))}
        </div>

        <MetricSummaryGrid chart={chart} />
        <TrendChart chart={chart} />
      </Card>

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