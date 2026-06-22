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
  const [targetDate, setTargetDate] = useState(() => initialTargetDate ?? getDateValue(60));
  const [selectedFriendId, setSelectedFriendId] = useState("");
  const [selectedInvitees, setSelectedInvitees] = useState<FriendSnapshot[]>(initialSelectedInvitees);
  const [manualCode, setManualCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isTargetDateLocked = isEditMode;
  const currentYear = new Date().getFullYear();
  const targetDateParts = splitDateParts(targetDate);
  const earliestYear = Math.min(targetDateParts.year ? Number(targetDateParts.year) : currentYear, currentYear);
  const latestYear = Math.max(targetDateParts.year ? Number(targetDateParts.year) : currentYear + 5, currentYear + 5);
  const yearOptions = Array.from({ length: latestYear - earliestYear + 1 }, (_, index) => String(earliestYear + index));
  const monthOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
  const dayOptions = Array.from({ length: getDaysInMonth(targetDateParts.year, targetDateParts.month) }, (_, index) =>
    String(index + 1).padStart(2, "0"),
  );

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

  function updateTargetDate(nextParts: Partial<typeof targetDateParts>) {
    if (isTargetDateLocked) {
      return;
    }

    setTargetDate(buildDateValue({ ...targetDateParts, ...nextParts }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      toast.error(t("competitions.create.nameRequired"));
      return;
    }

    if (!targetDate) {
      toast.error(t("personalGoal.form.chooseDate"));
      return;
    }

    setIsSaving(true);
    try {
      const response = await requestJson<{ competitionId: string }>(isEditMode && competitionId ? `/api/competitions/${competitionId}` : "/api/competitions", {
        method: isEditMode ? "PATCH" : "POST",
        body: JSON.stringify({
          name,
          targetDate: isEditMode && initialTargetDate ? initialTargetDate : targetDate,
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

          <div>
            <p className="px-1 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {t("competitions.create.targetDate")}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <select
                className="h-10 rounded-[0.75rem] border border-border/80 bg-card px-2 text-sm text-foreground outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/15"
                disabled={isTargetDateLocked}
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
                disabled={isTargetDateLocked}
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
                disabled={isTargetDateLocked}
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
              <Button className="h-8 rounded-full px-3 text-xs" disabled={isTargetDateLocked} onClick={() => setTargetDate(getDateValue(60))} type="button" variant="outline">
                {t("personalGoal.form.in60Days")}
              </Button>
              <Button className="h-8 rounded-full px-3 text-xs" disabled={isTargetDateLocked} onClick={() => setTargetDate(getDateValue(90))} type="button" variant="outline">
                {t("personalGoal.form.in90Days")}
              </Button>
              <Button className="h-8 rounded-full px-3 text-xs" disabled={isTargetDateLocked} onClick={() => setTargetDate(getDateValue(120))} type="button" variant="outline">
                {t("personalGoal.form.in120Days")}
              </Button>
              <Button className="h-8 rounded-full px-3 text-xs" disabled={isTargetDateLocked} onClick={() => setTargetDate(getDateValue(180))} type="button" variant="outline">
                {t("personalGoal.form.in180Days")}
              </Button>
            </div>
            {isTargetDateLocked ? (
              <p className="mt-2 px-1 text-xs leading-5 text-muted-foreground">
                {t("personalGoal.form.targetDateLockedHint")}
              </p>
            ) : null}
          </div>
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
            disabled={isSaving}
            onClick={() => router.replace(isEditMode && competitionId ? `/competitions/${competitionId}` : "/competitions")}
            title={t("common.cancel")}
            type="button"
            variant="outline"
          >
            <X className="relative z-10 size-6" />
          </Button>
          <Button
            aria-label={t("common.save")}
            className={cn("pointer-events-auto", FAB_BASE_CLASS, FAB_PRIMARY_TONE_CLASS)}
            disabled={isSaving || !name.trim() || !targetDate}
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
