"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, Plus, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import type { CompetitionProgress } from "@/lib/competitions";
import { getCompetitionMemberByUserId } from "@/lib/competitions";
import { formatCompactDate, getUserInitials } from "@/lib/presentation";
import { cn } from "@/lib/utils";

interface CompetitionsWorkspaceProps {
  competitions: CompetitionProgress[];
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

function getMemberStatusLabel(memberStatus: CompetitionProgress["members"][number]["status"], t: ReturnType<typeof useTranslations>) {
  if (memberStatus === "accepted") {
    return t("competitions.status.accepted");
  }

  if (memberStatus === "declined") {
    return t("competitions.status.declined");
  }

  if (memberStatus === "removed") {
    return t("competitions.status.removed");
  }

  return t("competitions.status.invited");
}

function getCompetitionMembersForPreview(members: CompetitionProgress["members"]) {
  const statusWeight: Record<CompetitionProgress["members"][number]["status"], number> = {
    accepted: 0,
    invited: 1,
    declined: 2,
    removed: 3,
  };

  return [...members].sort((left, right) => {
    if (left.role !== right.role) {
      return left.role === "owner" ? -1 : 1;
    }

    if (statusWeight[left.status] !== statusWeight[right.status]) {
      return statusWeight[left.status] - statusWeight[right.status];
    }

    const leftUpdated = new Date(left.updatedAt).getTime();
    const rightUpdated = new Date(right.updatedAt).getTime();
    return rightUpdated - leftUpdated;
  });
}

function CompetitionAvatarStack({ members }: { members: CompetitionProgress["members"] }) {
  const previewMembers = getCompetitionMembersForPreview(members).slice(0, 4);
  const overflowCount = members.length - previewMembers.length;

  return (
    <div className="flex items-center">
      {previewMembers.map((member, index) => {
        const fallback = getUserInitials(member.displayName);

        return (
          <div
            className={cn(
              "relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,243,249,0.96))] text-[11px] font-semibold text-primary shadow-[0_6px_14px_rgba(15,35,63,0.08)]",
              index > 0 ? "-ml-2.5" : "",
            )}
            key={member.id}
            title={member.displayName}
          >
            {member.avatarUrl ? (
              <img alt={member.displayName} className="size-full object-cover" loading="lazy" src={member.avatarUrl} />
            ) : (
              <span aria-hidden="true">{fallback}</span>
            )}
          </div>
        );
      })}

      {overflowCount > 0 ? (
        <div className="-ml-2.5 grid size-9 shrink-0 place-items-center rounded-full border border-white/90 bg-muted/90 text-[11px] font-semibold text-muted-foreground shadow-[0_6px_14px_rgba(15,35,63,0.08)]">
          +{overflowCount}
        </div>
      ) : null}
    </div>
  );
}

function CompetitionSection({
  title,
  competitions,
  userId,
}: {
  title: string;
  competitions: CompetitionProgress[];
  userId: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  async function handleResponse(competitionId: string, status: "accepted" | "declined") {
    try {
      await requestJson<{ member: CompetitionProgress["members"][number] }>(`/api/competitions/${competitionId}/membership`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      router.refresh();
      toast.success(status === "accepted" ? t("competitions.respond.accepted") : t("competitions.respond.declined"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("competitions.respond.failed"));
    }
  }

  return (
    <section className="space-y-3">
      <div className="px-1">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {competitions.map((competition) => {
          const currentMember = getCompetitionMemberByUserId(competition, userId);
          const acceptedMembers = competition.members.filter((member) => member.status === "accepted").length;
          const isInvited = currentMember?.status === "invited";

          const cardInner = (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="mt-1 break-words font-display text-[1.25rem] leading-tight text-foreground">{competition.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{formatCompactDate(competition.targetDate, locale)}</p>
                </div>

                <Badge variant={competition.status === "active" ? "default" : "neutral"}>{t(`competitions.state.${competition.status}`)}</Badge>
              </div>

              <div className="mt-4 flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <CompetitionAvatarStack members={competition.members} />
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {t("competitions.card.members")} {competition.members.length}
                    </span>
                    <span>
                      {t("competitions.stats.accepted")} {acceptedMembers}
                    </span>
                  </div>
                </div>
              </div>
              {isInvited ? (
                <div className="relative mt-4 overflow-hidden rounded-[1rem] border border-accent/25 bg-[linear-gradient(180deg,rgba(236,253,243,0.95),rgba(240,251,246,0.82))] p-3 pl-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                  <div className="absolute inset-y-0 left-0 w-1 bg-accent/70" />
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/14 text-accent-strong">
                      <BellRing className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{t("competitions.inviteBanner.title")}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("competitions.inviteBanner.description")}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <Button className="min-h-10 text-muted-foreground hover:text-foreground" onClick={() => handleResponse(competition.id, "declined")} type="button" variant="ghost">
                      {t("competitions.respond.decline")}
                    </Button>
                    <Button className="min-h-10" onClick={() => handleResponse(competition.id, "accepted")} type="button">
                      {t("competitions.respond.accept")}
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          );

          if (isInvited) {
            return (
              <article
                className="surface-soft-card min-w-0 rounded-[1.35rem] border border-accent/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,250,248,0.96))] p-4 shadow-[0_12px_28px_rgba(16,35,63,0.07)]"
                key={competition.id}
              >
                {cardInner}
              </article>
            );
          }

          return (
            <Link
              className="surface-soft-card group min-w-0 rounded-[1.35rem] p-4 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(16,35,63,0.09)]"
              href={`/competitions/${competition.id}`}
              key={competition.id}
            >
              {cardInner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function CompetitionsWorkspace({ competitions, userId }: CompetitionsWorkspaceProps) {
  const t = useTranslations();
  const activeCompetitions = [...competitions]
    .filter((competition) => competition.status === "active")
    .sort((left, right) => left.targetDate.localeCompare(right.targetDate));
  const endedCompetitions = [...competitions]
    .filter((competition) => competition.status !== "active")
    .sort((left, right) => right.targetDate.localeCompare(left.targetDate));
  const hasCompetitions = competitions.length > 0;

  return (
    <div className="space-y-4 pb-24 sm:space-y-7 sm:pb-28">
      {hasCompetitions ? (
        <div className="space-y-6">
          {activeCompetitions.length > 0 ? <CompetitionSection competitions={activeCompetitions} title={t("competitions.state.active")} userId={userId} /> : null}
          {endedCompetitions.length > 0 ? <CompetitionSection competitions={endedCompetitions} title={t("competitions.state.completed")} userId={userId} /> : null}
        </div>
      ) : (
        <section className="surface-state-panel flex flex-col items-center gap-3 rounded-[1.75rem] p-8 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-accent/14 text-accent-strong">
            <Trophy className="size-5" />
          </div>
          <p className="font-display text-[1.7rem] text-foreground sm:text-2xl">{t("competitions.empty.title")}</p>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">{t("competitions.empty.description")}</p>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_8px_16px_rgba(23,52,93,0.14)] transition hover:brightness-95" href="/competitions/new">
            {t("competitions.empty.action")}
          </Link>
        </section>
      )}

      {hasCompetitions ? (
        <FloatingActionButton
          ariaLabel={t("competitions.fabLabel")}
          asChild
          pressFeedbackClassName="transition-[transform,background-color,opacity,box-shadow] duration-200 active:scale-[0.92] active:rotate-45 active:brightness-95"
          title={t("competitions.fabLabel")}
        >
          <Link href="/competitions/new">
            <Plus className="size-7" />
          </Link>
        </FloatingActionButton>
      ) : null}
    </div>
  );
}
