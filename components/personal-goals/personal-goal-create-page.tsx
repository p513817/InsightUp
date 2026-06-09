"use client";

import { useMemo, useState } from "react";
import { Check, Minus, Plus, Target, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocale, useTranslations } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FAB_BASE_CLASS,
  FAB_OUTLINE_TONE_CLASS,
  FAB_PRIMARY_TONE_CLASS,
} from "@/components/ui/floating-action-styles";
import {
  getLatestMetricValue,
  PERSONAL_GOAL_METRICS,
  type PersonalGoal,
  type PersonalGoalMetric,
  type PersonalGoalMetricKey,
} from "@/lib/personal-goals";
import type { InbodyRecord } from "@/lib/inbody/types";
import { formatCompactDate } from "@/lib/presentation";
import { cn } from "@/lib/utils";

interface PersonalGoalCreatePageProps {
  latestRecord: InbodyRecord | null;
  records: InbodyRecord[];
  mode?: "create" | "edit";
  initialGoals?: PersonalGoal[];
}

type CreateGoalResponse = {
  goals?: PersonalGoal[];
  goal?: PersonalGoal;
};

type GoalDraft = {
  id?: string;
  metricKey: PersonalGoalMetricKey;
  startValue: number;
  targetValue: number;
};

function formatValue(value: number | null, unit: string) {
  if (value == null) {
    return "-";
  }

  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} ${unit}`;
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

function getDefaultTargetValue(currentValue: number, metric: PersonalGoalMetric) {
  const direction = metric.key === "fat" || metric.key === "fatPercent" || metric.key === "visceralFatLevel" ? -1 : 1;
  return Number((currentValue + direction * metric.step).toFixed(metric.step < 1 ? 1 : 0));
}

function getDateValue(offsetDays = 0, baseDateValue?: string | null) {
  const date = baseDateValue ? new Date(`${baseDateValue}T12:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) {
    date.setTime(Date.now());
  }
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);

  return [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

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

function formatDelta(startValue: number, targetValue: number, unit: string) {
  const delta = targetValue - startValue;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toLocaleString("en-US", { maximumFractionDigits: 1 })} ${unit}`;
}

export function PersonalGoalCreatePage({
  latestRecord,
  records,
  mode = "create",
  initialGoals = [],
}: PersonalGoalCreatePageProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const isEditMode = mode === "edit";
  const defaultStartRecordId = initialGoals.find((goal) => goal.startRecordId)?.startRecordId || latestRecord?.id || records.at(-1)?.id || "";
  const defaultStartRecord = records.find((record) => record.id === defaultStartRecordId) || latestRecord;
  const [title, setTitle] = useState(() => initialGoals.find((goal) => goal.title)?.title || "");
  const [selectedStartRecordId, setSelectedStartRecordId] = useState(() => defaultStartRecordId);
  const [drafts, setDrafts] = useState<Partial<Record<PersonalGoalMetricKey, GoalDraft>>>(() => {
    if (!isEditMode) {
      return {};
    }

    return initialGoals.reduce<Partial<Record<PersonalGoalMetricKey, GoalDraft>>>((next, goal) => {
      next[goal.metricKey] = {
        id: goal.id,
        metricKey: goal.metricKey,
        startValue: goal.startValue,
        targetValue: goal.targetValue,
      };
      return next;
    }, {});
  });
  const [targetDate, setTargetDate] = useState(() => initialGoals[0]?.targetDate || getDateValue(90, defaultStartRecord?.date));
  const [isSaving, setIsSaving] = useState(false);
  const currentYear = new Date().getFullYear();
  const targetDateParts = splitDateParts(targetDate);
  const earliestYear = Math.min(targetDateParts.year ? Number(targetDateParts.year) : currentYear, currentYear);
  const latestYear = Math.max(targetDateParts.year ? Number(targetDateParts.year) : currentYear + 5, currentYear + 5);
  const yearOptions = Array.from({ length: latestYear - earliestYear + 1 }, (_, index) => String(earliestYear + index));
  const monthOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
  const dayOptions = Array.from({ length: getDaysInMonth(targetDateParts.year, targetDateParts.month) }, (_, index) =>
    String(index + 1).padStart(2, "0"),
  );

  const selectedDrafts = useMemo(
    () => PERSONAL_GOAL_METRICS.map((metric) => ({ draft: drafts[metric.key], metric })).filter((entry): entry is { draft: GoalDraft; metric: PersonalGoalMetric } => Boolean(entry.draft)),
    [drafts],
  );
  const selectedGoalCount = selectedDrafts.length;
  const selectedStartRecord = records.find((record) => record.id === selectedStartRecordId) || latestRecord;

  function returnToGoals() {
    router.replace("/personal-goal");
  }

  function updateTargetDate(nextParts: Partial<typeof targetDateParts>) {
    setTargetDate(buildDateValue({ ...targetDateParts, ...nextParts }));
  }

  function updateStartRecord(recordId: string) {
    const nextRecord = records.find((record) => record.id === recordId) || null;
    setSelectedStartRecordId(recordId);

    if (!nextRecord) {
      return;
    }

    setTargetDate(getDateValue(90, nextRecord.date));

    setDrafts((current) => {
      const next = { ...current };

      for (const metric of PERSONAL_GOAL_METRICS) {
        const draft = next[metric.key];
        const startValue = getLatestMetricValue(nextRecord, metric.key);

        if (draft && startValue != null) {
          next[metric.key] = {
            ...draft,
            startValue,
          };
        }
      }

      return next;
    });
  }

  function toggleMetric(metric: PersonalGoalMetric) {
    if (isEditMode) {
      return;
    }

    const currentValue = getLatestMetricValue(selectedStartRecord, metric.key);

    setDrafts((current) => {
      if (current[metric.key]) {
        const next = { ...current };
        delete next[metric.key];
        return next;
      }

      if (currentValue == null) {
        toast.error(t("personalGoal.form.missingLatestValue"));
        return current;
      }

      return {
        ...current,
        [metric.key]: {
          metricKey: metric.key,
          startValue: currentValue,
          targetValue: getDefaultTargetValue(currentValue, metric),
        },
      };
    });
  }

  function updateDraftTarget(metric: PersonalGoalMetric, nextValue: number | null) {
    setDrafts((current) => {
      const draft = current[metric.key];

      if (!draft || nextValue == null) {
        return current;
      }

      return {
        ...current,
        [metric.key]: {
          ...draft,
          targetValue: nextValue,
        },
      };
    });
  }

  function adjustTarget(metric: PersonalGoalMetric, direction: -1 | 1) {
    const draft = drafts[metric.key];

    if (!draft) {
      return;
    }

    const precision = metric.step < 1 ? 1 : 0;
    updateDraftTarget(metric, Number((draft.targetValue + direction * metric.step).toFixed(precision)));
  }

  async function saveGoal() {
    const normalizedTitle = title.trim();
    const goals = selectedDrafts.map(({ draft }) => ({
      ...draft,
      title: normalizedTitle || null,
      startRecordId: selectedStartRecordId || null,
      targetDate: targetDate || null,
    }));

    if (!goals.length) {
      toast.error(t("personalGoal.form.missingLatestValue"));
      return;
    }

    setIsSaving(true);
    try {
      if (isEditMode) {
        await Promise.all(
          goals.map((goal) => {
            if (!goal.id) {
              throw new Error("Missing goal id.");
            }

            return requestJson<{ goal: PersonalGoal }>(`/api/personal-goals/${goal.id}`, {
              method: "PATCH",
              body: JSON.stringify({
                targetValue: goal.targetValue,
                startValue: goal.startValue,
                startRecordId: selectedStartRecordId || null,
                title: normalizedTitle || null,
                targetDate: targetDate || null,
              }),
            });
          }),
        );
        toast.success(t("personalGoal.form.updateSuccess"));
      } else {
        await requestJson<CreateGoalResponse>("/api/personal-goals", {
          method: "POST",
          body: JSON.stringify({
            goals,
            targetDate,
          }),
        });
        toast.success(t("personalGoal.form.saveSuccess"));
      }

      router.refresh();
      returnToGoals();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : isEditMode ? t("personalGoal.form.updateError") : t("personalGoal.form.saveError"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 pb-24 pt-1 sm:gap-4 sm:pb-28 sm:pt-3">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl leading-tight text-foreground sm:text-3xl">
            {isEditMode ? t("personalGoal.form.editTitle") : t("personalGoal.form.title")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {isEditMode ? t("personalGoal.form.editDescription") : t("personalGoal.form.description")}
          </p>
        </div>
      </header>

      <section className="surface-muted-gradient rounded-[1rem] border border-border/80 p-2.5 sm:p-3">
        <div className="grid gap-3">
        <label className="block">
          <span className="px-1 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("personalGoal.form.goalTitle")}
          </span>
          <Input
            className="mt-2 h-11 rounded-[0.9rem] border-border/80 bg-[linear-gradient(180deg,rgb(var(--card))_0%,rgb(var(--surface))_100%)] shadow-none"
            maxLength={80}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("personalGoal.form.goalTitlePlaceholder")}
            value={title}
          />
        </label>
        <label className="block">
          <span className="px-1 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("personalGoal.form.startRecord")}
          </span>
          <select
            className="mt-2 flex h-11 w-full appearance-none rounded-[0.9rem] border border-border/80 bg-[linear-gradient(180deg,rgb(var(--card))_0%,rgb(var(--surface))_100%)] px-3.5 text-sm text-foreground outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/15"
            onChange={(event) => updateStartRecord(event.target.value)}
            value={selectedStartRecordId}
          >
            {records.length === 0 ? (
              <option value="">{t("personalGoal.form.noStartRecord")}</option>
            ) : null}
            {[...records].reverse().map((record) => (
              <option key={record.id} value={record.id}>
                {formatCompactDate(record.date, locale)}
              </option>
            ))}
          </select>
        </label>
        <div>
          <p className="px-1 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("personalGoal.form.targetDate")}</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <select
              className="h-10 rounded-[0.75rem] border border-border/80 bg-card px-2 text-sm text-foreground outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/15"
              onChange={(event) => updateTargetDate({ year: event.target.value })}
              value={targetDateParts.year}
            >
              <option value="">{t("personalGoal.form.year")}</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-[0.75rem] border border-border/80 bg-card px-2 text-sm text-foreground outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/15"
              onChange={(event) => updateTargetDate({ month: event.target.value })}
              value={targetDateParts.month}
            >
              <option value="">{t("personalGoal.form.month")}</option>
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-[0.75rem] border border-border/80 bg-card px-2 text-sm text-foreground outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/15"
              onChange={(event) => updateTargetDate({ day: event.target.value })}
              value={targetDateParts.day}
            >
              <option value="">{t("personalGoal.form.day")}</option>
              {dayOptions.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Button className="h-8 rounded-full px-3 text-xs" onClick={() => setTargetDate(getDateValue(60, selectedStartRecord?.date))} type="button" variant="outline">
              {t("personalGoal.form.in60Days")}
            </Button>
            <Button className="h-8 rounded-full px-3 text-xs" onClick={() => setTargetDate(getDateValue(90, selectedStartRecord?.date))} type="button" variant="outline">
              {t("personalGoal.form.in90Days")}
            </Button>
            <Button className="h-8 rounded-full px-3 text-xs" onClick={() => setTargetDate(getDateValue(120, selectedStartRecord?.date))} type="button" variant="outline">
              {t("personalGoal.form.in120Days")}
            </Button>
            <Button className="h-8 rounded-full px-3 text-xs" onClick={() => setTargetDate(getDateValue(180, selectedStartRecord?.date))} type="button" variant="outline">
              {t("personalGoal.form.in180Days")}
            </Button>
          </div>
        </div>
        </div>
      </section>

      <section className="surface-muted-gradient rounded-[1rem] border border-border/80 p-2.5 sm:p-3">
        <div className="flex items-center justify-between gap-3 px-1 pb-2">
          <p className="text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("personalGoal.form.metricSection")}
          </p>
          {selectedGoalCount > 0 ? (
            <p className="truncate text-xs text-muted-foreground">
              {t("personalGoal.form.selectedCount", { count: selectedGoalCount })}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {PERSONAL_GOAL_METRICS.map((metric) => {
            const draft = drafts[metric.key];
            const isSelected = Boolean(draft);

            return (
              <button
                className={cn(
                  "inline-flex min-h-11 max-w-full cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-left transition hover:border-accent/70 hover:bg-accent/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                  isSelected ? "border-accent/70 bg-accent/12 shadow-[inset_0_0_0_1px_rgb(var(--accent)/0.16)]" : "border-border/70 bg-white/58",
                  isEditMode ? "cursor-default opacity-80 hover:border-border/70 hover:bg-white/58" : "",
                )}
                disabled={isEditMode}
                key={metric.key}
                onClick={() => toggleMetric(metric)}
                type="button"
              >
                <span className="min-w-0 truncate text-sm font-semibold text-foreground">{t(`personalGoal.metrics.${metric.key}`)}</span>
                {isSelected ? (
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent/18 text-accent-strong">
                    <Check className="size-3.5" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-3 rounded-[0.95rem] border border-border/70 bg-white/64 p-3">
          {selectedDrafts.length ? (
            <div className="space-y-1.5">
              {selectedDrafts.map(({ draft, metric }) => (
                <div
                  className="rounded-[0.8rem] border border-border/70 bg-white/70 px-2 py-2"
                  key={metric.key}
                >
                  <div className="flex min-w-0 items-baseline gap-1.5">
                    <p className="truncate text-sm font-semibold text-foreground">{t(`personalGoal.metrics.${metric.key}`)}</p>
                    <p className="shrink-0 text-sm font-semibold text-foreground">{formatValue(draft.startValue, metric.unit)}</p>
                    <p className="shrink-0 text-xs font-semibold text-accent-strong">({formatDelta(draft.startValue, draft.targetValue, metric.unit)})</p>
                  </div>
                  <div className="mt-1.5 min-w-0">
                    <div className="grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-1">
                      <button
                        aria-label={t("personalGoal.form.decrease")}
                        className="grid size-8 cursor-pointer place-items-center rounded-full border border-border/70 bg-card text-muted-foreground transition hover:border-accent/60 hover:text-foreground"
                        onClick={() => adjustTarget(metric, -1)}
                        type="button"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <Input
                        aria-label={t("personalGoal.form.targetValue")}
                        className="h-11 min-w-0 rounded-[0.75rem] px-2 text-center"
                        onChange={(event) => {
                          const parsed = Number(event.target.value);
                          updateDraftTarget(metric, Number.isFinite(parsed) ? parsed : null);
                        }}
                        step={metric.step}
                        type="number"
                        value={draft.targetValue}
                      />
                      <button
                        aria-label={t("personalGoal.form.increase")}
                        className="grid size-8 cursor-pointer place-items-center rounded-full border border-border/70 bg-card text-muted-foreground transition hover:border-accent/60 hover:text-foreground"
                        onClick={() => adjustTarget(metric, 1)}
                        type="button"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="surface-state-panel flex flex-col items-center gap-2 rounded-[0.95rem] p-5 text-center">
              <Target className="size-5 text-accent-strong" />
              <p className="text-sm font-semibold text-foreground">{t("personalGoal.form.chooseMetricTitle")}</p>
              <p className="max-w-md text-xs leading-5 text-muted-foreground">{t("personalGoal.form.chooseMetricDescription")}</p>
            </div>
          )}
        </div>
      </section>

      <div className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-40 sm:inset-x-7 sm:bottom-7">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
        <Button
          aria-label={t("common.cancel")}
          className={cn("pointer-events-auto relative", FAB_BASE_CLASS, FAB_OUTLINE_TONE_CLASS)}
          onClick={returnToGoals}
          title={t("common.cancel")}
          type="button"
          variant="outline"
        >
          <X className="relative z-10 size-6" />
        </Button>
        <Button
          aria-label={isEditMode ? t("personalGoal.form.update") : t("personalGoal.form.save")}
          className={cn("pointer-events-auto", FAB_BASE_CLASS, FAB_PRIMARY_TONE_CLASS)}
          disabled={isSaving || selectedGoalCount === 0}
          onClick={saveGoal}
          title={isEditMode ? t("personalGoal.form.update") : t("personalGoal.form.save")}
          type="button"
        >
          {isSaving ? <span className="relative z-10 size-6 animate-spin rounded-full border-2 border-white/50 border-t-white" /> : <Check className="relative z-10 size-6" />}
        </Button>
        </div>
      </div>
    </div>
  );
}
