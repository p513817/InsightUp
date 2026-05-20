"use client";

import { type Dispatch, type ReactNode, type SetStateAction, useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronDown, CircleHelp, History, LoaderCircle, ScanSearch } from "lucide-react";
import { Controller, type Path, useForm, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { recordToFormValues } from "@/lib/inbody/records";
import {
  recordDraftSchema,
  recordFormSchema,
  type RecordDraftInputValues,
  type RecordDraftValues,
  type RecordFormInputValues,
  type RecordFormValues,
} from "@/lib/inbody/schema";
import { SEGMENT_PARTS, type InbodyRecord } from "@/lib/inbody/types";

interface RecordFormDialogProps {
  open: boolean;
  initialRecord?: InbodyRecord | null;
  latestRecordForAutofill?: InbodyRecord | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: RecordFormValues) => Promise<void>;
}

interface StructuredSummary {
  overview: string;
  keyChanges: string[];
  actionPlan: string[];
  watchouts: string[];
}

interface ScanUsageResponse {
  requestDate: string;
  planCode: string;
  dailyLimit: number | null;
  usageCount: number;
  canScan: boolean;
  message?: string | null;
}

interface ScanResponse extends ScanUsageResponse {
  draft: RecordDraftValues;
  structuredSummary?: StructuredSummary | null;
  uncertaintyNotes?: string[];
  scanConfidence?: number | null;
  modelName?: string | null;
}

type SectionKey = "basic" | "primary" | "additional" | "notes" | "segmental";
type ScanStage = "uploading" | "analyzing" | null;

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

function buildDialogInitialValues(initialRecord?: InbodyRecord | null): RecordFormInputValues {
  return recordToFormValues(initialRecord ?? null);
}

function buildPreviousRecordValues(
  current: RecordFormInputValues,
  latestRecordForAutofill?: InbodyRecord | null,
): RecordFormInputValues | null {
  if (!latestRecordForAutofill) {
    return null;
  }

  const previousValues = recordToFormValues(latestRecordForAutofill);

  return {
    ...previousValues,
    date: current.date,
    notes: current.notes,
    sourceType: "manual",
    isIncludedInCharts: current.isIncludedInCharts,
  };
}

function hasValue(value: unknown) {
  return value !== null && value !== undefined && value !== "";
}

function buildScanNote(summary: StructuredSummary | null | undefined, uncertaintyNotes: string[]) {
  const lines: string[] = [];

  if (summary?.overview) {
    lines.push(`AI 掃描摘要：${summary.overview}`);
  }

  if (uncertaintyNotes.length > 0) {
    lines.push(`待人工確認：${uncertaintyNotes.join("；")}`);
  }

  return lines.length > 0 ? lines.join("\n") : null;
}

function mergeDraftIntoForm(
  current: RecordFormInputValues,
  draft: RecordDraftInputValues | RecordDraftValues,
  scanNote: string | null,
): RecordFormInputValues {
  const parsedDraft = recordDraftSchema.parse(draft);

  return {
    ...current,
    date: parsedDraft.date || current.date,
    height: parsedDraft.height ?? current.height,
    age: parsedDraft.age ?? current.age,
    gender: parsedDraft.gender ?? current.gender,
    score: parsedDraft.score ?? current.score,
    weight: parsedDraft.weight ?? current.weight,
    muscle: parsedDraft.muscle ?? current.muscle,
    fat: parsedDraft.fat ?? current.fat,
    fatPercent: parsedDraft.fatPercent ?? current.fatPercent,
    visceralFatLevel: parsedDraft.visceralFatLevel ?? current.visceralFatLevel,
    bmr: parsedDraft.bmr ?? current.bmr,
    recommendedCalories: parsedDraft.recommendedCalories ?? current.recommendedCalories,
    sourceType: parsedDraft.sourceType ?? "photo_scan",
    isIncludedInCharts: parsedDraft.isIncludedInCharts ?? current.isIncludedInCharts,
    notes: scanNote ?? parsedDraft.notes ?? current.notes,
    segmental: {
      leftArm: {
        muscle: parsedDraft.segmental?.leftArm?.muscle ?? current.segmental.leftArm.muscle,
        fat: parsedDraft.segmental?.leftArm?.fat ?? current.segmental.leftArm.fat,
        muscleRatio: parsedDraft.segmental?.leftArm?.muscleRatio ?? current.segmental.leftArm.muscleRatio,
        fatRatio: parsedDraft.segmental?.leftArm?.fatRatio ?? current.segmental.leftArm.fatRatio,
      },
      rightArm: {
        muscle: parsedDraft.segmental?.rightArm?.muscle ?? current.segmental.rightArm.muscle,
        fat: parsedDraft.segmental?.rightArm?.fat ?? current.segmental.rightArm.fat,
        muscleRatio: parsedDraft.segmental?.rightArm?.muscleRatio ?? current.segmental.rightArm.muscleRatio,
        fatRatio: parsedDraft.segmental?.rightArm?.fatRatio ?? current.segmental.rightArm.fatRatio,
      },
      trunk: {
        muscle: parsedDraft.segmental?.trunk?.muscle ?? current.segmental.trunk.muscle,
        fat: parsedDraft.segmental?.trunk?.fat ?? current.segmental.trunk.fat,
        muscleRatio: parsedDraft.segmental?.trunk?.muscleRatio ?? current.segmental.trunk.muscleRatio,
        fatRatio: parsedDraft.segmental?.trunk?.fatRatio ?? current.segmental.trunk.fatRatio,
      },
      leftLeg: {
        muscle: parsedDraft.segmental?.leftLeg?.muscle ?? current.segmental.leftLeg.muscle,
        fat: parsedDraft.segmental?.leftLeg?.fat ?? current.segmental.leftLeg.fat,
        muscleRatio: parsedDraft.segmental?.leftLeg?.muscleRatio ?? current.segmental.leftLeg.muscleRatio,
        fatRatio: parsedDraft.segmental?.leftLeg?.fatRatio ?? current.segmental.leftLeg.fatRatio,
      },
      rightLeg: {
        muscle: parsedDraft.segmental?.rightLeg?.muscle ?? current.segmental.rightLeg.muscle,
        fat: parsedDraft.segmental?.rightLeg?.fat ?? current.segmental.rightLeg.fat,
        muscleRatio: parsedDraft.segmental?.rightLeg?.muscleRatio ?? current.segmental.rightLeg.muscleRatio,
        fatRatio: parsedDraft.segmental?.rightLeg?.fatRatio ?? current.segmental.rightLeg.fatRatio,
      },
    },
  };
}

function formatUsageText(usageCount: number, dailyLimit: number | null) {
  return `今日已使用 ${usageCount} / ${dailyLimit == null ? "不限" : dailyLimit} 次`;
}

function formatRecordDate(date: string | null | undefined) {
  if (!date) {
    return "尚無紀錄";
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function splitMetaParts(meta: string | null | undefined) {
  if (!meta) {
    return [];
  }

  return meta
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

function FieldShell({
  children,
  label,
  error,
  required,
  className,
}: {
  children: ReactNode;
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

function SelectShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function NumberInputWithAdjust({
  className,
  form,
  name,
  placeholder,
  step,
}: {
  className: string;
  form: UseFormReturn<RecordFormInputValues, unknown, RecordFormValues>;
  name: Path<RecordFormInputValues>;
  placeholder?: string;
  step: number;
}) {
  const precision = String(step).includes(".") ? String(step).split(".")[1].length : 0;

  function adjustValue(direction: -1 | 1) {
    const currentValue = form.getValues(name);
    const base = typeof currentValue === "number" ? currentValue : 0;
    const adjusted = Number((base + direction * step).toFixed(precision));
    form.setValue(name, adjusted as never, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2">
      <Input className={className} placeholder={placeholder} step={step} type="number" {...form.register(name)} />
      <div className="flex items-center gap-1">
        <Button aria-label="減少數值" className="size-8 rounded-[0.8rem]" onClick={() => adjustValue(-1)} size="icon" type="button" variant="outline">
          -
        </Button>
        <Button aria-label="增加數值" className="size-8 rounded-[0.8rem]" onClick={() => adjustValue(1)} size="icon" type="button" variant="outline">
          +
        </Button>
      </div>
    </div>
  );
}

function QuickActionInfo({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <div
      className="relative"
      onMouseEnter={() => onOpenChange(true)}
      onMouseLeave={() => onOpenChange(false)}
    >
      <button
        aria-expanded={open}
        aria-label="查看快速導入說明"
        className="inline-flex size-8 items-center justify-center rounded-full border border-border/80 bg-card text-muted-foreground transition hover:border-primary/40 hover:text-primary"
        onClick={() => onOpenChange(!open)}
        type="button"
      >
        <CircleHelp className="size-4" />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-72 rounded-[1rem] border border-border/80 bg-card/95 p-3 shadow-panel backdrop-blur">
          <p className="text-sm font-semibold text-foreground">快速導入說明</p>
          <div className="mt-2 space-y-2 text-xs leading-5 text-muted-foreground">
            <p>`AI Scan` 會解析看得清楚的欄位，不確定的內容會保留空白。</p>
            <p>`導入前一次紀錄` 會帶入最近一筆數值，保留今天日期與目前備註，適合快速微調。</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RecordFormDialog({ open, initialRecord, latestRecordForAutofill, onOpenChange, onSubmit }: RecordFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStage, setScanStage] = useState<ScanStage>(null);
  const [isLoadingScanStatus, setIsLoadingScanStatus] = useState(false);
  const [scanMeta, setScanMeta] = useState<string | null>(null);
  const [scanUsage, setScanUsage] = useState<ScanUsageResponse | null>(null);
  const [isQuickActionInfoOpen, setIsQuickActionInfoOpen] = useState(false);
  const [isCancelFeedbackVisible, setIsCancelFeedbackVisible] = useState(false);
  const [isSubmitFeedbackVisible, setIsSubmitFeedbackVisible] = useState(false);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    additional: false,
    basic: false,
    notes: false,
    primary: false,
    segmental: false,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentYear = new Date().getFullYear();
  const sectionClassName = "surface-muted-gradient space-y-2 rounded-[1rem] border border-border/80 p-3 sm:p-4";
  const sectionTitleClassName = "text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground";
  const controlClassName =
    "h-10 rounded-[0.9rem] border border-border/80 bg-[linear-gradient(180deg,rgb(var(--card))_0%,rgb(var(--surface))_100%)] px-3.5 shadow-none placeholder:text-muted-foreground/55 focus:border-primary/70 focus:ring-2 focus:ring-primary/15";
  const selectClassName =
    "flex h-10 w-full appearance-none rounded-[0.9rem] border border-border/80 bg-[linear-gradient(180deg,rgb(var(--card))_0%,rgb(var(--surface))_100%)] px-3.5 pr-9 text-sm text-foreground outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/15";
  const textareaClassName =
    "min-h-24 rounded-[0.95rem] border-border/80 bg-[linear-gradient(180deg,rgb(var(--card))_0%,rgb(var(--surface))_100%)] px-3.5 py-2.5 shadow-none placeholder:text-muted-foreground/55 focus:border-primary/70 focus:ring-2 focus:ring-primary/15";
  const footerButtonClassName = "relative overflow-hidden";
  const dialogContentClassName = initialRecord
    ? "!top-[calc(env(safe-area-inset-top)+0.5rem)] !bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] !h-auto !max-h-none !translate-y-0"
    : "!top-1/2 !bottom-auto !h-[66.67dvh] !max-h-[66.67dvh] !-translate-y-1/2";
  const form = useForm<RecordFormInputValues, unknown, RecordFormValues>({
    resolver: zodResolver(recordFormSchema),
    defaultValues: buildDialogInitialValues(initialRecord),
  });
  const watchedValues = form.watch();

  useEffect(() => {
    form.reset(buildDialogInitialValues(initialRecord));
    setScanMeta(null);
  }, [form, initialRecord, open]);

  useEffect(() => {
    if (!open) {
      setIsCancelFeedbackVisible(false);
      setIsSubmitFeedbackVisible(false);
      setIsScanning(false);
      setScanStage(null);
      setIsLoadingScanStatus(false);
      setScanMeta(null);
      setScanUsage(null);
      setIsQuickActionInfoOpen(false);
      setOpenSections({
        additional: false,
        basic: false,
        notes: false,
        primary: false,
        segmental: false,
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open || initialRecord) {
      return;
    }

    let cancelled = false;

    async function loadScanStatus() {
      setIsLoadingScanStatus(true);

      try {
        const response = await fetch("/api/records/scan", { method: "GET" });
        const payload = (await response.json().catch(() => null)) as ScanUsageResponse | { message?: string } | null;

        if (!response.ok) {
          throw new Error(payload?.message || "無法取得 AI Scan 使用狀態。");
        }

        if (!cancelled) {
          setScanUsage(payload as ScanUsageResponse);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "無法取得 AI Scan 使用狀態。");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingScanStatus(false);
        }
      }
    }

    void loadScanStatus();

    return () => {
      cancelled = true;
    };
  }, [initialRecord, open]);

  async function handleSubmit(values: RecordFormValues) {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleScanUpload(file: File) {
    if (scanUsage && !scanUsage.canScan) {
      toast.error(scanUsage.message || "今日 AI Scan 次數已達上限，請明天再試。");
      return;
    }

    setIsScanning(true);
    setScanStage("uploading");
    setScanMeta(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/records/scan", {
        method: "POST",
        body: formData,
      });
      setScanStage("analyzing");

      const payload = (await response.json().catch(() => null)) as ScanResponse | { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message || "掃描解析失敗。");
      }

      const data = payload as ScanResponse;
      const nextValues = mergeDraftIntoForm(
        form.getValues(),
        data.draft,
        buildScanNote(data.structuredSummary, data.uncertaintyNotes ?? []),
      );

      form.reset(nextValues, { keepDefaultValues: false });
      setScanUsage({
        requestDate: data.requestDate,
        planCode: data.planCode,
        dailyLimit: data.dailyLimit,
        usageCount: data.usageCount,
        canScan: data.canScan,
        message: data.canScan ? null : "今日 AI Scan 次數已達上限，請明天再試。",
      });
      setOpenSections({
        additional: true,
        basic: true,
        notes: true,
        primary: true,
        segmental: true,
      });

      const metaParts = [
        data.modelName ? `Gemini ${data.modelName}` : null,
        typeof data.scanConfidence === "number" ? `辨識信心 ${data.scanConfidence}%` : null,
      ].filter(Boolean);
      setScanMeta(metaParts.length > 0 ? metaParts.join(" | ") : "已套用 Gemini 掃描結果");

      if ((data.uncertaintyNotes ?? []).length > 0) {
        toast.warning("部分欄位已保留空白", {
          description: "Gemini 無法確認的內容不會自動填寫，請你再人工補上。",
        });
      } else {
        toast.success("已帶入 InBody 掃描結果");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "掃描解析失敗。");
    } finally {
      setIsScanning(false);
      setScanStage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleImportPreviousRecord() {
    const nextValues = buildPreviousRecordValues(form.getValues(), latestRecordForAutofill);

    if (!nextValues) {
      toast.error("目前沒有可導入的歷史紀錄。");
      return;
    }

    form.reset(nextValues, { keepDefaultValues: false });
    setOpenSections({
      additional: true,
      basic: true,
      notes: true,
      primary: true,
      segmental: true,
    });
    setScanMeta(null);
    toast.success("已帶入前一次紀錄", {
      description: "已保留今天日期與目前備註，其餘數值請再快速檢查一次。",
    });
  }

  function triggerFeedback(setter: Dispatch<SetStateAction<boolean>>) {
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

  const isBasicComplete = hasValue(watchedValues.date);
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
  ].every(hasValue);
  const isNotesComplete = hasValue(watchedValues.notes);
  const isSegmentalComplete = Object.values(watchedValues.segmental).every(
    (part) => hasValue(part.muscle) && hasValue(part.fat) && hasValue(part.muscleRatio) && hasValue(part.fatRatio),
  );
  const canSubmitRecord = isBasicComplete && isPrimaryComplete && isAdditionalComplete && isSegmentalComplete;

  function renderSectionToggle(section: SectionKey, label: string, isComplete: boolean) {
    return (
      <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => toggleSection(section)} type="button">
        <span className="flex items-center gap-2">
          <span className={sectionTitleClassName}>{label}</span>
          {isComplete ? (
            <span className="inline-flex size-4 items-center justify-center rounded-full bg-emerald-500/14 text-emerald-600">
              <Check className="size-3" />
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={
            openSections[section]
              ? "size-4 rotate-180 text-muted-foreground transition-transform duration-200"
              : "size-4 text-muted-foreground transition-transform duration-200"
          }
        />
      </button>
    );
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={`!h-auto max-w-4xl p-0 sm:!top-1/2 sm:!bottom-auto sm:!h-[min(88vh,52rem)] sm:!max-h-[90vh] sm:!-translate-y-1/2 ${dialogContentClassName}`}
        onInteractOutside={(event) => event.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <DialogTitle>{initialRecord ? "編輯 InBody 紀錄" : "新增 InBody 紀錄"}</DialogTitle>
          <DialogDescription className="text-xs leading-5 sm:text-sm sm:leading-6">
            {initialRecord ? "調整數值後儲存即可。" : "可手動輸入、AI Scan，或匯入前一次紀錄。"}
          </DialogDescription>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6 sm:py-4">
            <div className="grid gap-3.5">
              {!initialRecord ? (
                <section className={sectionClassName}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className={sectionTitleClassName}>快速導入</p>
                      <p className="mt-1 text-xs text-muted-foreground">先導入，再人工確認。</p>
                    </div>
                    <QuickActionInfo open={isQuickActionInfoOpen} onOpenChange={setIsQuickActionInfoOpen} />
                  </div>

                  <div className="mt-2.5 grid gap-2.5 sm:mt-3 sm:gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Button
                        className="h-14 w-full justify-start rounded-[1rem] px-4 text-left sm:h-16"
                        disabled={isScanning || isLoadingScanStatus || (scanUsage != null && !scanUsage.canScan)}
                        onClick={() => fileInputRef.current?.click()}
                        type="button"
                        variant="outline"
                      >
                        {isScanning ? <LoaderCircle className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}
                        <span>
                          {scanStage === "uploading"
                            ? "上傳中..."
                            : scanStage === "analyzing"
                              ? "分析中..."
                              : "AI Scan"}
                        </span>
                      </Button>
                      {scanStage === "uploading" ? (
                        <p className="px-1 text-xs leading-5 text-muted-foreground">檔案正在上傳，完成後會自動進入分析。</p>
                      ) : scanStage === "analyzing" ? (
                        <p className="px-1 text-xs leading-5 text-muted-foreground">檔案已送出，Gemini 正在分析內容。</p>
                      ) : isLoadingScanStatus ? (
                        <p className="px-1 text-xs leading-5 text-muted-foreground">正在讀取可用次數...</p>
                      ) : scanUsage ? (
                        <div className="space-y-1.5 px-1">
                          <div className="flex flex-wrap gap-1.5">
                            <span className="inline-flex items-center rounded-full bg-primary/8 px-2.5 py-1 text-[11px] font-medium text-primary">
                              {formatUsageText(scanUsage.usageCount, scanUsage.dailyLimit)}
                            </span>
                            {splitMetaParts(scanMeta).map((part) => (
                              <span
                                className="inline-flex items-center rounded-full bg-foreground/[0.04] px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                                key={part}
                              >
                                {part}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="px-1 text-xs leading-5 text-muted-foreground">尚未取得使用狀態</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Button
                        className="h-14 w-full justify-start rounded-[1rem] px-4 text-left sm:h-16"
                        disabled={!latestRecordForAutofill || isScanning}
                        onClick={handleImportPreviousRecord}
                        type="button"
                        variant="outline"
                      >
                        <History className="size-4" />
                        <span>導入前一次紀錄</span>
                      </Button>
                      <div className="px-1">
                        <span className="inline-flex items-center rounded-full bg-foreground/[0.04] px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                          {latestRecordForAutofill ? `最近一次：${formatRecordDate(latestRecordForAutofill.date)}` : "目前沒有可導入的歷史紀錄"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <input
                    accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleScanUpload(file);
                      }
                    }}
                    ref={fileInputRef}
                    type="file"
                  />
                </section>
              ) : null}

              <section className={sectionClassName}>
                {renderSectionToggle("basic", "基本設定", isBasicComplete)}
                {openSections.basic ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <FieldShell error={form.formState.errors.date?.message} label="日期" required>
                      <Controller
                        control={form.control}
                        name="date"
                        render={({ field }) => {
                          const parts = splitDateParts(field.value);
                          const earliestYear = Math.min(parts.year ? Number(parts.year) : currentYear, currentYear - 20);
                          const yearOptions = Array.from({ length: currentYear - earliestYear + 1 }, (_, index) => String(currentYear - index));
                          const monthOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
                          const dayOptions = Array.from({ length: getDaysInMonth(parts.year, parts.month) }, (_, index) =>
                            String(index + 1).padStart(2, "0"),
                          );

                          function updateDate(nextParts: Partial<typeof parts>) {
                            field.onChange(buildDateValue({ ...parts, ...nextParts }));
                          }

                          return (
                            <div className="space-y-2">
                              <div className="grid grid-cols-3 gap-2">
                                <SelectShell>
                                  <select className={selectClassName} onChange={(event) => updateDate({ year: event.target.value })} value={parts.year}>
                                    <option value="">年</option>
                                    {yearOptions.map((optionYear) => (
                                      <option key={optionYear} value={optionYear}>
                                        {optionYear}
                                      </option>
                                    ))}
                                  </select>
                                </SelectShell>
                                <SelectShell>
                                  <select className={selectClassName} onChange={(event) => updateDate({ month: event.target.value })} value={parts.month}>
                                    <option value="">月</option>
                                    {monthOptions.map((optionMonth) => (
                                      <option key={optionMonth} value={optionMonth}>
                                        {optionMonth}
                                      </option>
                                    ))}
                                  </select>
                                </SelectShell>
                                <SelectShell>
                                  <select className={selectClassName} onChange={(event) => updateDate({ day: event.target.value })} value={parts.day}>
                                    <option value="">日</option>
                                    {dayOptions.map((optionDay) => (
                                      <option key={optionDay} value={optionDay}>
                                        {optionDay}
                                      </option>
                                    ))}
                                  </select>
                                </SelectShell>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <Button className="h-8 rounded-full px-3 text-xs" onClick={() => field.onChange(getRelativeDateValue(0))} type="button" variant="outline">
                                  今天
                                </Button>
                                <Button className="h-8 rounded-full px-3 text-xs" onClick={() => field.onChange(getRelativeDateValue(-1))} type="button" variant="outline">
                                  昨天
                                </Button>
                                <p className="text-xs text-muted-foreground">{field.value ? field.value.replace(/-/g, "/") : "請先選擇日期"}</p>
                              </div>
                            </div>
                          );
                        }}
                      />
                    </FieldShell>

                    <FieldShell label="納入圖表分析">
                      <div className="flex h-10 items-center justify-between rounded-[0.9rem] border border-border/80 bg-[linear-gradient(180deg,rgb(var(--card))_0%,rgb(var(--surface))_100%)] px-3.5">
                        <span className="text-sm text-foreground">這筆資料會出現在圖表中</span>
                        <Controller
                          control={form.control}
                          name="isIncludedInCharts"
                          render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                        />
                      </div>
                    </FieldShell>
                  </div>
                ) : null}
              </section>

              <section className={sectionClassName}>
                {renderSectionToggle("primary", "主要數值", isPrimaryComplete)}
                {openSections.primary ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <FieldShell error={form.formState.errors.weight?.message} label="體重 (kg)" required>
                      <NumberInputWithAdjust className={controlClassName} form={form} name="weight" placeholder="66.1" step={0.1} />
                    </FieldShell>
                    <FieldShell error={form.formState.errors.muscle?.message} label="肌肉量 (kg)" required>
                      <NumberInputWithAdjust className={controlClassName} form={form} name="muscle" placeholder="30.5" step={0.1} />
                    </FieldShell>
                    <FieldShell error={form.formState.errors.fat?.message} label="脂肪量 (kg)" required>
                      <NumberInputWithAdjust className={controlClassName} form={form} name="fat" placeholder="11.9" step={0.1} />
                    </FieldShell>
                    <FieldShell error={form.formState.errors.fatPercent?.message} label="體脂率 (%)" required>
                      <NumberInputWithAdjust className={controlClassName} form={form} name="fatPercent" placeholder="18.0" step={0.1} />
                    </FieldShell>
                  </div>
                ) : null}
              </section>

              <section className={sectionClassName}>
                {renderSectionToggle("additional", "補充數值", isAdditionalComplete)}
                {openSections.additional ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <FieldShell error={form.formState.errors.height?.message} label="身高 (cm)">
                      <NumberInputWithAdjust className={controlClassName} form={form} name="height" placeholder="170" step={0.1} />
                    </FieldShell>
                    <FieldShell error={form.formState.errors.age?.message} label="年齡">
                      <NumberInputWithAdjust className={controlClassName} form={form} name="age" placeholder="29" step={1} />
                    </FieldShell>
                    <FieldShell error={form.formState.errors.gender?.message} label="性別">
                      <SelectShell>
                        <select className={selectClassName} {...form.register("gender")}>
                          <option value="unknown">未知</option>
                          <option value="male">男性</option>
                          <option value="female">女性</option>
                          <option value="other">其他</option>
                        </select>
                      </SelectShell>
                    </FieldShell>
                    <FieldShell error={form.formState.errors.score?.message} label="InBody 分數">
                      <NumberInputWithAdjust className={controlClassName} form={form} name="score" placeholder="81" step={1} />
                    </FieldShell>
                    <FieldShell error={form.formState.errors.visceralFatLevel?.message} label="內臟脂肪等級">
                      <NumberInputWithAdjust className={controlClassName} form={form} name="visceralFatLevel" placeholder="6" step={1} />
                    </FieldShell>
                    <FieldShell error={form.formState.errors.bmr?.message} label="基礎代謝率 (kcal)">
                      <NumberInputWithAdjust className={controlClassName} form={form} name="bmr" placeholder="1508" step={1} />
                    </FieldShell>
                    <FieldShell error={form.formState.errors.recommendedCalories?.message} label="建議熱量 (kcal)">
                      <NumberInputWithAdjust className={controlClassName} form={form} name="recommendedCalories" placeholder="2140" step={1} />
                    </FieldShell>
                  </div>
                ) : null}
              </section>

              <section className={sectionClassName}>
                {renderSectionToggle("segmental", "部位數值", isSegmentalComplete)}
                {openSections.segmental ? (
                  <div className="grid gap-2.5 lg:grid-cols-2 xl:grid-cols-3">
                    {SEGMENT_PARTS.map((part) => (
                      <div className="grid gap-2.5" key={part.key}>
                        <h4 className="text-sm font-semibold text-foreground">{part.label}</h4>
                        <div className="grid gap-2.5">
                          <FieldShell error={form.formState.errors.segmental?.[part.key]?.muscle?.message} label="肌肉量 (kg)">
                            <NumberInputWithAdjust className={controlClassName} form={form} name={`segmental.${part.key}.muscle` as const} step={0.01} />
                          </FieldShell>
                          <FieldShell error={form.formState.errors.segmental?.[part.key]?.fat?.message} label="脂肪量 (kg)">
                            <NumberInputWithAdjust className={controlClassName} form={form} name={`segmental.${part.key}.fat` as const} step={0.01} />
                          </FieldShell>
                          <FieldShell error={form.formState.errors.segmental?.[part.key]?.muscleRatio?.message} label="肌肉比例 (%)">
                            <NumberInputWithAdjust className={controlClassName} form={form} name={`segmental.${part.key}.muscleRatio` as const} step={0.1} />
                          </FieldShell>
                          <FieldShell error={form.formState.errors.segmental?.[part.key]?.fatRatio?.message} label="脂肪比例 (%)">
                            <NumberInputWithAdjust className={controlClassName} form={form} name={`segmental.${part.key}.fatRatio` as const} step={0.1} />
                          </FieldShell>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className={sectionClassName}>
                {renderSectionToggle("notes", "備註", isNotesComplete)}
                {openSections.notes ? (
                  <FieldShell className="block" error={form.formState.errors.notes?.message} label="備註">
                    <Textarea
                      className={textareaClassName}
                      placeholder="例如：今天訓練狀態、飲食調整、AI 掃描後需要人工補上的欄位，或其他觀察紀錄。"
                      {...form.register("notes")}
                    />
                  </FieldShell>
                ) : null}
              </section>
            </div>
          </div>

          <div className="shrink-0 border-t border-border/80 bg-card/96 px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] sm:px-6 sm:pt-2 sm:pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
            <div className="flex flex-wrap justify-end gap-2.5">
              <Button className={footerButtonClassName} onClick={handleCancelClick} type="button" variant="outline">
                <span
                  aria-hidden
                  className={
                    isCancelFeedbackVisible
                      ? "pointer-events-none absolute inset-0 rounded-[0.9rem] bg-[radial-gradient(circle_at_center,rgb(var(--brand-sky-50)/0.3)_0%,rgb(var(--brand-sky-400)/0.18)_34%,transparent_74%)] opacity-100 scale-100 transition duration-200"
                      : "pointer-events-none absolute inset-0 rounded-[0.9rem] bg-[radial-gradient(circle_at_center,rgb(var(--brand-sky-50)/0.3)_0%,rgb(var(--brand-sky-400)/0.18)_34%,transparent_74%)] opacity-0 scale-[0.8] transition duration-200"
                  }
                />
                <span className="relative z-10">取消</span>
              </Button>
              <Button
                className={footerButtonClassName}
                disabled={isSubmitting || isScanning || !canSubmitRecord}
                onClick={handleSubmitPress}
                type="submit"
              >
                <span
                  aria-hidden
                  className={
                    isSubmitFeedbackVisible
                      ? "pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgb(var(--brand-sky-50)/0.36)_0%,rgb(var(--brand-mint-300)/0.24)_34%,transparent_76%)] opacity-100 scale-100 transition duration-200"
                      : "pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgb(var(--brand-sky-50)/0.36)_0%,rgb(var(--brand-mint-300)/0.24)_34%,transparent_76%)] opacity-0 scale-[0.8] transition duration-200"
                  }
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
