"use client";

import { LoaderCircle, PencilLine, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { InbodyRecord } from "@/lib/inbody/types";
import { formatLongDate, formatSourceType, formatDecimal } from "@/lib/presentation";

interface RecordManagerProps {
  records: InbodyRecord[];
  busyRecordId: string | null;
  mode: "dashboard" | "profile";
  onAdd: () => void;
  onEdit: (record: InbodyRecord) => void;
  onDelete: (record: InbodyRecord) => Promise<void>;
  onToggleInclusion: (record: InbodyRecord, nextValue: boolean) => Promise<void>;
}

export function RecordManager({
  records,
  busyRecordId,
  mode,
  onAdd,
  onEdit,
  onDelete,
  onToggleInclusion,
}: RecordManagerProps) {
  const sortedRecords = [...records].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  const includedCount = records.filter((record) => record.isIncludedInCharts).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl text-foreground sm:text-3xl">{mode === "dashboard" ? "Record Library" : "Records"}</h2>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            共 {records.length} 筆資料，其中 {includedCount} 筆納入圖表分析。
          </p>
        </div>
        <Button className="self-start sm:self-auto" onClick={onAdd}>
          <Plus className="size-4" />
          新增 InBody 紀錄
        </Button>
      </div>

      {sortedRecords.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {sortedRecords.map((record) => {
            const isBusy = busyRecordId === record.id;
            return (
              <Card className="gap-4 border-white/65 bg-white/88 p-5 sm:p-6" key={record.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground sm:text-lg">{formatLongDate(record.date)}</h3>
                      <Badge variant={record.isIncludedInCharts ? "default" : "neutral"}>
                        {record.isIncludedInCharts ? "Included" : "Excluded"}
                      </Badge>
                      <Badge variant="neutral">{formatSourceType(record.sourceType)}</Badge>
                    </div>
                  </div>
                  {isBusy ? <LoaderCircle className="size-5 animate-spin text-muted-foreground" /> : null}
                </div>

                <div className="grid gap-2 sm:grid-cols-4">
                  <div className="rounded-[1rem] border border-border/70 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8fc_100%)] px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Weight</p>
                    <p className="mt-1 font-display text-[1.15rem] leading-tight text-foreground">{formatDecimal(record.weight)} kg</p>
                  </div>
                  <div className="rounded-[1rem] border border-border/70 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8fc_100%)] px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Muscle</p>
                    <p className="mt-1 font-display text-[1.15rem] leading-tight text-foreground">{formatDecimal(record.muscle)} kg</p>
                  </div>
                  <div className="rounded-[1rem] border border-border/70 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8fc_100%)] px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Fat</p>
                    <p className="mt-1 font-display text-[1.15rem] leading-tight text-foreground">{formatDecimal(record.fat)} kg</p>
                  </div>
                  <div className="rounded-[1rem] border border-border/70 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8fc_100%)] px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Fat %</p>
                    <p className="mt-1 font-display text-[1.15rem] leading-tight text-foreground">{formatDecimal(record.fatPercent)}</p>
                  </div>
                </div>

                <div className="grid gap-3 rounded-[1.2rem] border border-border/70 bg-[linear-gradient(180deg,#f8fbfe_0%,#eff5fa_100%)] p-3.5 text-sm text-muted-foreground sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Segmental highlight</p>
                    <p className="mt-1.5 leading-6 text-foreground/88">Trunk muscle {formatDecimal(record.segmental.trunk.muscle)} kg, Left leg fat {formatDecimal(record.segmental.leftLeg.fat)} kg</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Notes</p>
                    <p className="mt-1.5 line-clamp-3 leading-6 text-foreground/88">{record.notes || "No additional note for this record."}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-center gap-3 text-sm text-foreground/92">
                    <Switch
                      checked={record.isIncludedInCharts}
                      disabled={isBusy}
                      onCheckedChange={(checked) => onToggleInclusion(record, checked)}
                    />
                    納入圖表分析
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <Button disabled={isBusy} onClick={() => onEdit(record)} size="sm" variant="outline">
                      <PencilLine className="size-4" />
                      編輯
                    </Button>
                    <Button disabled={isBusy} onClick={() => onDelete(record)} size="sm" variant="destructive">
                      <Trash2 className="size-4" />
                      刪除
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="items-center gap-2 border-dashed border-border bg-[linear-gradient(180deg,#f8fbfe_0%,#eff5fa_100%)] p-8 text-center">
          <p className="font-display text-[1.7rem] text-foreground sm:text-2xl">還沒有 InBody 紀錄</p>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">先建立第一筆紀錄，之後就能切換整體與區域圖表、調整納入分析的資料範圍。</p>
          <Button onClick={onAdd}>新增第一筆資料</Button>
        </Card>
      )}
    </div>
  );
}