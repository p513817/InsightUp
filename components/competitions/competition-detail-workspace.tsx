"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, CircleAlert, Crown, Pencil, Share2, Target, Trophy, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { BottomActionDock, type BottomActionDockItem } from "@/components/ui/bottom-action-dock";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GoalMetricProgressCard } from "@/components/ui/goal-metric-progress-card";
import { GoalProgressBar } from "@/components/ui/goal-progress-bar";
import type { CompetitionProgress } from "@/lib/competitions";
import { attachCurrentUserMember, getCompetitionLeaderBoard } from "@/lib/competitions";
import { formatCompactDate, getUserInitials } from "@/lib/presentation";
import { cn } from "@/lib/utils";

interface CompetitionDetailWorkspaceProps {
  competition: CompetitionProgress;
  userId: string;
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

function formatGoalValue(value: number | null, unit: string) {
  if (value == null) {
    return "-";
  }

  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ""}`;
}

function getStatusBadgeLabel(status: CompetitionProgress["members"][number]["status"], t: ReturnType<typeof useTranslations>) {
  if (status === "accepted") return t("competitions.status.accepted");
  if (status === "declined") return t("competitions.status.declined");
  if (status === "removed") return t("competitions.status.removed");
  return t("competitions.status.invited");
}

function getMemberRank(leaderboard: CompetitionProgress["members"], memberId: string) {
  const rank = leaderboard.findIndex((member) => member.id === memberId);
  return rank >= 0 ? rank + 1 : null;
}

const DAY_MS = 1000 * 60 * 60 * 24;

function toMiddayDate(value: string) {
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  date.setHours(12, 0, 0, 0);
  return date;
}

function toLocalDateString(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function getCompetitionTimeline(createdAt: string, targetDate: string) {
  const start = toMiddayDate(createdAt);
  const due = toMiddayDate(targetDate);
  const now = new Date();
  now.setHours(12, 0, 0, 0);

  const totalDays = Math.max(1, Math.round((due.getTime() - start.getTime()) / DAY_MS));
  const elapsedDays = Math.max(0, Math.min(totalDays, Math.round((now.getTime() - start.getTime()) / DAY_MS)));
  const currentPercent = Math.max(0, Math.min(100, Math.round((elapsedDays / totalDays) * 100)));
  const remainingDays = Math.max(0, Math.ceil((due.getTime() - now.getTime()) / DAY_MS));

  return {
    currentPercent,
    remainingDays,
    start,
    due,
  };
}

function MemberAvatar({ member }: { member: CompetitionProgress["members"][number] }) {
  const fallback = getUserInitials(member.displayName);

  return (
    <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,243,249,0.96))] text-xs font-semibold text-primary shadow-[0_6px_14px_rgba(15,35,63,0.08)]">
      {member.avatarUrl ? (
        <img alt={member.displayName} className="size-full object-cover" loading="lazy" src={member.avatarUrl} />
      ) : (
        <span aria-hidden="true">{fallback}</span>
      )}
    </div>
  );
}

function getPodiumBadgeTone(rank: number) {
  if (rank === 1) {
    return "bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-[0_6px_14px_rgba(217,119,6,0.28)]";
  }

  if (rank === 2) {
    return "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 shadow-[0_6px_14px_rgba(71,85,105,0.18)]";
  }

  return "bg-gradient-to-br from-orange-400 to-amber-600 text-white shadow-[0_6px_14px_rgba(154,52,18,0.22)]";
}

export function CompetitionDetailWorkspace({ competition, userId }: CompetitionDetailWorkspaceProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [selectedMember, setSelectedMember] = React.useState<CompetitionProgress["members"][number] | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const currentCompetition = attachCurrentUserMember(competition, userId);
  const currentMember = currentCompetition.currentUserMember;
  const leaderboard = getCompetitionLeaderBoard(currentCompetition);
  const currentRank = currentMember ? getMemberRank(leaderboard, currentMember.id) : null;
  const canEditCompetition = currentMember?.role === "owner";
  const isPendingInvite = currentMember?.status === "invited";
  const timeline = React.useMemo(
    () => getCompetitionTimeline(competition.createdAt, competition.targetDate),
    [competition.createdAt, competition.targetDate],
  );
  const timelinePointPadding = 6;
  const currentTimelinePercent = timelinePointPadding + (timeline.currentPercent / 100) * (100 - timelinePointPadding * 2);
  const actionDockItems: BottomActionDockItem[] = [
    {
      ariaLabel: t("common.shareShort"),
      disabled: true,
      icon: <Share2 className="size-4" />,
      label: t("common.shareShort"),
      title: t("competitions.detail.shareComingSoon"),
    },
    ...(canEditCompetition
      ? [
          {
            ariaLabel: t("competitions.detail.editCompetition"),
            href: `/competitions/${competition.id}/edit`,
            icon: <Pencil className="size-4" />,
            label: t("common.edit"),
            title: t("competitions.detail.editCompetition"),
          },
          {
            ariaLabel: t("competitions.detail.deleteCompetition"),
            icon: <Trash2 className="size-4" />,
            label: t("common.delete"),
            onClick: () => setIsDeleteDialogOpen(true),
            title: t("competitions.detail.deleteCompetition"),
            variant: "danger" as const,
          },
        ]
      : []),
  ];

  async function handleResponse(status: "accepted" | "declined") {
    try {
      await requestJson<{ member: CompetitionProgress["members"][number] }>(`/api/competitions/${competition.id}/membership`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      router.refresh();
      toast.success(status === "accepted" ? t("competitions.respond.accepted") : t("competitions.respond.declined"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("competitions.respond.failed"));
    }
  }

  async function handleDeleteCompetition() {
    try {
      setIsDeleting(true);
      await requestJson<{ competitionId: string }>(`/api/competitions/${competition.id}`, {
        method: "DELETE",
      });
      toast.success(t("competitions.detail.deleteCompetitionSuccess"));
      setIsDeleteDialogOpen(false);
      router.replace("/competitions");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("competitions.detail.deleteCompetitionFailed"));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-4 pb-36 sm:space-y-7 sm:pb-40">
        <section className="rounded-[1.35rem] p-3 sm:p-4">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="grid size-8 shrink-0 place-items-center rounded-full border border-border/70 bg-background/80 text-muted-foreground">
                  <Trophy className="size-4" />
                </div>
                <h1 className="break-words font-display text-[1.9rem] leading-[1.02] text-foreground sm:text-[2.25rem]">
                  {competition.name}
                </h1>
            </div>
            <span className="inline-flex shrink-0 items-center rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-muted-foreground">
              {t("competitions.detail.daysLeft", { count: timeline.remainingDays })}
            </span>
          </div>

          <div className="mt-2 px-1 sm:mt-3 sm:px-2">
            <div className="relative mt-1">
              <div className="absolute left-0 right-0 top-3 h-1 rounded-full bg-foreground/10" />
                <div className="absolute left-0 top-3 h-1 rounded-full bg-[linear-gradient(135deg,rgb(var(--primary))_0%,rgb(var(--primary-strong))_100%)]" style={{ width: `${currentTimelinePercent}%` }} />

              <div className="absolute left-0 top-[0.875rem] -translate-x-1/2 -translate-y-1/2"><div className="size-3 rounded-full border-2 border-background bg-primary shadow-[0_0_0_1px_rgb(var(--primary)/0.35)]" /></div>

              <div className="absolute top-[0.875rem] -translate-x-1/2 -translate-y-1/2" style={{ left: `${currentTimelinePercent}%` }}>
                <div className="relative grid size-5 place-items-center">
                  <span className="absolute size-5 animate-ping rounded-full bg-emerald-400/35" />
                  <span className="absolute size-4 rounded-full bg-emerald-400/18" />
                  <span className="relative size-3.5 rounded-full border-2 border-background bg-[rgb(var(--primary-strong))] shadow-[0_0_0_1px_rgb(var(--primary-strong)/0.35)]" />
                </div>
              </div>

              <div className="absolute right-0 top-[0.875rem] translate-x-1/2 -translate-y-1/2"><div className="size-3 rounded-full border-2 border-background bg-muted-foreground shadow-[0_0_0_1px_rgb(var(--border)/0.5)]" /></div>

              <div className="grid grid-cols-3 gap-2 pt-6 text-center">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground">{t("competitions.detail.timelineStart")}</p>
                  <p className="mt-0.5 text-xs font-semibold text-foreground">{formatCompactDate(competition.createdAt, locale)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground">{t("competitions.detail.timelineToday")}</p>
                  <p className="mt-0.5 text-xs font-semibold text-foreground">{formatCompactDate(toLocalDateString(), locale)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground">{t("competitions.detail.timelineDue")}</p>
                  <p className="mt-0.5 text-xs font-semibold text-foreground">{formatCompactDate(competition.targetDate, locale)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isPendingInvite ? (
        <section className="surface-state-panel flex flex-col gap-3 rounded-[1.5rem] p-4">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/14 text-accent-strong">
              <CircleAlert className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{t("competitions.inviteBanner.title")}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("competitions.inviteBanner.description")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-11" onClick={() => handleResponse("accepted")} type="button">
              <Check className="size-4" />
              {t("competitions.respond.accept")}
            </Button>
            <Button className="min-h-11" onClick={() => handleResponse("declined")} type="button" variant="outline">
              <X className="size-4" />
              {t("competitions.respond.decline")}
            </Button>
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3 px-1">
          <h2 className="text-sm font-semibold text-foreground">{t("competitions.detail.leaderboard")}</h2>
          {currentRank ? <p className="text-xs text-muted-foreground">{t("competitions.detail.myRank", { rank: currentRank, total: leaderboard.length })}</p> : null}
        </div>

        <div className="grid gap-2">
          {leaderboard.map((member, index) => {
            const hasGoals = member.goalCount > 0;
            const rank = index + 1;

            return (
              <button
                className={cn(
                  "surface-soft-card group grid w-full cursor-pointer rounded-[1rem] p-3 text-left transition",
                  index === 0 ? "border border-accent/25" : "",
                  "hover:-translate-y-px hover:border-accent/25 hover:shadow-[0_16px_34px_rgba(16,35,63,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                  !hasGoals ? "opacity-60 grayscale-[0.2] saturate-0" : "",
                )}
                onClick={() => setSelectedMember(member)}
                type="button"
                title={t("competitions.detail.view")}
                aria-label={t("competitions.detail.view")}
                key={member.id}
              >
                <div className="grid grid-cols-[auto_minmax(0,1fr)_6rem_auto] items-center gap-3 sm:grid-cols-[auto_minmax(0,1fr)_7rem_auto]">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <MemberAvatar member={member} />
                      {rank <= 3 ? (
                        <div
                          className={cn(
                            "absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border border-white/90",
                            getPodiumBadgeTone(rank),
                          )}
                          title={t("competitions.detail.rankLabel", { rank })}
                        >
                          <Crown className="size-3" />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{member.displayName}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {member.role === "owner" ? t("competitions.detail.owner") : t("competitions.detail.participant")}
                      {" · "}
                      {getStatusBadgeLabel(member.status, t)}
                    </p>
                  </div>

                  <div className="flex min-w-0 items-center justify-end">
                    <GoalProgressBar className="h-8 w-full" hasGoals={hasGoals} value={member.progressPercent} />
                  </div>

                  <div className="flex items-center justify-end text-muted-foreground transition-colors group-hover:text-foreground">
                    <ChevronRight className="size-4" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <BottomActionDock items={actionDockItems} />

      <Dialog onOpenChange={(open) => !open && setSelectedMember(null)} open={Boolean(selectedMember)}>
        <DialogContent className="max-h-[88vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto p-0" showCloseButton={false}>
          {selectedMember ? (
            <>
              <DialogHeader className="border-b border-border px-4 py-4 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <DialogTitle className="font-display text-[1.35rem] text-foreground">{selectedMember.displayName}</DialogTitle>
                    <DialogDescription className="mt-1 text-sm leading-6 text-muted-foreground">
                      {selectedMember.role === "owner" ? t("competitions.detail.owner") : t("competitions.detail.participant")}
                      {" · "}
                      {getStatusBadgeLabel(selectedMember.status, t)}
                    </DialogDescription>
                  </div>
                  <div className="flex shrink-0 items-start gap-2">
                    <Badge variant={selectedMember.goalCount > 0 ? "default" : "neutral"}>
                      {selectedMember.goalCount > 0 ? t("competitions.detail.goalReady") : t("competitions.detail.goalMissing")}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 p-4 sm:p-5">
                <div className="surface-soft-card rounded-[0.95rem] p-3">
                  <GoalProgressBar className="h-7" hasGoals={selectedMember.goalCount > 0} value={selectedMember.progressPercent} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex min-h-8 items-center rounded-full border border-border/70 bg-background/80 px-2.5 text-[11px] font-medium tracking-[0.08em] text-muted-foreground">
                      {t("competitions.detail.latestRecord")} {selectedMember.latestRecordDate ? formatCompactDate(selectedMember.latestRecordDate, locale) : t("competitions.detail.noRecord")}
                    </span>
                    <span className="inline-flex min-h-8 items-center rounded-full border border-border/70 bg-background/80 px-2.5 text-[11px] font-medium tracking-[0.08em] text-muted-foreground">
                      {t("competitions.detail.goalCount", { count: selectedMember.goalCount })}
                    </span>
                  </div>
                </div>

                <div className="grid gap-2">
                  {selectedMember.goals.length > 0 ? (
                    selectedMember.goals.map((goal) => (
                      <GoalMetricProgressCard
                        className="surface-soft-card bg-background/60"
                        detail={`${formatGoalValue(goal.startValue, goal.unit)} → ${formatGoalValue(goal.targetValue, goal.unit)} · ${t("personalGoal.list.current")} ${formatGoalValue(goal.latestValue, goal.unit)}`}
                        key={goal.id}
                        metricLabel={t(`personalGoal.metrics.${goal.metricKey}`)}
                        progressPercent={goal.progressPercent}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("competitions.detail.goalMissingBody")}</p>
                  )}
                </div>

                {selectedMember.id === currentMember?.id ? (
                  <div className="flex justify-end pt-1">
                    <Button
                      className="min-h-11 w-full sm:w-auto"
                      onClick={() => router.push(selectedMember.goalCount > 0 ? "/personal-goal" : `/competitions/${competition.id}/goal/new`)}
                      type="button"
                      variant="outline"
                    >
                      <Target className="size-4" />
                      {selectedMember.goalCount > 0 ? t("competitions.detail.goToCompetitionGoal") : t("competitions.detail.setCompetitionGoal")}
                    </Button>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={(open) => !open && !isDeleting && setIsDeleteDialogOpen(open)} open={isDeleteDialogOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-xl p-0" showCloseButton={false}>
          <DialogHeader className="border-b border-border px-4 py-4 sm:px-5">
            <DialogTitle className="font-display text-[1.35rem] text-foreground">
              {t("competitions.detail.deleteCompetitionTitle")}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-6 text-muted-foreground">
              {competition.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-4 sm:p-5">
            <p className="text-sm leading-6 text-muted-foreground">{t("competitions.detail.deleteCompetitionBody")}</p>
            <div className="flex justify-end gap-2">
              <Button disabled={isDeleting} onClick={() => setIsDeleteDialogOpen(false)} type="button" variant="outline">
                {t("common.cancel")}
              </Button>
              <Button disabled={isDeleting} onClick={handleDeleteCompetition} type="button" variant="destructive">
                {isDeleting ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                {t("competitions.detail.deleteCompetitionConfirm")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
