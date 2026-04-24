"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
        {required ? <span className="text-[#b85b73]">*</span> : null}
      </div>
      {children}
      <p className="mt-0.5 min-h-[0.75rem] text-[11px] leading-3 text-[#b85b73]">{error || " "}</p>
    </label>
  );
}

export function RecordFormDialog({ open, initialRecord, onOpenChange, onSubmit }: RecordFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const controlClassName =
    "h-10 rounded-[1rem] border border-border/80 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8fc_100%)] px-3.5 shadow-none placeholder:text-[#8092a8] focus:border-primary/70 focus:ring-2 focus:ring-primary/15";
  const selectClassName =
    "flex h-10 w-full rounded-[1rem] border border-border/80 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8fc_100%)] px-3.5 text-sm text-foreground outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/15";
  const textareaClassName =
    "min-h-24 rounded-[1.1rem] border-border/80 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8fc_100%)] px-3.5 py-2.5 shadow-none placeholder:text-[#8092a8] focus:border-primary/70 focus:ring-2 focus:ring-primary/15";
  const form = useForm<RecordFormValues>({
    resolver: zodResolver(recordFormSchema),
    defaultValues: recordToFormValues(initialRecord),
  });

  useEffect(() => {
    form.reset(recordToFormValues(initialRecord));
  }, [form, initialRecord, open]);

  async function handleSubmit(values: RecordFormValues) {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="px-5 py-4 sm:px-6 sm:py-4.5">
          <DialogTitle>{initialRecord ? "編輯 InBody 紀錄" : "新增 InBody 紀錄"}</DialogTitle>
          <DialogDescription>
            統一在同一個表單裡管理整體指標、segmental 值與 chart inclusion 設定。空白的 segmental 欄位會回退到推導值。
          </DialogDescription>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3.5 sm:px-6 sm:py-4">
            <div className="grid gap-4">
              <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <FieldShell error={form.formState.errors.date?.message} label="Date" required>
                  <Input className={controlClassName} type="date" {...form.register("date")} />
                </FieldShell>

                <FieldShell error={form.formState.errors.sourceType?.message} label="Source">
                  <select className={selectClassName} {...form.register("sourceType")}>
                    <option value="manual">Manual entry</option>
                    <option value="photo_scan">Photo scan review</option>
                  </select>
                </FieldShell>

                <FieldShell label="Include in chart">
                  <div className="flex h-10 items-center justify-between rounded-[1rem] border border-border/80 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8fc_100%)] px-3.5">
                    <span className="text-sm text-foreground">Keep in chart analysis</span>
                    <Controller
                      control={form.control}
                      name="isIncludedInCharts"
                      render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                    />
                  </div>
                </FieldShell>

                <FieldShell error={form.formState.errors.height?.message} label="Height (cm)">
                  <Input className={controlClassName} placeholder="170" step="0.1" type="number" {...form.register("height")} />
                </FieldShell>
                <FieldShell error={form.formState.errors.age?.message} label="Age">
                  <Input className={controlClassName} placeholder="29" step="1" type="number" {...form.register("age")} />
                </FieldShell>
                <FieldShell error={form.formState.errors.gender?.message} label="Gender">
                  <select className={selectClassName} {...form.register("gender")}>
                    <option value="unknown">Unknown</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </FieldShell>
                <FieldShell error={form.formState.errors.score?.message} label="InBody Score">
                  <Input className={controlClassName} placeholder="81" step="1" type="number" {...form.register("score")} />
                </FieldShell>
                <FieldShell error={form.formState.errors.weight?.message} label="Weight (kg)" required>
                  <Input className={controlClassName} placeholder="66.1" step="0.1" type="number" {...form.register("weight")} />
                </FieldShell>
                <FieldShell error={form.formState.errors.muscle?.message} label="Muscle (kg)" required>
                  <Input className={controlClassName} placeholder="30.5" step="0.1" type="number" {...form.register("muscle")} />
                </FieldShell>
                <FieldShell error={form.formState.errors.fat?.message} label="Fat (kg)" required>
                  <Input className={controlClassName} placeholder="11.9" step="0.1" type="number" {...form.register("fat")} />
                </FieldShell>
                <FieldShell error={form.formState.errors.fatPercent?.message} label="Fat Percentage (%)" required>
                  <Input className={controlClassName} placeholder="18.0" step="0.1" type="number" {...form.register("fatPercent")} />
                </FieldShell>
                <FieldShell error={form.formState.errors.visceralFatLevel?.message} label="Visceral Fat Level">
                  <Input className={controlClassName} placeholder="6" step="1" type="number" {...form.register("visceralFatLevel")} />
                </FieldShell>
                <FieldShell error={form.formState.errors.bmr?.message} label="BMR (kcal)">
                  <Input className={controlClassName} placeholder="1508" step="1" type="number" {...form.register("bmr")} />
                </FieldShell>
                <FieldShell error={form.formState.errors.recommendedCalories?.message} label="Recommended Calories (kcal)">
                  <Input className={controlClassName} placeholder="2140" step="1" type="number" {...form.register("recommendedCalories")} />
                </FieldShell>
              </section>

              <FieldShell className="block" error={form.formState.errors.notes?.message} label="Notes">
                <Textarea className={textareaClassName} placeholder="Optional note about measurement conditions, hydration, or scan confidence." {...form.register("notes")} />
              </FieldShell>

              <section className="space-y-2.5 rounded-[1.4rem] border border-border/80 bg-[linear-gradient(180deg,#f8fbfe_0%,#eff5fa_100%)] p-4 sm:p-4.5">
                <div>
                  <h3 className="font-display text-[1.6rem] text-foreground sm:text-[1.75rem]">Segmental Composition</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">只要填肌肉與脂肪數值，其餘比例會沿用推導結果。沒有填的欄位會使用整體數據推估值。</p>
                </div>

                <div className="grid gap-2.5 lg:grid-cols-2 xl:grid-cols-3">
                  {SEGMENT_PARTS.map((part) => (
                    <div className="rounded-[1.2rem] border border-border/70 bg-white/88 p-3" key={part.key}>
                      <h4 className="text-sm font-semibold text-foreground">{part.label}</h4>
                      <div className="mt-2.5 grid gap-2.5">
                        <FieldShell error={form.formState.errors.segmental?.[part.key]?.muscle?.message} label="Muscle (kg)">
                          <Input className={controlClassName} step="0.01" type="number" {...form.register(`segmental.${part.key}.muscle` as const)} />
                        </FieldShell>
                        <FieldShell error={form.formState.errors.segmental?.[part.key]?.fat?.message} label="Fat (kg)">
                          <Input className={controlClassName} step="0.01" type="number" {...form.register(`segmental.${part.key}.fat` as const)} />
                        </FieldShell>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <div className="shrink-0 border-t border-border/80 bg-white/96 px-5 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-2 sm:px-6">
            <div className="flex flex-wrap justify-end gap-2.5">
              <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
                取消
              </Button>
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? "儲存中..." : initialRecord ? "更新紀錄" : "建立紀錄"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}