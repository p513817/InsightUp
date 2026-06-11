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
import { Eye, EyeOff, PencilLine, Plus, Search, Trash2, X } from "lucide-react";
import { RecordEmptyState } from "@/components/records/record-empty-state";
import { useLocale } from "@/components/i18n-provider";
import { useTranslations } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
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
  footerColumns: MobileRecordColumn[];
}

function renderMobileColumn(column: MobileRecordColumn, record: InbodyRecord, isBusy: boolean) {
  return column.columnDef.meta?.mobileRender?.(record, isBusy) ?? null;
}

function MobileRecordCard({ record, isBusy, heroColumns, trailingColumns, metricColumns, footerColumns }: MobileRecordCardProps) {
  return (
    <div className="relative isolate overflow-hidden rounded-[1.15rem]">
      {isBusy ? (
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[1.15rem]">
          <span
            className="absolute inset-0 rounded-[1.15rem]"
            style={{
              animation: "rotate-gradient 2s linear infinite",
              background:
                "repeating-conic-gradient(from var(--gradient-rotation), rgb(var(--brand-sky-50) / 0) 0deg, rgb(var(--brand-sky-50) / 0) 145deg, rgb(var(--brand-mint-500) / 0.4) 155deg, rgb(var(--brand-navy-700) / 1) 160deg, rgb(var(--brand-navy-700) / 1) 195deg, rgb(var(--brand-mint-500) / 0.4) 205deg, rgb(var(--brand-sky-50) / 0) 215deg, rgb(var(--brand-sky-50) / 0) 360deg)",
            }}
          />
          <span className="absolute inset-[1.5px] rounded-[calc(1.15rem-1.5px)]" style={{ background: "rgb(var(--background))" }} />
        </span>
      ) : null}

      <Card className="relative z-10 gap-2 rounded-[1.05rem] border-border/55 bg-card/84 p-2.5 sm:p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex flex-wrap items-center gap-2">
              {heroColumns.map((column) => (
                <div key={column.id}>{renderMobileColumn(column, record, isBusy)}</div>
              ))}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {trailingColumns.map((column) => (
                <div key={column.id}>{renderMobileColumn(column, record, isBusy)}</div>
              ))}
              {footerColumns.map((column) => (
                <div key={column.id}>{renderMobileColumn(column, record, isBusy)}</div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {metricColumns.map((column) => (
              <div className={column.columnDef.meta?.mobileCardClassName} key={column.id}>
                <p className="truncate text-[10px] font-semibold uppercase leading-none tracking-[0.1em] text-muted-foreground">{column.columnDef.meta?.mobileLabel}</p>
                {renderMobileColumn(column, record, isBusy)}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
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
  const t = useTranslations();
  const locale = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [isAddButtonFeedbackVisible, setIsAddButtonFeedbackVisible] = useState(false);

  const sortedRecords = useMemo(
    () => [...records].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()),
    [records],
  );
  const filteredRecords = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return sortedRecords.filter((record) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          formatCompactDate(record.date),
          formatSourceType(record.sourceType),
          record.notes || "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesQuery;
    });
  }, [searchQuery, sortedRecords]);

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, [searchQuery]);

  useEffect(() => {
    if (!isAddButtonFeedbackVisible) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsAddButtonFeedbackVisible(false);
    }, 240);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isAddButtonFeedbackVisible]);

  function clearSearch() {
    setSearchQuery("");
  }

  function handleAddClick() {
    setIsAddButtonFeedbackVisible(false);
    requestAnimationFrame(() => {
      setIsAddButtonFeedbackVisible(true);
    });
    onAdd();
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
        header: t("records.manager.date"),
        meta: {
          mobileSlot: "hero",
          mobileRender: (record) => <h3 className="font-display text-[1.12rem] leading-none text-foreground">{formatCompactDate(record.date)}</h3>,
        },
        cell: ({ row }) => <p className="font-display text-[1.05rem] text-foreground">{formatCompactDate(row.original.date)}</p>,
      },
      {
        accessorKey: "weight",
        header: t("records.manager.weight"),
        meta: {
          mobileSlot: "metric",
          mobileLabel: t("records.manager.weight"),
          mobileCardClassName: "surface-subtle-gradient rounded-[0.7rem] border border-border/50 px-2 py-1.5",
          mobileRender: (record) => <p className="mt-1 truncate font-display text-[0.88rem] leading-none text-foreground">{formatDecimal(record.weight)} kg</p>,
        },
        cell: ({ row }) => <span className="text-sm text-foreground">{formatDecimal(row.original.weight)} kg</span>,
      },
      {
        accessorKey: "muscle",
        header: t("records.manager.muscle"),
        meta: {
          mobileSlot: "metric",
          mobileLabel: t("records.manager.muscle"),
          mobileCardClassName: "surface-subtle-gradient rounded-[0.7rem] border border-border/50 px-2 py-1.5",
          mobileRender: (record) => <p className="mt-1 truncate font-display text-[0.88rem] leading-none text-foreground">{formatDecimal(record.muscle)} kg</p>,
        },
        cell: ({ row }) => <span className="text-sm text-foreground">{formatDecimal(row.original.muscle)} kg</span>,
      },
      {
        accessorKey: "fatPercent",
        header: t("records.manager.fatPercent"),
        meta: {
          mobileSlot: "metric",
          mobileLabel: t("records.manager.fatPercent"),
          mobileCardClassName: "surface-subtle-gradient rounded-[0.7rem] border border-border/50 px-2 py-1.5",
          mobileRender: (record) => <p className="mt-1 truncate font-display text-[0.88rem] leading-none text-foreground">{formatDecimal(record.fatPercent)}</p>,
        },
        cell: ({ row }) => <span className="text-sm text-foreground">{formatDecimal(row.original.fatPercent)}</span>,
      },
      {
        id: "analysis",
        header: () => <div className="w-full text-center">{t("records.manager.analysis")}</div>,
        accessorFn: (record) => record.isIncludedInCharts,
        enableSorting: false,
        meta: {
          mobileSlot: "trailing",
          mobileRender: (record, isBusy) => (
            <Button
              aria-label={record.isIncludedInCharts ? t("records.manager.excludeFromCharts") : t("records.manager.includeInCharts")}
              className="size-8"
              disabled={isBusy}
              onClick={() => onToggleInclusion(record, !record.isIncludedInCharts)}
              size="icon"
              title={record.isIncludedInCharts ? t("records.manager.included") : t("records.manager.excluded")}
              type="button"
              variant="outline"
            >
              {record.isIncludedInCharts ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            </Button>
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
        header: () => <div className="w-full text-center">{t("records.manager.actions")}</div>,
        enableSorting: false,
        meta: {
          mobileSlot: "footer",
          mobileRender: (record, isBusy) => (
            <div className="flex items-center gap-1.5">
              <Button aria-label={t("records.manager.edit")} className="size-8" disabled={isBusy} onClick={() => onEdit(record)} size="icon" variant="outline">
                <PencilLine className="size-3.5" />
              </Button>
              <Button aria-label={t("records.manager.delete")} className="size-8" disabled={isBusy} onClick={() => onDelete(record)} size="icon" variant="destructive">
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ),
        },
        cell: ({ row }) => {
          const record = row.original;
          const isBusy = busyRecordId === record.id;

          return (
            <div className="flex items-center justify-end gap-2">
              <Button aria-label={t("records.manager.edit")} className="size-9" disabled={isBusy} onClick={() => onEdit(record)} size="icon" variant="outline">
                <PencilLine className="size-4" />
              </Button>
              <Button aria-label={t("records.manager.delete")} className="size-9" disabled={isBusy} onClick={() => onDelete(record)} size="icon" variant="destructive">
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [busyRecordId, onDelete, onEdit, onToggleInclusion, t],
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
  const mobileFooterColumns = getMobileColumns("footer");
  const desktopColumnIds = new Set(["date", "weight", "muscle", "fatPercent", "analysis", "actions"]);
  const desktopCenteredColumnIds = new Set(["analysis", "actions"]);
  const hasSearchQuery = searchQuery.trim().length > 0;

  return (
    <div className="space-y-2.5 pb-24 sm:space-y-3 sm:pb-28">
      {records.length ? (
        <div>
          <Card className="gap-0 rounded-[1rem] border-border/60 bg-card/90 p-2">
            <div className="flex min-w-0 items-center gap-2">
              <label className="sr-only" htmlFor="record-search">
                {t("records.manager.searchLabel")}
              </label>
              <div className="relative min-w-[10rem] flex-1">
                <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-10 w-full rounded-full border-border/80 bg-[linear-gradient(180deg,rgb(var(--card))_0%,rgb(var(--surface))_100%)] pl-10 pr-3.5 shadow-none placeholder:text-muted-foreground/80 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 sm:h-11"
                  id="record-search"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t("records.manager.searchPlaceholder")}
                  value={searchQuery}
                />
              </div>

              {hasSearchQuery ? (
                <Button
                  aria-label={t("records.manager.clearSearch")}
                  className="size-10 shrink-0 cursor-pointer px-0 sm:size-11"
                  onClick={clearSearch}
                  size="icon"
                  title={t("records.manager.clearSearch")}
                  type="button"
                  variant="ghost"
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
          </Card>
        </div>
      ) : null}

      {records.length ? (
        filteredRecords.length ? (
          <>
            <div className="surface-table-shell hidden overflow-hidden rounded-[1.5rem] lg:block">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left">
                  <thead className="surface-table-head text-xs uppercase tracking-[0.16em] text-muted-foreground">
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

            <div className="grid gap-2 lg:hidden">
              {pageRows.map((row) => {
                const record = row.original;
                const isBusy = busyRecordId === record.id;

                return (
                  <MobileRecordCard
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

            <div className="flex justify-center">
              <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 sm:w-auto">
                <Button className="w-full sm:w-auto" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()} size="sm" variant="outline">
                  {locale === "en" ? "Previous" : "上一頁"}
                </Button>
                <div className="rounded-full border border-border/60 bg-card/86 px-4 py-2 text-center text-sm text-foreground">
                  {locale === "en" ? "Page" : "頁次"} {page} / {totalPages}
                </div>
                <Button className="w-full sm:w-auto" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()} size="sm" variant="outline">
                  {locale === "en" ? "Next" : "下一頁"}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <Card className="surface-state-panel items-center gap-2 p-8 text-center">
            <p className="font-display text-[1.7rem] text-foreground sm:text-2xl">{t("records.manager.noResultsTitle")}</p>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">{t("records.manager.noResultsBody")}</p>
            <Button onClick={clearSearch} variant="outline">
              {t("records.manager.clearSearch")}
            </Button>
          </Card>
        )
      ) : (
        <RecordEmptyState onAdd={onAdd} />
      )}
      {records.length ? (
        <FloatingActionButton ariaLabel={t("records.manager.addRecord")} onClick={handleAddClick} title={t("records.manager.addRecord")}>
            <span
              aria-hidden
              className={isAddButtonFeedbackVisible ? "pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgb(var(--brand-sky-50)/0.36)_0%,rgb(var(--brand-mint-300)/0.26)_32%,transparent_72%)] opacity-100 scale-100 transition duration-200" : "pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgb(var(--brand-sky-50)/0.36)_0%,rgb(var(--brand-mint-300)/0.26)_32%,transparent_72%)] opacity-0 scale-[0.78] transition duration-200"}
            />
            <Plus className={isAddButtonFeedbackVisible ? "relative z-10 size-7 transition-transform duration-200 scale-110 rotate-90" : "relative z-10 size-7 transition-transform duration-200"} />
        </FloatingActionButton>
      ) : null}
    </div>
  );
}
