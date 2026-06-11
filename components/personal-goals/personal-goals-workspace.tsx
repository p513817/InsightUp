"use client";

import { CheckCircle2, ChevronDown, Pencil, Plus, Target, Trash2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { useLocale, useTranslations } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { CompactInfoCard } from "@/components/ui/compact-info-card";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { GoalMetricProgressCard } from "@/components/ui/goal-metric-progress-card";
import { GoalProgressBar } from "@/components/ui/goal-progress-bar";
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
type GoalSectionVariant = GoalCardVariant;

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
  const [collapsedActiveKeys, setCollapsedActiveKeys] = useState<string[]>([]);
  const [expandedHistoryKeys, setExpandedHistoryKeys] = useState<string[]>([]);
  const hasGoals = goals.length > 0;
  const goalGroups = buildGoalGroups(goals, records);
  const activeGroups = goalGroups.filter((group) => !group.isExpired);
  const completedGroups = goalGroups.filter((group) => group.isExpired);

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

  function toggleActiveGroup(groupKey: string) {
    setCollapsedActiveKeys((current) =>
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

type GoalSectionProps = {
  countLabel: string;
  emptyState: ReactNode;
  groups: PersonalGoalGroup[];
  isAllCollapsed: boolean;
  onToggleAll: () => void;
  renderGoalCard: (group: PersonalGoalGroup, variant: GoalSectionVariant) => ReactNode;
  title: string;
  variant: GoalSectionVariant;
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
  const leftIcon = variant === "history"
    ? (
        group.isCompleted
          ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[rgb(var(--primary-strong))]" />
          : <XCircle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      )
    : <Target className="mt-0.5 size-5 shrink-0 text-[rgb(var(--primary-strong))]" />;
  const showExpandedDetails = isExpanded;

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
      ) : onToggle ? (
        <button className="flex w-full items-start justify-between gap-3 text-left" onClick={onToggle} type="button">
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

      <GoalProgressBar className="mt-3 h-7" value={group.progressPercent} />

      {showExpandedDetails ? (
        <div className="mt-3 space-y-2">
          {group.goals.map((goal) => renderGoalItem(goal))}
        </div>
      ) : null}

      {isExpanded ? (
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

function GoalSection({
  countLabel,
  emptyState,
  groups,
  isAllCollapsed,
  onToggleAll,
  renderGoalCard,
  title,
  variant,
}: GoalSectionProps) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3 px-1">
        <button className="flex min-w-0 items-center gap-1.5 text-left" onClick={onToggleAll} type="button">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isAllCollapsed ? "rotate-180" : ""}`} />
        </button>
        <p className="text-xs text-muted-foreground">{countLabel}</p>
      </div>
      {groups.length > 0 ? (
        <div className="grid min-w-0 gap-2.5 md:grid-cols-2">
          {groups.map((group) => renderGoalCard(group, variant))}
        </div>
      ) : (
        emptyState
      )}
    </section>
  );
}

  function renderGoalItem(goal: PersonalGoal) {
    return (
      <GoalMetricProgressCard
        detail={`${formatValue(goal.startValue, goal.unit)} → ${formatValue(goal.targetValue, goal.unit)} · ${t("personalGoal.list.current")} ${formatValue(goal.latestValue, goal.unit)}`}
        key={goal.id}
        metricLabel={t(`personalGoal.metrics.${goal.metricKey}`)}
        progressClassName="-mx-3"
        progressPercent={goal.progressPercent}
      />
    );
  }

  function renderGoalCard(group: PersonalGoalGroup, variant: GoalCardVariant) {
    const isBusy = pendingGroupKey === group.key || isRefreshing;
    const isExpanded = variant === "active" ? !collapsedActiveKeys.includes(group.key) : expandedHistoryKeys.includes(group.key);

    return (
      <GoalCard
        group={group}
        isBusy={isBusy}
        isExpanded={isExpanded}
        key={group.key}
        locale={locale}
        onDelete={deleteGroup}
        onEdit={editGroup}
        onToggle={variant === "history" ? () => toggleHistoryGroup(group.key) : () => toggleActiveGroup(group.key)}
        renderGoalItem={renderGoalItem}
        t={t}
        variant={variant}
      />
    );
  }

  const isActiveCollapsed = activeGroups.length > 0 && activeGroups.every((group) => collapsedActiveKeys.includes(group.key));
  const isHistoryCollapsed = completedGroups.length > 0 && completedGroups.every((group) => !expandedHistoryKeys.includes(group.key));

  return (
    <div className="space-y-4 pb-24 sm:space-y-7 sm:pb-28">
      <section>
        <StatsScrollbarRow className="grid grid-cols-3 gap-1.5">
          <CompactInfoCard label={t("personalGoal.stats.total")} minWidthClassName="min-w-0" value={goalGroups.length} />
          <CompactInfoCard label={t("personalGoal.stats.progress")} minWidthClassName="min-w-0" value={`${completedGroups.length}/${goalGroups.length || 0}`} />
          <CompactInfoCard label={t("personalGoal.stats.latestDate")} minWidthClassName="min-w-0" value={formatCompactDate(latestRecord?.date, locale)} />
        </StatsScrollbarRow>
      </section>

      {hasGoals ? (
        <div className="space-y-5">
          {feedback ? (
            <p className="rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
              {feedback}
            </p>
          ) : null}
          <GoalSection
            countLabel={t("personalGoal.list.remaining", { count: activeGroups.length })}
            emptyState={<div className="surface-soft-card rounded-[1.15rem] p-4 text-sm text-muted-foreground">{t("personalGoal.list.noActiveGoals")}</div>}
            groups={activeGroups}
            isAllCollapsed={isActiveCollapsed}
            onToggleAll={() => {
              if (isActiveCollapsed) {
                setCollapsedActiveKeys([]);
                return;
              }

              setCollapsedActiveKeys(activeGroups.map((group) => group.key));
            }}
            renderGoalCard={renderGoalCard}
            title={t("personalGoal.list.activeTitle")}
            variant="active"
          />

          <GoalSection
            countLabel={t("personalGoal.list.historyCount", { count: completedGroups.length })}
            emptyState={<div className="surface-soft-card rounded-[1.15rem] border-dashed p-4 text-sm text-muted-foreground">{t("personalGoal.list.historyEmpty")}</div>}
            groups={completedGroups}
            isAllCollapsed={isHistoryCollapsed}
            onToggleAll={() => {
              if (isHistoryCollapsed) {
                setExpandedHistoryKeys(completedGroups.map((group) => group.key));
                return;
              }

              setExpandedHistoryKeys([]);
            }}
            renderGoalCard={renderGoalCard}
            title={t("personalGoal.list.historyTitle")}
            variant="history"
          />
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
