"use client";

import { CheckCircle2, ChevronRight, Pencil, Plus, Target, Trash2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { useLocale, useTranslations } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { CompactInfoCard } from "@/components/ui/compact-info-card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { GoalMetricProgressCard } from "@/components/ui/goal-metric-progress-card";
import { GoalProgressBar } from "@/components/ui/goal-progress-bar";
import { StatsScrollbarRow } from "@/components/ui/stats-scrollbar-row";
import type { PersonalGoal } from "@/lib/personal-goals";
import type { InbodyRecord } from "@/lib/inbody/types";
import { formatCompactDate } from "@/lib/presentation";
import { cn } from "@/lib/utils";

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
  const [selectedGroup, setSelectedGroup] = useState<PersonalGoalGroup | null>(null);
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

  async function deleteGroup(group: PersonalGoalGroup) {
    if (!window.confirm(t("personalGoal.list.confirmDelete"))) {
      return false;
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
      return true;
    } catch {
      setFeedback(t("personalGoal.list.deleteError"));
      return false;
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
  onSelect: (group: PersonalGoalGroup) => void;
};

type GoalSectionProps = {
  countLabel: string;
  emptyState: ReactNode;
  groups: PersonalGoalGroup[];
  renderGoalCard: (group: PersonalGoalGroup, variant: GoalSectionVariant) => ReactNode;
  title: string;
  variant: GoalSectionVariant;
};

function GoalCard({
  group,
  variant,
  onSelect,
}: GoalCardProps) {
  const isHistory = variant === "history";
  const leftIcon = variant === "history"
    ? (
        group.isCompleted
          ? <CheckCircle2 className="size-5 shrink-0 text-muted-foreground" />
          : <XCircle className="size-5 shrink-0 text-muted-foreground" />
      )
    : <Target className="size-5 shrink-0 text-[rgb(var(--primary-strong))]" />;

  return (
    <button
      className={cn(
        "surface-soft-card group w-full min-w-0 cursor-pointer overflow-hidden rounded-[1.35rem] p-4 text-left transition",
        "hover:-translate-y-px hover:border-accent/25 hover:shadow-[0_16px_34px_rgba(16,35,63,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
        isHistory ? "bg-muted/35 opacity-75 saturate-50 hover:opacity-90" : "",
      )}
      onClick={() => onSelect(group)}
      type="button"
    >
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {leftIcon}
          <h3 className={cn("break-words font-display text-[1.1rem] leading-tight", isHistory ? "text-muted-foreground" : "text-foreground")}>{getGroupTitle(group)}</h3>
        </div>
        <div className="flex items-center justify-end text-muted-foreground transition-colors group-hover:text-foreground">
          <ChevronRight className="size-5" />
        </div>
      </div>

      <GoalProgressBar className="mt-3 h-7" value={group.progressPercent} variant={isHistory ? "subtle" : "primary"} />
    </button>
  );
}

function GoalSection({
  countLabel,
  emptyState,
  groups,
  renderGoalCard,
  title,
  variant,
}: GoalSectionProps) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{countLabel}</p>
      </div>
      {groups.length > 0 ? (
        <div className="grid min-w-0 gap-2.5">
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
    return (
      <GoalCard
        group={group}
        key={group.key}
        onSelect={setSelectedGroup}
        variant={variant}
      />
    );
  }

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
            renderGoalCard={renderGoalCard}
            title={t("personalGoal.list.activeTitle")}
            variant="active"
          />

          <GoalSection
            countLabel={t("personalGoal.list.historyCount", { count: completedGroups.length })}
            emptyState={<div className="surface-soft-card rounded-[1.15rem] border-dashed p-4 text-sm text-muted-foreground">{t("personalGoal.list.historyEmpty")}</div>}
            groups={completedGroups}
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

      <Dialog onOpenChange={(open) => !open && setSelectedGroup(null)} open={Boolean(selectedGroup)}>
        <DialogContent className="max-h-[88vh] w-[calc(100vw-1.5rem)] max-w-[30rem] overflow-y-auto p-0" showCloseButton={false}>
          {selectedGroup ? (
            <>
              <DialogHeader className="border-b border-border px-4 py-4 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="font-display text-[1.35rem] text-foreground">{getGroupTitle(selectedGroup)}</DialogTitle>
                    <DialogDescription className="sr-only">
                      {t("personalGoal.list.itemCount", { count: selectedGroup.goals.length })}
                    </DialogDescription>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold leading-5 text-muted-foreground">
                      {selectedGroup.startRecordDate && selectedGroup.targetDate ? (
                        <span>
                          {formatCompactDate(selectedGroup.startRecordDate, locale)}
                          {" → "}
                          {formatCompactDate(selectedGroup.targetDate, locale)}
                        </span>
                      ) : null}
                      {selectedGroup.referenceRecordDate ? (
                        <span>
                          {selectedGroup.startRecordDate && selectedGroup.targetDate ? ", " : ""}
                          {t("personalGoal.list.reference")} {formatCompactDate(selectedGroup.referenceRecordDate, locale)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <span className="inline-flex min-h-7 shrink-0 items-center rounded-full border border-border/70 bg-background/80 px-2.5 text-[11px] font-medium tracking-[0.08em] text-muted-foreground">
                    {t("personalGoal.list.itemCount", { count: selectedGroup.goals.length })}
                  </span>
                </div>

                <div className="mt-3">
                  <GoalProgressBar className="h-7" value={selectedGroup.progressPercent} />
                </div>
              </DialogHeader>

              <div className="space-y-4 p-4 sm:p-5">
                <div className="grid gap-2">
                  {selectedGroup.goals.map((goal) => renderGoalItem(goal))}
                </div>

                <div className="flex items-center justify-end gap-1 border-t border-border/60 pt-3">
                  <Button
                    aria-label={t("personalGoal.list.edit")}
                    className="size-10 cursor-pointer"
                    disabled={pendingGroupKey === selectedGroup.key || isRefreshing}
                    onClick={() => editGroup(selectedGroup)}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    aria-label={t("personalGoal.list.delete")}
                    className="size-10 cursor-pointer"
                    disabled={pendingGroupKey === selectedGroup.key || isRefreshing}
                    onClick={() => {
                      void deleteGroup(selectedGroup).then((deleted) => {
                        if (deleted) {
                          setSelectedGroup(null);
                        }
                      });
                    }}
                    size="icon"
                    type="button"
                    variant="destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
