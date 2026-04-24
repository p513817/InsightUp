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
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl text-foreground">{mode === "dashboard" ? "Record Library" : "Records"}</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            共 {records.length} 筆資料，其中 {includedCount} 筆納入圖表分析。
          </p>
        </div>
        <Button onClick={onAdd}>
          <Plus className="size-4" />
          新增 InBody 紀錄
        </Button>
      </div>

      {sortedRecords.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {sortedRecords.map((record) => {
            const isBusy = busyRecordId === record.id;
            return (
              <Card className="gap-4" key={record.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground">{formatLongDate(record.date)}</h3>
                      <Badge variant={record.isIncludedInCharts ? "default" : "neutral"}>
                        {record.isIncludedInCharts ? "Included" : "Excluded"}
                      </Badge>
                      <Badge variant="neutral">{formatSourceType(record.sourceType)}</Badge>
                    </div>
                    <p className="text-sm leading-7 text-muted-foreground">
                      Weight {formatDecimal(record.weight)} kg, Muscle {formatDecimal(record.muscle)} kg, Fat {formatDecimal(record.fat)} kg, Fat % {formatDecimal(record.fatPercent)}
                    </p>
                  </div>
                  {isBusy ? <LoaderCircle className="size-5 animate-spin text-muted-foreground" /> : null}
                </div>

                <div className="grid gap-3 rounded-[1.5rem] bg-[#fbf6ee] p-4 text-sm text-muted-foreground sm:grid-cols-2">
                  <div>
                    <p className="font-medium text-foreground">Segmental highlight</p>
                    <p className="mt-1 leading-6">Trunk muscle {formatDecimal(record.segmental.trunk.muscle)} kg, Left leg fat {formatDecimal(record.segmental.leftLeg.fat)} kg</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Notes</p>
                    <p className="mt-1 line-clamp-3 leading-6">{record.notes || "No additional note for this record."}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-center gap-3 text-sm text-foreground">
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
        <Card className="items-center gap-3 border-dashed bg-[#fbf6ee] text-center">
          <p className="font-display text-2xl text-foreground">還沒有 InBody 紀錄</p>
          <p className="max-w-xl text-sm leading-7 text-muted-foreground">先建立第一筆紀錄，之後就能切換整體與區域圖表、調整納入分析的資料範圍。</p>
          <Button onClick={onAdd}>新增第一筆資料</Button>
        </Card>
      )}
    </div>
  );
}