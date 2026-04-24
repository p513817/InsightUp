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
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        <span>{label}</span>
        {required ? <span className="text-[#a44635]">*</span> : null}
      </div>
      {children}
      <p className="mt-2 min-h-5 text-xs text-[#a44635]">{error || " "}</p>
    </label>
  );
}

export function RecordFormDialog({ open, initialRecord, onOpenChange, onSubmit }: RecordFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialRecord ? "編輯 InBody 紀錄" : "新增 InBody 紀錄"}</DialogTitle>
          <DialogDescription>
            統一在同一個表單裡管理整體指標、segmental 值與 chart inclusion 設定。空白的 segmental 欄位會回退到推導值。
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-6 overflow-y-auto px-6 py-5" onSubmit={form.handleSubmit(handleSubmit)}>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FieldShell error={form.formState.errors.date?.message} label="Date" required>
              <Input type="date" {...form.register("date")} />
            </FieldShell>

            <FieldShell error={form.formState.errors.sourceType?.message} label="Source">
              <select className="flex h-11 w-full rounded-2xl border border-border bg-[#fffaf2] px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" {...form.register("sourceType")}> 
                <option value="manual">Manual entry</option>
                <option value="photo_scan">Photo scan review</option>
              </select>
            </FieldShell>

            <FieldShell label="Include in chart">
              <div className="flex h-11 items-center justify-between rounded-2xl border border-border bg-[#fffaf2] px-4">
                <span className="text-sm text-foreground">Keep this record in chart analysis</span>
                <Controller
                  control={form.control}
                  name="isIncludedInCharts"
                  render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                />
              </div>
            </FieldShell>

            <FieldShell error={form.formState.errors.height?.message} label="Height (cm)">
              <Input placeholder="170" step="0.1" type="number" {...form.register("height")} />
            </FieldShell>
            <FieldShell error={form.formState.errors.age?.message} label="Age">
              <Input placeholder="29" step="1" type="number" {...form.register("age")} />
            </FieldShell>
            <FieldShell error={form.formState.errors.gender?.message} label="Gender">
              <select className="flex h-11 w-full rounded-2xl border border-border bg-[#fffaf2] px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" {...form.register("gender")}> 
                <option value="unknown">Unknown</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </FieldShell>
            <FieldShell error={form.formState.errors.score?.message} label="InBody Score">
              <Input placeholder="81" step="1" type="number" {...form.register("score")} />
            </FieldShell>
            <FieldShell error={form.formState.errors.weight?.message} label="Weight (kg)" required>
              <Input placeholder="66.1" step="0.1" type="number" {...form.register("weight")} />
            </FieldShell>
            <FieldShell error={form.formState.errors.muscle?.message} label="Muscle (kg)" required>
              <Input placeholder="30.5" step="0.1" type="number" {...form.register("muscle")} />
            </FieldShell>
            <FieldShell error={form.formState.errors.fat?.message} label="Fat (kg)" required>
              <Input placeholder="11.9" step="0.1" type="number" {...form.register("fat")} />
            </FieldShell>
            <FieldShell error={form.formState.errors.fatPercent?.message} label="Fat Percentage (%)" required>
              <Input placeholder="18.0" step="0.1" type="number" {...form.register("fatPercent")} />
            </FieldShell>
            <FieldShell error={form.formState.errors.visceralFatLevel?.message} label="Visceral Fat Level">
              <Input placeholder="6" step="1" type="number" {...form.register("visceralFatLevel")} />
            </FieldShell>
            <FieldShell error={form.formState.errors.bmr?.message} label="BMR (kcal)">
              <Input placeholder="1508" step="1" type="number" {...form.register("bmr")} />
            </FieldShell>
            <FieldShell error={form.formState.errors.recommendedCalories?.message} label="Recommended Calories (kcal)">
              <Input placeholder="2140" step="1" type="number" {...form.register("recommendedCalories")} />
            </FieldShell>
          </section>

          <FieldShell className="block" error={form.formState.errors.notes?.message} label="Notes">
            <Textarea placeholder="Optional note about measurement conditions, hydration, or scan confidence." {...form.register("notes")} />
          </FieldShell>

          <section className="space-y-4 rounded-[1.75rem] border border-border bg-[#fbf6ee] p-5">
            <div>
              <h3 className="font-display text-2xl text-foreground">Segmental Composition</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">只要填肌肉與脂肪數值，其餘比例會沿用推導結果。沒有填的欄位會使用整體數據推估值。</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {SEGMENT_PARTS.map((part) => (
                <div className="rounded-[1.5rem] border border-border/70 bg-card p-4" key={part.key}>
                  <h4 className="text-sm font-semibold text-foreground">{part.label}</h4>
                  <div className="mt-4 grid gap-4">
                    <FieldShell error={form.formState.errors.segmental?.[part.key]?.muscle?.message} label="Muscle (kg)">
                      <Input step="0.01" type="number" {...form.register(`segmental.${part.key}.muscle` as const)} />
                    </FieldShell>
                    <FieldShell error={form.formState.errors.segmental?.[part.key]?.fat?.message} label="Fat (kg)">
                      <Input step="0.01" type="number" {...form.register(`segmental.${part.key}.fat` as const)} />
                    </FieldShell>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap justify-end gap-3 border-t border-border pb-1 pt-2">
            <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
              取消
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "儲存中..." : initialRecord ? "更新紀錄" : "建立紀錄"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}