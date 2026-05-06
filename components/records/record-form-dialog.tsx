import { z } from "zod";
"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { recordToFormValues } from "@/lib/inbody/records";
import { recordFormSchema, type RecordFormValues } from "@/lib/inbody/schema";
import { SEGMENT_PARTS, type InbodyRecord } from "@/lib/inbody/types";

interface RecordFormDialogProps {
  open: boolean;
  initialRecord?: InbodyRecord | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: RecordFormValues) => Promise<void>;
}

type SectionKey = "basic" | "primary" | "additional" | "notes" | "segmental";

function splitDateParts(value: string | null | undefined) {
  if (!value) {
    return { year: "", month: "", day: "" };
  }

  const matchedParts = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchedParts) {
    return {
      year: matchedParts[1],
      month: matchedParts[2],
      day: matchedParts[3],
    };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { year: "", month: "", day: "" };
  }

  return {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1).padStart(2, "0"),
    day: String(date.getDate()).padStart(2, "0"),
  };
}

function getDaysInMonth(year: string, month: string) {
  if (!year || !month) {
    return 31;
  }

  return new Date(Number(year), Number(month), 0).getDate();
}

function buildDateValue(parts: { year: string; month: string; day: string }) {
  const { year, month, day } = parts;
  if (!year || !month || !day) {
    return "";
  }

  const safeDay = Math.min(Number(day), getDaysInMonth(year, month));
  return `${year}-${month}-${String(safeDay).padStart(2, "0")}`;
}

function getRelativeDateValue(offsetDays = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);

  return [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function FieldShell({
  children,
  label,
  error,
  required,
  className,
}: {
  children: React.ReactNode;
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={className}>
      <div className="mb-1 flex items-center gap-2 text-[13px] font-medium text-foreground/92">
        <span>{label}</span>
        {required ? <span className="text-danger">*</span> : null}
      </div>
      {children}
      <p className="mt-0.5 min-h-[0.75rem] text-[11px] leading-3 text-danger">{error || " "}</p>
    </label>
  );
}

export function RecordFormDialog({ open, initialRecord, onOpenChange, onSubmit }: RecordFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelFeedbackVisible, setIsCancelFeedbackVisible] = useState(false);
  const [isSubmitFeedbackVisible, setIsSubmitFeedbackVisible] = useState(false);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    additional: false,
    basic: false,
    notes: false,
    primary: false,
    segmental: false,
  });
  const currentYear = new Date().getFullYear();
  const sectionClassName =
    "surface-muted-gradient space-y-2 rounded-[1rem] border border-border/80 p-4";
  const sectionTitleClassName = "text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground";
  const controlClassName =
    "h-10 rounded-[0.9rem] border border-border/80 bg-[linear-gradient(180deg,rgb(var(--card))_0%,rgb(var(--surface))_100%)] px-3.5 shadow-none placeholder:text-muted-foreground/80 focus:border-primary/70 focus:ring-2 focus:ring-primary/15";
  const selectClassName =
    "flex h-10 w-full rounded-[0.9rem] border border-border/80 bg-[linear-gradient(180deg,rgb(var(--card))_0%,rgb(var(--surface))_100%)] px-3.5 text-sm text-foreground outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/15";
  const textareaClassName =
    "min-h-24 rounded-[0.95rem] border-border/80 bg-[linear-gradient(180deg,rgb(var(--card))_0%,rgb(var(--surface))_100%)] px-3.5 py-2.5 shadow-none placeholder:text-muted-foreground/80 focus:border-primary/70 focus:ring-2 focus:ring-primary/15";
  const form = useForm<RecordFormValues>({
    resolver: zodResolver(recordFormSchema) as any,
    defaultValues: recordToFormValues(initialRecord),
  });
  const watchedValues = form.watch();

  useEffect(() => {
    form.reset(recordToFormValues(initialRecord));
  }, [form, initialRecord, open]);

  useEffect(() => {
    if (!open) {
      setIsCancelFeedbackVisible(false);
      setIsSubmitFeedbackVisible(false);
      setOpenSections({
        additional: false,
        basic: false,
        notes: false,
        primary: false,
        segmental: false,
      });
    }
  }, [open]);

  async function handleSubmit(values: RecordFormValues) {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  function triggerFeedback(setter: React.Dispatch<React.SetStateAction<boolean>>) {
    setter(false);
    requestAnimationFrame(() => {
      setter(true);
    });
    window.setTimeout(() => {
      setter(false);
    }, 220);
  }

  function handleCancelClick() {
    triggerFeedback(setIsCancelFeedbackVisible);
    window.setTimeout(() => {
      onOpenChange(false);
    }, 120);
  }

  function handleSubmitPress() {
    triggerFeedback(setIsSubmitFeedbackVisible);
  }

  function toggleSection(section: SectionKey) {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  function hasValue(value: unknown) {
    return value !== null && value !== undefined && value !== "";
  }

  const isBasicComplete = hasValue(watchedValues.date) && hasValue(watchedValues.sourceType);
  const isPrimaryComplete =
    hasValue(watchedValues.weight) &&
    hasValue(watchedValues.muscle) &&
    hasValue(watchedValues.fat) &&
    hasValue(watchedValues.fatPercent);
  const isAdditionalComplete = [
    watchedValues.height,
    watchedValues.age,
    watchedValues.gender !== "unknown" ? watchedValues.gender : null,
    watchedValues.score,
    watchedValues.visceralFatLevel,
    watchedValues.bmr,
    watchedValues.recommendedCalories,
  ].some(hasValue);
  const isNotesComplete = hasValue(watchedValues.notes);
  const isSegmentalComplete = Object.values(watchedValues.segmental).some((part) => hasValue(part.muscle) || hasValue(part.fat));

  function renderSectionToggle(section: SectionKey, label: string, isComplete: boolean) {
    return (
      <button
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={() => toggleSection(section)}
        type="button"
      >
        <span className="flex items-center gap-2">
          <span className={sectionTitleClassName}>{label}</span>
          {isComplete ? (
            <span className="inline-flex size-4 items-center justify-center rounded-full bg-emerald-500/14 text-emerald-600">
              <Check className="size-3" />
            </span>
          ) : null}
        </span>
        <ChevronDown className={openSections[section] ? "size-4 text-muted-foreground transition-transform duration-200 rotate-180" : "size-4 text-muted-foreground transition-transform duration-200"} />
      </button>
    );
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="h-[min(88vh,46rem)] max-w-4xl p-0 sm:h-[min(88vh,52rem)]" showCloseButton={false}>
        <DialogHeader className="px-5 py-4 sm:px-6">
          <DialogTitle>{initialRecord ? "編輯 InBody 紀錄" : "新增 InBody 紀錄"}</DialogTitle>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3.5 sm:px-6 sm:py-4">
            <div className="grid gap-3.5">
              <section className={sectionClassName}>
                {renderSectionToggle("basic", "基本資料", isBasicComplete)}
                {openSections.basic ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <FieldShell error={form.formState.errors.date?.message} label="日期" required>
                    <Controller
                      control={form.control}
                      name="date"
                      render={({ field }) => {
                        const parts = splitDateParts(field.value);
                        const earliestYear = Math.min(parts.year ? Number(parts.year) : currentYear, currentYear - 20);
                        const yearOptions = Array.from(
                          { length: currentYear - earliestYear + 1 },
                          (_, index) => String(currentYear - index),
                        );
                        const monthOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
                        const dayOptions = Array.from(
                          { length: getDaysInMonth(parts.year, parts.month) },
                          (_, index) => String(index + 1).padStart(2, "0"),
                        );

                        function updateDate(nextParts: Partial<typeof parts>) {
                          field.onChange(buildDateValue({ ...parts, ...nextParts }));
                        }

                        return (
                          <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                              <select
                                className={selectClassName}
                                onChange={(event) => updateDate({ year: event.target.value })}
                                value={parts.year}
                              >
                                <option value="">年</option>
                                {yearOptions.map((optionYear) => (
                                  <option key={optionYear} value={optionYear}>
                                    {optionYear}
                                  </option>
                                ))}
                              </select>
                              <select
                                className={selectClassName}
                                onChange={(event) => updateDate({ month: event.target.value })}
                                value={parts.month}
                              >
                                <option value="">月</option>
                                {monthOptions.map((optionMonth) => (
                                  <option key={optionMonth} value={optionMonth}>
                                    {optionMonth}
                                  </option>
                                ))}
                              </select>
                              <select
                                className={selectClassName}
                                onChange={(event) => updateDate({ day: event.target.value })}
                                value={parts.day}
                              >
                                <option value="">日</option>
                                {dayOptions.map((optionDay) => (
                                  <option key={optionDay} value={optionDay}>
                                    {optionDay}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                className="h-8 rounded-full px-3 text-xs"
                                onClick={() => field.onChange(getRelativeDateValue(0))}
                                type="button"
                                variant="outline"
                              >
                                今天
                              </Button>
                              <Button
                                className="h-8 rounded-full px-3 text-xs"
                                onClick={() => field.onChange(getRelativeDateValue(-1))}
                                type="button"
                                variant="outline"
                              >
                                昨天
                              </Button>
                              <p className="text-xs text-muted-foreground">
                                {field.value ? field.value.replace(/-/g, "/") : "選擇測量日期"}
                              </p>
                            </div>
                          </div>
                        );
                      }}
                    />
                  </FieldShell>

                  <FieldShell error={form.formState.errors.sourceType?.message} label="來源">
                    <select className={selectClassName} {...form.register("sourceType")}>
                      <option value="manual">手動輸入</option>
                      <option value="photo_scan">拍照掃描待確認</option>
                    </select>
                  </FieldShell>

                  <FieldShell label="圖表分析">
                    <div className="flex h-10 items-center justify-between rounded-[0.9rem] border border-border/80 bg-[linear-gradient(180deg,rgb(var(--card))_0%,rgb(var(--surface))_100%)] px-3.5">
                      <span className="text-sm text-foreground">納入圖表分析</span>
                      <Controller
                        control={form.control}
                        name="isIncludedInCharts"
                        render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                      />
                    </div>
                  </FieldShell>
                </div> : null}
              </section>

              <section className={sectionClassName}>
                {renderSectionToggle("primary", "主要數值", isPrimaryComplete)}
                {openSections.primary ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <FieldShell error={form.formState.errors.weight?.message} label="體重 (kg)" required>
                    <Input className={controlClassName} placeholder="66.1" step="0.1" type="number" {...form.register("weight")} />
                  </FieldShell>
                  <FieldShell error={form.formState.errors.muscle?.message} label="骨骼肌 (kg)" required>
                    <Input className={controlClassName} placeholder="30.5" step="0.1" type="number" {...form.register("muscle")} />
                  </FieldShell>
                  <FieldShell error={form.formState.errors.fat?.message} label="體脂肪 (kg)" required>
                    <Input className={controlClassName} placeholder="11.9" step="0.1" type="number" {...form.register("fat")} />
                  </FieldShell>
                  <FieldShell error={form.formState.errors.fatPercent?.message} label="體脂率 (%)" required>
                    <Input className={controlClassName} placeholder="18.0" step="0.1" type="number" {...form.register("fatPercent")} />
                  </FieldShell>
                </div> : null}
              </section>

              <section className={sectionClassName}>
                {renderSectionToggle("additional", "次要欄位", isAdditionalComplete)}
                {openSections.additional ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <FieldShell error={form.formState.errors.height?.message} label="身高 (cm)">
                      <Input className={controlClassName} placeholder="170" step="0.1" type="number" {...form.register("height")} />
                    </FieldShell>
                    <FieldShell error={form.formState.errors.age?.message} label="年齡">
                      <Input className={controlClassName} placeholder="29" step="1" type="number" {...form.register("age")} />
                    </FieldShell>
                    <FieldShell error={form.formState.errors.gender?.message} label="性別">
                      <select className={selectClassName} {...form.register("gender")}>
                        <option value="unknown">未知</option>
                        <option value="male">男性</option>
                        <option value="female">女性</option>
                        <option value="other">其他</option>
                      </select>
                    </FieldShell>
                      <FieldShell error={form.formState.errors.score?.message} label="分數">
                      <Input className={controlClassName} placeholder="81" step="1" type="number" {...form.register("score")} />
                    </FieldShell>
                    <FieldShell error={form.formState.errors.visceralFatLevel?.message} label="內臟脂肪等級">
                      <Input className={controlClassName} placeholder="6" step="1" type="number" {...form.register("visceralFatLevel")} />
                    </FieldShell>
                      <FieldShell error={form.formState.errors.bmr?.message} label="基礎代謝率 (kcal)">
                      <Input className={controlClassName} placeholder="1508" step="1" type="number" {...form.register("bmr")} />
                    </FieldShell>
                    <FieldShell error={form.formState.errors.recommendedCalories?.message} label="建議熱量 (kcal)">
                      <Input className={controlClassName} placeholder="2140" step="1" type="number" {...form.register("recommendedCalories")} />
                    </FieldShell>
                  </div>
                ) : null}
              </section>

              <section className={sectionClassName}>
                  {renderSectionToggle("segmental", "部位數據", isSegmentalComplete)}
                  {openSections.segmental ? <div className="grid gap-2.5 lg:grid-cols-2 xl:grid-cols-3">
                  {SEGMENT_PARTS.map((part) => (
                    <div className="grid gap-2.5" key={part.key}>
                      <h4 className="text-sm font-semibold text-foreground">{part.label}</h4>
                      <div className="grid gap-2.5">
                        <FieldShell error={form.formState.errors.segmental?.[part.key]?.muscle?.message} label="骨骼肌 (kg)">
                          <Input className={controlClassName} step="0.01" type="number" {...form.register(`segmental.${part.key}.muscle` as const)} />
                        </FieldShell>
                        <FieldShell error={form.formState.errors.segmental?.[part.key]?.fat?.message} label="脂肪 (kg)">
                          <Input className={controlClassName} step="0.01" type="number" {...form.register(`segmental.${part.key}.fat` as const)} />
                        </FieldShell>
                      </div>
                    </div>
                  ))}
                </div> : null}
              </section>

              <section className={sectionClassName}>
                  {renderSectionToggle("notes", "備註", isNotesComplete)}
                  {openSections.notes ? (
                  <FieldShell className="block" error={form.formState.errors.notes?.message} label="筆記">
                    <Textarea className={textareaClassName} placeholder="可補充測量狀態、含水量或其他判讀資訊。" {...form.register("notes")} />
                  </FieldShell>
                ) : null}
              </section>
            </div>
          </div>

          <div className="shrink-0 border-t border-border/80 bg-card/96 px-5 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-2 sm:px-6">
            <div className="flex flex-wrap justify-end gap-2.5">
              <Button className="relative overflow-hidden" onClick={handleCancelClick} type="button" variant="outline">
                <span
                  aria-hidden
                  className={isCancelFeedbackVisible ? "pointer-events-none absolute inset-0 rounded-[0.9rem] bg-[radial-gradient(circle_at_center,rgb(var(--brand-sky-50)/0.3)_0%,rgb(var(--brand-sky-400)/0.18)_34%,transparent_74%)] opacity-100 scale-100 transition duration-200" : "pointer-events-none absolute inset-0 rounded-[0.9rem] bg-[radial-gradient(circle_at_center,rgb(var(--brand-sky-50)/0.3)_0%,rgb(var(--brand-sky-400)/0.18)_34%,transparent_74%)] opacity-0 scale-[0.8] transition duration-200"}
                />
                <span className="relative z-10">取消</span>
              </Button>
              <Button className="relative overflow-hidden" disabled={isSubmitting} onClick={handleSubmitPress} type="submit">
                <span
                  aria-hidden
                  className={isSubmitFeedbackVisible ? "pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgb(var(--brand-sky-50)/0.36)_0%,rgb(var(--brand-mint-300)/0.24)_34%,transparent_76%)] opacity-100 scale-100 transition duration-200" : "pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgb(var(--brand-sky-50)/0.36)_0%,rgb(var(--brand-mint-300)/0.24)_34%,transparent_76%)] opacity-0 scale-[0.8] transition duration-200"}
                />
                <span className="relative z-10">{isSubmitting ? "儲存中..." : initialRecord ? "更新紀錄" : "建立紀錄"}</span>
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}