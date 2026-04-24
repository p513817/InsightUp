"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  type Column,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type PaginationState,
  type RowData,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { LoaderCircle, PencilLine, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { InbodyRecord } from "@/lib/inbody/types";
import { formatCompactDate, formatDecimal, formatSourceType } from "@/lib/presentation";

const PAGE_SIZE = 8;

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    mobileSlot?: "hero" | "trailing" | "metric" | "detail" | "footer";
    mobileLabel?: string;
    mobileCardClassName?: string;
    mobileRender?: (record: TData, isBusy: boolean) => ReactNode;
  }
}

interface RecordManagerProps {
  records: InbodyRecord[];
  busyRecordId: string | null;
  mode: "dashboard" | "records";
  onAdd: () => void;
  onEdit: (record: InbodyRecord) => void;
  onDelete: (record: InbodyRecord) => Promise<void>;
  onToggleInclusion: (record: InbodyRecord, nextValue: boolean) => Promise<void>;
}

type MobileRecordColumn = Column<InbodyRecord, unknown>;

interface MobileRecordCardProps {
  record: InbodyRecord;
  isBusy: boolean;
  heroColumns: MobileRecordColumn[];
  trailingColumns: MobileRecordColumn[];
  metricColumns: MobileRecordColumn[];
  detailColumns: MobileRecordColumn[];
  footerColumns: MobileRecordColumn[];
}

function renderMobileColumn(column: MobileRecordColumn, record: InbodyRecord, isBusy: boolean) {
  return column.columnDef.meta?.mobileRender?.(record, isBusy) ?? null;
}

function MobileRecordCard({ record, isBusy, heroColumns, trailingColumns, metricColumns, detailColumns, footerColumns }: MobileRecordCardProps) {
  return (
    <Card className="gap-4 border-white/65 bg-white/88 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {heroColumns.map((column) => (
              <div key={column.id}>{renderMobileColumn(column, record, isBusy)}</div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {trailingColumns.map((column) => (
            <div key={column.id}>{renderMobileColumn(column, record, isBusy)}</div>
          ))}
          {isBusy ? <LoaderCircle className="size-5 animate-spin text-muted-foreground" /> : null}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        {metricColumns.map((column) => (
          <div className={column.columnDef.meta?.mobileCardClassName} key={column.id}>
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{column.columnDef.meta?.mobileLabel}</p>
            {renderMobileColumn(column, record, isBusy)}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {detailColumns.map((column) => (
          <div className="text-sm text-muted-foreground" key={column.id}>
            {renderMobileColumn(column, record, isBusy)}
          </div>
        ))}
        {footerColumns.map((column) => (
          <div key={column.id}>{renderMobileColumn(column, record, isBusy)}</div>
        ))}
      </div>
    </Card>
  );
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
  const [searchQuery, setSearchQuery] = useState("");
  const [inclusionFilter, setInclusionFilter] = useState<"all" | "included" | "excluded">("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE });

  const sortedRecords = useMemo(
    () => [...records].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()),
    [records],
  );
  const includedCount = records.filter((record) => record.isIncludedInCharts).length;

  const filteredRecords = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return sortedRecords.filter((record) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          formatCompactDate(record.date),
          formatSourceType(record.sourceType),
          record.notes || "",
          record.isIncludedInCharts ? "included" : "excluded",
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesInclusion =
        inclusionFilter === "all" ||
        (inclusionFilter === "included" ? record.isIncludedInCharts : !record.isIncludedInCharts);

      return matchesQuery && matchesInclusion;
    });
  }, [inclusionFilter, searchQuery, sortedRecords]);

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, [searchQuery, inclusionFilter]);

  function resetFilters() {
    setSearchQuery("");
    setInclusionFilter("all");
  }

  function getMobileColumns(slot: NonNullable<ColumnDef<InbodyRecord>["meta"]>["mobileSlot"]) {
    return table
      .getAllLeafColumns()
      .filter((column) => {
        const meta = column.columnDef.meta;
        return meta !== undefined && meta.mobileSlot === slot && typeof meta.mobileRender === "function";
      });
  }

  const columns = useMemo<ColumnDef<InbodyRecord>[]>(
    () => [
      {
        accessorKey: "date",
        id: "date",
        header: "Date",
        meta: {
          mobileSlot: "hero",
          mobileRender: (record) => <h3 className="font-display text-[1.35rem] leading-none text-foreground">{formatCompactDate(record.date)}</h3>,
        },
        cell: ({ row }) => <p className="font-display text-[1.05rem] text-foreground">{formatCompactDate(row.original.date)}</p>,
      },
      {
        accessorKey: "weight",
        header: "Weight",
        meta: {
          mobileSlot: "metric",
          mobileLabel: "Weight",
          mobileCardClassName: "rounded-[1rem] border border-border/70 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8fc_100%)] px-3 py-2.5",
          mobileRender: (record) => <p className="mt-1 font-display text-[1.15rem] leading-tight text-foreground">{formatDecimal(record.weight)} kg</p>,
        },
        cell: ({ row }) => <span className="text-sm text-foreground">{formatDecimal(row.original.weight)} kg</span>,
      },
      {
        accessorKey: "muscle",
        header: "Muscle",
        meta: {
          mobileSlot: "metric",
          mobileLabel: "Muscle",
          mobileCardClassName: "rounded-[1rem] border border-border/70 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8fc_100%)] px-3 py-2.5",
          mobileRender: (record) => <p className="mt-1 font-display text-[1.15rem] leading-tight text-foreground">{formatDecimal(record.muscle)} kg</p>,
        },
        cell: ({ row }) => <span className="text-sm text-foreground">{formatDecimal(row.original.muscle)} kg</span>,
      },
      {
        accessorKey: "fatPercent",
        header: "Fat%",
        meta: {
          mobileSlot: "metric",
          mobileLabel: "Fat%",
          mobileCardClassName: "rounded-[1rem] border border-border/70 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8fc_100%)] px-3 py-2.5",
          mobileRender: (record) => <p className="mt-1 font-display text-[1.15rem] leading-tight text-foreground">{formatDecimal(record.fatPercent)}</p>,
        },
        cell: ({ row }) => <span className="text-sm text-foreground">{formatDecimal(row.original.fatPercent)}</span>,
      },
      {
        id: "analysis",
        header: () => <div className="w-full text-center">Analysis</div>,
        accessorFn: (record) => record.isIncludedInCharts,
        enableSorting: false,
        meta: {
          mobileSlot: "trailing",
          mobileRender: (record, isBusy) => (
            <div className="flex items-center">
              <Switch
                checked={record.isIncludedInCharts}
                disabled={isBusy}
                onCheckedChange={(checked) => onToggleInclusion(record, checked)}
              />
            </div>
          ),
        },
        cell: ({ row }) => {
          const record = row.original;
          const isBusy = busyRecordId === record.id;

          return (
            <div className="flex items-center justify-center">
              <Switch
                checked={record.isIncludedInCharts}
                disabled={isBusy}
                onCheckedChange={(checked) => onToggleInclusion(record, checked)}
              />
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="w-full text-center">Actions</div>,
        enableSorting: false,
        meta: {
          mobileSlot: "footer",
          mobileRender: (record, isBusy) => (
            <div className="flex w-full justify-end gap-2">
              <Button aria-label="Edit record" className="size-9" disabled={isBusy} onClick={() => onEdit(record)} size="icon" variant="outline">
                <PencilLine className="size-4" />
              </Button>
              <Button aria-label="Delete record" className="size-9" disabled={isBusy} onClick={() => onDelete(record)} size="icon" variant="destructive">
                <Trash2 className="size-4" />
              </Button>
            </div>
          ),
        },
        cell: ({ row }) => {
          const record = row.original;
          const isBusy = busyRecordId === record.id;

          return (
            <div className="flex items-center justify-end gap-2">
              {isBusy ? <LoaderCircle className="size-4 animate-spin text-muted-foreground" /> : null}
              <Button aria-label="Edit record" className="size-9" disabled={isBusy} onClick={() => onEdit(record)} size="icon" variant="outline">
                <PencilLine className="size-4" />
              </Button>
              <Button aria-label="Delete record" className="size-9" disabled={isBusy} onClick={() => onDelete(record)} size="icon" variant="destructive">
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [busyRecordId, onDelete, onEdit, onToggleInclusion],
  );

  const table = useReactTable({
    data: filteredRecords,
    columns,
    state: {
      pagination,
      sorting,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const pageRows = table.getRowModel().rows;
  const totalPages = Math.max(1, table.getPageCount());
  const page = pagination.pageIndex + 1;
  const mobileHeroColumns = getMobileColumns("hero");
  const mobileTrailingColumns = getMobileColumns("trailing");
  const mobileMetricColumns = getMobileColumns("metric");
  const mobileDetailColumns = getMobileColumns("detail");
  const mobileFooterColumns = getMobileColumns("footer");
  const desktopColumnIds = new Set(["date", "weight", "muscle", "fatPercent", "analysis", "actions"]);
  const desktopCenteredColumnIds = new Set(["analysis", "actions"]);
  const hasActiveFilters = searchQuery.trim().length > 0 || inclusionFilter !== "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-muted-foreground">
          共 {records.length} 筆資料，其中 {includedCount} 筆納入圖表分析。
        </p>
        <Button className="self-start sm:self-auto" onClick={onAdd}>
          <Plus className="size-4" />
          新增 InBody 紀錄
        </Button>
      </div>

      <Card className="gap-4 border-white/65 bg-white/88 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Input
            className="h-10 w-full max-w-[26rem] rounded-[1rem] border-border/80 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8fc_100%)] px-3.5 shadow-none placeholder:text-[#8092a8] focus:border-primary/70 focus:ring-2 focus:ring-primary/15"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search date or notes"
            value={searchQuery}
          />

          <div className="flex flex-wrap items-center gap-2">
            {[
              { value: "all", label: "All" },
              { value: "included", label: "In" },
              { value: "excluded", label: "Out" },
            ].map((option) => {
              const isActive = inclusionFilter === option.value;

              return (
                <Button
                  className={isActive ? "border-transparent" : ""}
                  key={option.value}
                  onClick={() => setInclusionFilter(option.value as typeof inclusionFilter)}
                  size="sm"
                  type="button"
                  variant={isActive ? "default" : "outline"}
                >
                  {option.label}
                </Button>
              );
            })}

            {hasActiveFilters ? (
              <Button onClick={resetFilters} size="sm" type="button" variant="ghost">
                Reset
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            顯示 {filteredRecords.length} / {records.length} 筆資料，每頁 {PAGE_SIZE} 筆。
          </p>
          <p>
            第 {page} / {totalPages} 頁
          </p>
        </div>
      </Card>

      {records.length ? (
        filteredRecords.length ? (
          <>
            <div className="hidden overflow-hidden rounded-[1.5rem] border border-white/65 bg-white/88 shadow-[0_10px_24px_rgba(16,35,63,0.06)] lg:block">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left">
                  <thead className="bg-[linear-gradient(180deg,#fbfdff_0%,#f3f8fc_100%)] text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers
                          .filter((header) => desktopColumnIds.has(header.column.id))
                          .map((header) => {
                          const canSort = header.column.getCanSort();
                          const sortState = header.column.getIsSorted();

                          return (
                            <th
                              className={`px-4 py-4 font-medium first:px-5 last:px-5 ${desktopCenteredColumnIds.has(header.column.id) ? "text-center" : "text-left"}`}
                              key={header.id}
                              scope="col"
                            >
                              {header.isPlaceholder ? null : (
                                <button
                                  className={canSort ? `inline-flex items-center gap-2 transition hover:text-foreground ${desktopCenteredColumnIds.has(header.column.id) ? "justify-center" : ""}` : `inline-flex items-center gap-2 ${desktopCenteredColumnIds.has(header.column.id) ? "justify-center" : ""}`}
                                  onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                                  type="button"
                                >
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                  {sortState === "asc" ? <span>↑</span> : null}
                                  {sortState === "desc" ? <span>↓</span> : null}
                                </button>
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {pageRows.map((row) => (
                      <tr className="border-t border-border/60 align-top" key={row.id}>
                        {row
                          .getVisibleCells()
                          .filter((cell) => desktopColumnIds.has(cell.column.id))
                          .map((cell) => (
                          <td className={`px-4 py-4 first:px-5 last:px-5 ${desktopCenteredColumnIds.has(cell.column.id) ? "text-center" : ""}`} key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-3 lg:hidden">
              {pageRows.map((row) => {
                const record = row.original;
                const isBusy = busyRecordId === record.id;

                return (
                  <MobileRecordCard
                    detailColumns={mobileDetailColumns}
                    footerColumns={mobileFooterColumns}
                    heroColumns={mobileHeroColumns}
                    isBusy={isBusy}
                    key={record.id}
                    metricColumns={mobileMetricColumns}
                    record={record}
                    trailingColumns={mobileTrailingColumns}
                  />
                );
              })}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                顯示第 {pagination.pageIndex * pagination.pageSize + 1} 到 {Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredRecords.length)} 筆，共 {filteredRecords.length} 筆。
              </p>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()} size="sm" variant="outline">
                  上一頁
                </Button>
                <div className="rounded-full border border-white/65 bg-white/84 px-4 py-2 text-sm text-foreground">
                  Page {page} / {totalPages}
                </div>
                <Button disabled={!table.getCanNextPage()} onClick={() => table.nextPage()} size="sm" variant="outline">
                  下一頁
                </Button>
              </div>
            </div>
          </>
        ) : (
          <Card className="items-center gap-2 border-dashed border-border bg-[linear-gradient(180deg,#f8fbfe_0%,#eff5fa_100%)] p-8 text-center">
            <p className="font-display text-[1.7rem] text-foreground sm:text-2xl">找不到符合條件的紀錄</p>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">可以調整搜尋關鍵字或篩選條件，重新縮小你要看的資料範圍。</p>
            <Button onClick={resetFilters} variant="outline">
              清除篩選
            </Button>
          </Card>
        )
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