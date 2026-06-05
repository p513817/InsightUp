"use client";

import { CalendarDays, Dumbbell, LoaderCircle, Percent, Scale, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocale, useTranslations } from "@/components/i18n-provider";
import type { FriendSnapshot } from "@/lib/friends/types";
import { formatDecimal, formatLongDate, getUserInitials } from "@/lib/presentation";

interface FriendsTableProps {
  busyFriendId: string | null;
  friends: FriendSnapshot[];
  onAdd: () => void;
  onRemove: (friend: FriendSnapshot) => void;
}

function formatDelta(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value)) || Number(value) === 0) {
    return "0";
  }

  const normalizedValue = Number(value);
  const prefix = normalizedValue > 0 ? "+" : "";
  const formattedValue = Number.isInteger(normalizedValue) ? String(normalizedValue) : normalizedValue.toFixed(1);
  return `${prefix}${formattedValue}`;
}

function deltaTone(value: number | null | undefined, inverse = false) {
  if (value == null || Number(value) === 0) {
    return {
      bg: "bg-muted/42",
      text: "text-muted-foreground",
    };
  }

  const isPositiveProgress = inverse ? Number(value) < 0 : Number(value) > 0;

  return isPositiveProgress
    ? {
        bg: "bg-success/10",
        text: "text-success",
      }
    : {
        bg: "bg-danger/10",
        text: "text-danger",
      };
}

function FriendAvatar({ friend }: { friend: FriendSnapshot }) {
  const className = "size-12 sm:size-14";

  if (friend.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={friend.displayName}
        className={`${className} rounded-full border border-border object-cover shadow-[0_8px_18px_rgba(16,35,63,0.12)]`}
        src={friend.avatarUrl}
      />
    );
  }

  return (
    <div className={`surface-avatar-fallback flex ${className} items-center justify-center rounded-full border border-border text-sm font-semibold text-foreground shadow-[0_8px_18px_rgba(16,35,63,0.12)]`}>
      {getUserInitials(friend.displayName)}
    </div>
  );
}

function FriendProgressCard({ friend, isBusy, onRemove }: { friend: FriendSnapshot; isBusy: boolean; onRemove: (friend: FriendSnapshot) => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const metricItems = [
    {
      label: t("friends.labels.weight"),
      value: formatDecimal(friend.latestWeight),
      delta: formatDelta(friend.latestWeightDelta),
      icon: <Scale className="size-4" />,
      tone: deltaTone(friend.latestWeightDelta),
    },
    {
      label: t("friends.labels.muscle"),
      value: formatDecimal(friend.latestMuscle),
      delta: formatDelta(friend.latestMuscleDelta),
      icon: <Dumbbell className="size-4" />,
      tone: deltaTone(friend.latestMuscleDelta),
    },
    {
      label: t("friends.labels.fatPercent"),
      value: formatDecimal(friend.latestFatPercent),
      delta: formatDelta(friend.latestFatPercentDelta),
      icon: <Percent className="size-4" />,
      tone: deltaTone(friend.latestFatPercentDelta, true),
    },
  ];
  const hasSnapshot = Boolean(friend.latestRecordedAt);

  return (
    <Card className="group relative gap-3.5 overflow-hidden border-border/60 bg-card/94 p-3.5 shadow-[0_12px_28px_rgba(16,35,63,0.07)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/24 hover:shadow-[0_16px_34px_rgba(16,35,63,0.1)] sm:p-4">
      <div className="flex items-start gap-3">
        <FriendAvatar friend={friend} />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-display text-[1.08rem] leading-none text-foreground sm:text-[1.15rem]">{friend.displayName}</p>
              <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                <span className={`inline-flex h-7 max-w-full items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ${hasSnapshot ? "bg-success/10 text-success" : "bg-muted/50 text-muted-foreground"}`}>
                  <CalendarDays className="size-3.5 shrink-0" />
                  <span className="truncate">{hasSnapshot ? formatLongDate(friend.latestRecordedAt, locale) : t("friends.noSnapshot")}</span>
                </span>
                <span className="inline-flex h-7 max-w-full items-center rounded-full bg-primary/8 px-2.5 text-xs font-semibold text-primary">
                  <span className="truncate">{friend.friendCode}</span>
                </span>
              </div>
            </div>

            <Button
              aria-label={`${t("friends.remove")} ${friend.displayName}`}
              className="size-10 shrink-0 rounded-full text-muted-foreground hover:bg-danger/8 hover:text-danger"
              disabled={isBusy}
              onClick={() => onRemove(friend)}
              size="icon"
              type="button"
              variant="ghost"
            >
              {isBusy ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </Button>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {metricItems.map((item) => (
          <div className="surface-subtle-gradient min-w-0 rounded-[0.9rem] border border-border/65 px-2.5 py-2.5" key={item.label}>
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/8 text-primary">{item.icon}</span>
              <p className="truncate text-[10px] font-semibold uppercase text-muted-foreground">{item.label}</p>
            </div>
            <div className="mt-1.5 flex min-w-0 items-end justify-between gap-1">
              <p className="truncate font-display text-base leading-none text-foreground">{item.value}</p>
              <p className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none ${item.tone.bg} ${item.tone.text}`}>{item.delta}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function FriendsTable({ busyFriendId, friends, onAdd, onRemove }: FriendsTableProps) {
  const t = useTranslations();

  if (!friends.length) {
    return (
      <Card className="surface-state-panel items-center gap-2 p-8 text-center">
        <p className="font-display text-[1.7rem] text-foreground sm:text-2xl">{t("friends.emptyTitle")}</p>
        <p className="max-w-xl text-sm leading-6 text-muted-foreground">{t("friends.emptyBody")}</p>
        <Button onClick={onAdd}>{t("friends.addFirst")}</Button>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {friends.map((friend) => {
          const isBusy = busyFriendId === friend.friendUserId;
          return <FriendProgressCard friend={friend} isBusy={isBusy} key={friend.friendUserId} onRemove={onRemove} />;
        })}
      </div>
    </>
  );
}
