"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FAB_BASE_CLASS, FAB_OUTLINE_TONE_CLASS, FAB_PRIMARY_TONE_CLASS } from "@/components/ui/floating-action-styles";
import type { FriendSnapshot } from "@/lib/friends/types";
import { getUserInitials } from "@/lib/presentation";
import { cn } from "@/lib/utils";

interface CompetitionCreatePageProps {
  initialFriends: FriendSnapshot[];
  competitionId?: string;
  initialName?: string;
  initialSelectedInvitees?: FriendSnapshot[];
  initialTargetDate?: string;
  mode?: "create" | "edit";
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

function createDefaultTargetDate() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + 60);
  return date.toISOString().slice(0, 10);
}

export function CompetitionCreatePage({
  initialFriends,
  competitionId,
  initialName = "",
  initialSelectedInvitees = [],
  initialTargetDate,
  mode = "create",
}: CompetitionCreatePageProps) {
  const t = useTranslations();
  const router = useRouter();
  const isEditMode = mode === "edit";
  const [name, setName] = useState(initialName);
  const [targetDate, setTargetDate] = useState(() => initialTargetDate ?? createDefaultTargetDate());
  const [selectedFriendId, setSelectedFriendId] = useState("");
  const [selectedInvitees, setSelectedInvitees] = useState<FriendSnapshot[]>(initialSelectedInvitees);
  const [manualCode, setManualCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const remainingFriends = useMemo(
    () => initialFriends.filter((friend) => !selectedInvitees.some((invitee) => invitee.friendUserId === friend.friendUserId)),
    [initialFriends, selectedInvitees],
  );

  function addFriend(friendUserId: string) {
    const friend = initialFriends.find((entry) => entry.friendUserId === friendUserId);
    if (!friend) {
      return;
    }

    setSelectedInvitees((current) => (current.some((entry) => entry.friendUserId === friendUserId) ? current : [...current, friend]));
    setSelectedFriendId("");
  }

  function addManualCode() {
    const normalized = manualCode.trim().toUpperCase();
    if (!normalized) {
      return;
    }

    setSelectedInvitees((current) =>
      current.some((entry) => entry.friendCode === normalized)
        ? current
        : [
            ...current,
            {
              friendUserId: normalized,
              friendCode: normalized,
              displayName: normalized,
              avatarUrl: null,
              linkedAt: new Date().toISOString(),
              latestRecordedAt: null,
              latestWeight: null,
              latestWeightDelta: null,
              latestMuscle: null,
              latestMuscleDelta: null,
              latestFat: null,
              latestFatDelta: null,
              latestFatPercent: null,
              latestFatPercentDelta: null,
              latestScore: null,
              latestScoreDelta: null,
              latestSourceType: null,
            },
          ],
    );
    setManualCode("");
  }

  function removeInvitee(friendUserId: string) {
    setSelectedInvitees((current) => current.filter((entry) => entry.friendUserId !== friendUserId));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      toast.error(t("competitions.create.nameRequired"));
      return;
    }

    setIsSaving(true);
    try {
      const response = await requestJson<{ competitionId: string }>(isEditMode && competitionId ? `/api/competitions/${competitionId}` : "/api/competitions", {
        method: isEditMode ? "PATCH" : "POST",
        body: JSON.stringify({
          name,
          targetDate,
          inviteeUserIds: selectedInvitees
            .filter((invitee) => invitee.friendUserId.length === 36)
            .map((invitee) => invitee.friendUserId),
          inviteeFriendCodes: selectedInvitees
            .filter((invitee) => invitee.friendUserId.length !== 36)
            .map((invitee) => invitee.friendCode),
        }),
      });

      toast.success(t("competitions.create.success"));
      router.replace(isEditMode && competitionId ? `/competitions/${competitionId}` : `/competitions/${response.competitionId}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("competitions.create.failed"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="mx-auto flex w-full max-w-6xl flex-col gap-4 pb-28 pt-1 sm:gap-5 sm:pt-3" onSubmit={handleSubmit}>
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {isEditMode ? t("common.edit") : t("competitions.create.eyebrow")}
          </p>
          <h1 className="mt-1 font-display text-2xl leading-tight text-foreground sm:text-3xl">
            {isEditMode ? t("common.edit") : t("competitions.create.title")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {isEditMode ? t("competitions.create.description") : t("competitions.create.description")}
          </p>
        </div>
      </header>

      <section className="surface-muted-gradient rounded-[1rem] border border-border/80 p-3 sm:p-4">
        <div className="grid gap-3">
          <label className="block">
            <span className="px-1 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {t("competitions.create.name")}
            </span>
            <Input
              className="mt-2 h-11 rounded-[0.9rem] border-border/80 bg-[linear-gradient(180deg,rgb(var(--card))_0%,rgb(var(--surface))_100%)] shadow-none"
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("competitions.create.namePlaceholder")}
              value={name}
            />
          </label>

          <label className="block">
            <span className="px-1 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {t("competitions.create.targetDate")}
            </span>
            <Input
              className="mt-2 h-11 rounded-[0.9rem] border-border/80 bg-[linear-gradient(180deg,rgb(var(--card))_0%,rgb(var(--surface))_100%)] shadow-none"
              onChange={(event) => setTargetDate(event.target.value)}
              type="date"
              value={targetDate}
            />
          </label>
        </div>
      </section>

      <section className="surface-muted-gradient rounded-[1rem] border border-border/80 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3 px-1 pb-2">
          <p className="text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("competitions.create.inviteFriends")}
          </p>
          <Badge variant="neutral">
            {t("competitions.create.inviteCount", { count: selectedInvitees.length })}
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid gap-2">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <label className="block min-w-0">
                <span className="sr-only">{t("competitions.create.friendPicker")}</span>
                <select
                  className="flex h-11 w-full appearance-none rounded-[0.9rem] border border-border/80 bg-[linear-gradient(180deg,rgb(var(--card))_0%,rgb(var(--surface))_100%)] px-3.5 text-sm text-foreground outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={!remainingFriends.length}
                  onChange={(event) => setSelectedFriendId(event.target.value)}
                  value={selectedFriendId}
                >
                  <option value="">
                    {remainingFriends.length ? t("competitions.create.friendPickerPlaceholder") : t("competitions.create.noFriends")}
                  </option>
                  {remainingFriends.map((friend) => (
                    <option key={friend.friendUserId} value={friend.friendUserId}>
                      {friend.displayName} 繚 {friend.friendCode}
                    </option>
                  ))}
                </select>
              </label>

              <Button className="min-h-11" disabled={!selectedFriendId} onClick={() => addFriend(selectedFriendId)} type="button" variant="outline">
                <Plus className="size-4" />
                {t("competitions.create.addFriend")}
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <label className="block min-w-0">
                <span className="sr-only">{t("competitions.create.inviteById")}</span>
                <Input
                  autoCapitalize="characters"
                  autoComplete="off"
                  className="h-11 rounded-[0.9rem] border border-border/80 bg-[linear-gradient(180deg,rgb(var(--card))_0%,rgb(var(--surface))_100%)] px-3.5 shadow-none placeholder:text-muted-foreground/80 focus:border-primary/70 focus:ring-2 focus:ring-primary/15"
                  maxLength={32}
                  onChange={(event) => setManualCode(event.target.value.toUpperCase())}
                  placeholder={t("competitions.create.inviteByIdPlaceholder")}
                  value={manualCode}
                />
              </label>

              <Button className="min-h-11" disabled={!manualCode.trim()} onClick={addManualCode} type="button" variant="outline">
                <Search className="size-4" />
                {t("competitions.create.invite")}
              </Button>
            </div>
          </div>

          <div className="min-w-0 rounded-[1rem] border border-border/70 bg-white/68 p-3">
            {selectedInvitees.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedInvitees.map((invitee) => (
                  <button
                    className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border border-border/70 bg-white/74 px-3 py-2 text-left transition hover:border-primary/30 hover:bg-white"
                    key={invitee.friendUserId}
                    onClick={() => removeInvitee(invitee.friendUserId)}
                    type="button"
                  >
                    <span className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                      {invitee.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt={invitee.displayName} className="size-full rounded-full object-cover" src={invitee.avatarUrl} />
                      ) : (
                        getUserInitials(invitee.displayName)
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block max-w-[12rem] truncate text-sm font-semibold text-foreground">{invitee.displayName}</span>
                      <span className="block max-w-[12rem] truncate text-xs text-muted-foreground">{invitee.friendCode}</span>
                    </span>
                    <X className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="surface-state-panel flex min-h-[5.5rem] items-center justify-center rounded-[0.9rem] px-4 py-4 text-center text-sm text-muted-foreground">
                {t("competitions.create.inviteEmpty")}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-40 sm:inset-x-7 sm:bottom-7">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
          <Button
            aria-label={t("common.cancel")}
            className={cn("pointer-events-auto relative", FAB_BASE_CLASS, FAB_OUTLINE_TONE_CLASS)}
            onClick={() => router.replace(isEditMode && competitionId ? `/competitions/${competitionId}` : "/competitions")}
            title={t("common.cancel")}
            variant="outline"
          >
            <X className="relative z-10 size-6" />
          </Button>
          <Button
            aria-label={t("common.save")}
            className={cn("pointer-events-auto", FAB_BASE_CLASS, FAB_PRIMARY_TONE_CLASS)}
            disabled={isSaving || !name.trim()}
            title={t("common.save")}
            type="submit"
          >
            {isSaving ? (
              <span className="relative z-10 size-6 animate-spin rounded-full border-2 border-white/50 border-t-white" />
            ) : (
              <Check className="relative z-10 size-6" />
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
