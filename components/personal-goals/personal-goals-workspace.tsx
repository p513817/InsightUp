"use client";

import { CheckCircle2, ChevronDown, Pencil, Plus, Target, Trash2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { useLocale, useTranslations } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { StatsScrollbarRow } from "@/components/ui/stats-scrollbar-row";
import type { PersonalGoal } from "@/lib/personal-goals";
import type { InbodyRecord } from "@/lib/inbody/types";
import { formatCompactDate } from "@/lib/presentation";

interface PersonalGoalsWorkspaceProps {
  goals: PersonalGoal[];
  latestRecord: InbodyRecord | null;
  records: InbodyRecord[];
}

type PersonalGoalGroup = {
  key: string;
  title: string | null;
  startRecordId: string | null;
  startRecordDate: string | null;
  referenceRecordDate: string | null;
  goals: PersonalGoal[];
  progressPercent: number;
  isCompleted: boolean;
  isExpired: boolean;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
};

type GoalCardVariant = "active" | "history";

function formatValue(value: number | null, unit: string) {
  if (value == null) {
    return "-";
  }

  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} ${unit}`;
}

function getGoalGroupKey(goal: PersonalGoal) {
  const titleKey = goal.title || "untitled";
  const startRecordKey = goal.startRecordId || "legacy";
  const dateKey = goal.targetDate ? `target:${goal.targetDate}` : `created:${goal.createdAt.slice(0, 10)}`;
  return `${titleKey}:${startRecordKey}:${dateKey}`;
}

function getProgressBarWidth(progressPercent: number) {
  return `${Math.max(0, Math.min(100, progressPercent))}%`;
}

function getProgressToneClass(progressPercent: number) {
  if (progressPercent <= 33) {
    return "bg-[#ef4444]";
  }

  if (progressPercent <= 66) {
    return "bg-[#f59e0b]";
  }

  return "bg-[#22c55e]";
}

function getProgressToneTextClass(progressPercent: number) {
  if (progressPercent <= 33) {
    return "text-[#ef4444]";
  }

  if (progressPercent <= 66) {
    return "text-[#f59e0b]";
  }

  return "text-[#22c55e]";
}

function getProgressToneIconClass(progressPercent: number) {
  if (progressPercent <= 33) {
    return "text-[#ef4444]";
  }

  if (progressPercent <= 66) {
    return "text-[#f59e0b]";
  }

  return "text-[#22c55e]";
}

const PROGRESS_ROW_CLASS = "-mx-3 mt-3 grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-2";

function compareTargetDatesDesc(left: string | null, right: string | null) {
  if (left && right) {
    return right.localeCompare(left);
  }

  if (left) {
    return -1;
  }

  if (right) {
    return 1;
  }

  return 0;
}

function isPastTargetDate(targetDate: string | null) {
  if (!targetDate) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${targetDate}T00:00:00`);

  if (Number.isNaN(target.getTime())) {
    return false;
  }

  return target.getTime() < today.getTime();
}

function buildGoalGroups(goals: PersonalGoal[], records: InbodyRecord[]): PersonalGoalGroup[] {
  const groupMap = new Map<string, PersonalGoal[]>();
  const recordDateMap = new Map(records.map((record) => [record.id, record.date] as const));

  for (const goal of goals) {
    const key = getGoalGroupKey(goal);
    groupMap.set(key, [...(groupMap.get(key) || []), goal]);
  }

  return Array.from(groupMap.entries())
    .map(([key, groupGoals]) => {
      const createdAt = groupGoals.reduce((oldest, goal) => (
        new Date(goal.createdAt).getTime() < new Date(oldest).getTime() ? goal.createdAt : oldest
      ), groupGoals[0]?.createdAt || "");
      const updatedAt = groupGoals.reduce((latest, goal) => (
        new Date(goal.updatedAt).getTime() > new Date(latest).getTime() ? goal.updatedAt : latest
      ), groupGoals[0]?.updatedAt || "");
      const progressPercent = Math.round(
        groupGoals.reduce((total, goal) => total + goal.progressPercent, 0) / Math.max(groupGoals.length, 1),
      );
      const targetDate = groupGoals[0]?.targetDate ?? null;
      const startRecordId = groupGoals.find((goal) => goal.startRecordId)?.startRecordId ?? null;

      return {
        key,
        title: groupGoals.find((goal) => goal.title)?.title ?? null,
        startRecordId,
        startRecordDate: startRecordId ? recordDateMap.get(startRecordId) ?? null : null,
        goals: groupGoals,
        referenceRecordDate: groupGoals[0]?.referenceRecordDate ?? null,
        progressPercent,
        isCompleted: groupGoals.every((goal) => goal.isAchieved),
        isExpired: isPastTargetDate(targetDate),
        targetDate,
        createdAt,
        updatedAt,
      };
    })
    .sort((a, b) => {
      const targetDateOrder = compareTargetDatesDesc(a.targetDate, b.targetDate);
      if (targetDateOrder !== 0) {
        return targetDateOrder;
      }

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
}

export function PersonalGoalsWorkspace({ goals, latestRecord, records }: PersonalGoalsWorkspaceProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [pendingGroupKey, setPendingGroupKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isRefreshing, startTransition] = useTransition();
  const [expandedHistoryKeys, setExpandedHistoryKeys] = useState<string[]>([]);
  const hasGoals = goals.length > 0;
  const goalGroups = buildGoalGroups(goals, records);
  const activeGroups = goalGroups.filter((group) => !group.isCompleted && !group.isExpired);
  const completedGroups = goalGroups.filter((group) => group.isCompleted || group.isExpired);

  function openCreatePage() {
    router.push("/personal-goal/new");
  }

  function editGroup(group: PersonalGoalGroup) {
    const params = new URLSearchParams({ ids: group.goals.map((goal) => goal.id).join(",") });
    router.push(`/personal-goal/edit?${params.toString()}`);
  }

  function toggleHistoryGroup(groupKey: string) {
    setExpandedHistoryKeys((current) =>
      current.includes(groupKey) ? current.filter((key) => key !== groupKey) : [...current, groupKey],
    );
  }

  async function deleteGroup(group: PersonalGoalGroup) {
    if (!window.confirm(t("personalGoal.list.confirmDelete"))) {
      return;
    }

    setPendingGroupKey(group.key);
    setFeedback(null);

    try {
      const responses = await Promise.all(
        group.goals.map((goal) => fetch(`/api/personal-goals/${goal.id}`, { method: "DELETE" })),
      );

      if (responses.some((response) => !response.ok)) {
        throw new Error("Failed to delete goal");
      }

      startTransition(() => router.refresh());
    } catch {
      setFeedback(t("personalGoal.list.deleteError"));
    } finally {
      setPendingGroupKey(null);
    }
  }

function getGroupTitle(group: PersonalGoalGroup) {
    if (group.title) {
      return group.title;
    }

    if (group.targetDate) {
      return t("personalGoal.list.groupTitleWithDate", { date: formatCompactDate(group.targetDate, locale) });
    }

  return t("personalGoal.list.groupTitleFallback");
}

type GoalCardProps = {
  group: PersonalGoalGroup;
  variant: GoalCardVariant;
  isBusy: boolean;
  isExpanded: boolean;
  onToggle?: () => void;
  onEdit: (group: PersonalGoalGroup) => void;
  onDelete: (group: PersonalGoalGroup) => void;
  renderGoalItem: (goal: PersonalGoal) => ReactNode;
  t: ReturnType<typeof useTranslations>;
  locale: string;
};

function GoalCard({
  group,
  variant,
  isBusy,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  renderGoalItem,
  t,
  locale,
}: GoalCardProps) {
  const progressToneClass = getProgressToneClass(group.progressPercent);
  const progressToneTextClass = getProgressToneTextClass(group.progressPercent);
  const progressToneIconClass = getProgressToneIconClass(group.progressPercent);
  const leftIcon = variant === "history"
    ? (group.isCompleted ? <CheckCircle2 className={`mt-0.5 size-5 shrink-0 ${progressToneIconClass}`} /> : <XCircle className={`mt-0.5 size-5 shrink-0 ${progressToneIconClass}`} />)
    : <Target className={`mt-0.5 size-5 shrink-0 ${progressToneIconClass}`} />;
  const showExpandedDetails = variant === "active" || isExpanded;

  return (
    <article className="surface-soft-card min-w-0 overflow-hidden rounded-[1.35rem] p-4">
      {variant === "history" ? (
        <button
          className="flex w-full items-start justify-between gap-3 text-left"
          onClick={onToggle}
          type="button"
        >
          <div className="flex min-w-0 items-start gap-2">
            {leftIcon}
            <h3 className="break-words font-display text-[1.1rem] leading-tight text-foreground">{getGroupTitle(group)}</h3>
          </div>
          <ChevronDown className={`size-5 shrink-0 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
        </button>
      ) : (
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 items-start gap-2">
            {leftIcon}
            <h3 className="break-words font-display text-[1.1rem] leading-tight text-foreground">{getGroupTitle(group)}</h3>
          </div>
        </div>
      )}

      {showExpandedDetails ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {group.startRecordDate ? (
            <p>
              <span className="font-semibold text-foreground/70">{t("personalGoal.list.start")}</span>{" "}
              {formatCompactDate(group.startRecordDate, locale)}
            </p>
          ) : null}
          {group.referenceRecordDate ? (
            <p>
              <span className="font-semibold text-foreground/70">{t("personalGoal.list.reference")}</span>{" "}
              {formatCompactDate(group.referenceRecordDate, locale)}
            </p>
          ) : null}
          {group.targetDate ? (
            <p>
              <span className="font-semibold text-foreground/70">{t("personalGoal.list.target")}</span>{" "}
              {formatCompactDate(group.targetDate, locale)}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className={PROGRESS_ROW_CLASS}>
        <div className="h-2 overflow-hidden rounded-full bg-foreground/[0.06]">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${progressToneClass}`}
            style={{ width: getProgressBarWidth(group.progressPercent) }}
          />
        </div>
        <span className={`w-12 shrink-0 text-right text-xs font-semibold tabular-nums ${progressToneTextClass}`}>
          {group.progressPercent}%
        </span>
      </div>

      {showExpandedDetails ? (
        <div className="mt-3 space-y-2">
          {group.goals.map((goal) => renderGoalItem(goal))}
        </div>
      ) : null}

      {variant === "active" ? (
        <div className="mt-3 flex items-center justify-end gap-1 border-t border-border/60 pt-3">
          <Button
            aria-label={t("personalGoal.list.edit")}
            className="size-10 cursor-pointer"
            disabled={isBusy}
            onClick={() => onEdit(group)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            aria-label={t("personalGoal.list.delete")}
            className="size-10 cursor-pointer text-destructive hover:bg-destructive/10"
            disabled={isBusy}
            onClick={() => onDelete(group)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ) : isExpanded ? (
        <div className="mt-3 flex items-center justify-end gap-1 border-t border-border/60 pt-3">
          <Button
            aria-label={t("personalGoal.list.edit")}
            className="size-10 cursor-pointer"
            disabled={isBusy}
            onClick={() => onEdit(group)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            aria-label={t("personalGoal.list.delete")}
            className="size-10 cursor-pointer text-destructive hover:bg-destructive/10"
            disabled={isBusy}
            onClick={() => onDelete(group)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ) : null}
    </article>
  );
}

  function renderGoalItem(goal: PersonalGoal) {
    const progressToneClass = getProgressToneClass(goal.progressPercent);
    const progressToneTextClass = getProgressToneTextClass(goal.progressPercent);

    return (
      <div className="rounded-[1rem] bg-white/58 p-3" key={goal.id}>
        <div className="min-w-0">
          <div className="min-w-0">
            <div className="flex min-w-0 items-baseline gap-2">
              <p className="shrink-0 text-sm font-semibold text-foreground">{t(`personalGoal.metrics.${goal.metricKey}`)}</p>
              <p className="min-w-0 truncate text-xs font-medium text-muted-foreground">
                {t("personalGoal.list.start")} {formatValue(goal.startValue, goal.unit)} / {t("personalGoal.list.current")} {formatValue(goal.latestValue, goal.unit)} / {t("personalGoal.list.target")} {formatValue(goal.targetValue, goal.unit)}
              </p>
            </div>
          </div>
        </div>

        <div className="-mx-3 mt-3 grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-2">
          <div className="h-2 overflow-hidden rounded-full bg-foreground/[0.06]">
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${progressToneClass}`}
              style={{ width: getProgressBarWidth(goal.progressPercent) }}
            />
          </div>
          <span className={`w-12 shrink-0 text-right text-xs font-semibold tabular-nums ${progressToneTextClass}`}>
            {goal.progressPercent}%
          </span>
        </div>
      </div>
    );
  }

  function renderGoalCard(group: PersonalGoalGroup, variant: GoalCardVariant) {
    const isBusy = pendingGroupKey === group.key || isRefreshing;
    const isExpanded = variant === "active" || expandedHistoryKeys.includes(group.key);

    return (
      <GoalCard
        group={group}
        isBusy={isBusy}
        isExpanded={isExpanded}
        key={group.key}
        locale={locale}
        onDelete={deleteGroup}
        onEdit={editGroup}
        onToggle={variant === "history" ? () => toggleHistoryGroup(group.key) : undefined}
        renderGoalItem={renderGoalItem}
        t={t}
        variant={variant}
      />
    );
  }

  return (
    <div className="space-y-4 pb-24 sm:space-y-7 sm:pb-28">
      <section>
        <StatsScrollbarRow className="stats-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
          <div className="surface-soft-card min-w-[7.75rem] shrink-0 rounded-[0.875rem] px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t("personalGoal.stats.total")}</p>
            <p className="mt-1 font-display text-[1.25rem] leading-tight text-foreground">{goalGroups.length}</p>
          </div>
          <div className="surface-soft-card min-w-[7.75rem] shrink-0 rounded-[0.875rem] px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t("personalGoal.stats.progress")}</p>
            <p className="mt-1 font-display text-[1.25rem] leading-tight text-foreground">{completedGroups.length}/{goalGroups.length || 0}</p>
          </div>
          <div className="surface-soft-card min-w-[8.25rem] shrink-0 rounded-[0.875rem] px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t("personalGoal.stats.latestDate")}</p>
            <p className="mt-1 font-display text-[1.25rem] leading-tight text-foreground">{formatCompactDate(latestRecord?.date, locale)}</p>
          </div>
        </StatsScrollbarRow>
      </section>

      {hasGoals ? (
        <div className="space-y-5">
          {feedback ? (
            <p className="rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
              {feedback}
            </p>
          ) : null}

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3 px-1">
              <h2 className="text-sm font-semibold text-foreground">{t("personalGoal.list.activeTitle")}</h2>
              <p className="text-xs text-muted-foreground">{t("personalGoal.list.remaining", { count: activeGroups.length })}</p>
            </div>
            <div className="grid min-w-0 gap-2.5 md:grid-cols-2">
              {activeGroups.length > 0 ? activeGroups.map((group) => renderGoalCard(group, "active")) : (
                <div className="surface-soft-card rounded-[1.15rem] p-4 text-sm text-muted-foreground">
                  {t("personalGoal.list.noActiveGoals")}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3 px-1">
              <h2 className="text-sm font-semibold text-foreground">{t("personalGoal.list.historyTitle")}</h2>
              <p className="text-xs text-muted-foreground">{t("personalGoal.list.historyCount", { count: completedGroups.length })}</p>
            </div>
            {completedGroups.length > 0 ? (
              <div className="grid min-w-0 gap-2.5 md:grid-cols-2">
                {completedGroups.map((group) => renderGoalCard(group, "history"))}
              </div>
            ) : (
              <div className="surface-soft-card rounded-[1.15rem] border-dashed p-4 text-sm text-muted-foreground">
                {t("personalGoal.list.historyEmpty")}
              </div>
            )}
          </section>
        </div>
      ) : (
        <section className="surface-state-panel flex flex-col items-center gap-3 rounded-[1.75rem] p-8 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-accent/14 text-accent-strong">
            <Target className="size-5" />
          </div>
          <p className="font-display text-[1.7rem] text-foreground sm:text-2xl">{t("personalGoal.empty.title")}</p>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">{t("personalGoal.empty.description")}</p>
          <Button className="min-h-11 cursor-pointer" onClick={openCreatePage} type="button">
            {t("personalGoal.empty.action")}
          </Button>
        </section>
      )}

      {hasGoals ? (
        <FloatingActionButton
          ariaLabel={t("personalGoal.fabLabel")}
          onClick={openCreatePage}
          pressFeedbackClassName="transition-[transform,background-color,opacity,box-shadow] duration-200 active:scale-[0.92] active:rotate-45 active:brightness-95"
          title={t("personalGoal.fabLabel")}
        >
          <Plus className="size-7" />
        </FloatingActionButton>
      ) : null}
    </div>
  );
}
