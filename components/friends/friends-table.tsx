"use client";

import Link from "next/link";
import { Eye, GitCompareArrows, LoaderCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocale, useTranslations } from "@/components/i18n-provider";
import type { FriendSnapshot } from "@/lib/friends/types";
import { getMetricDeltaToneClass } from "@/lib/inbody/progress";
import { formatCompactDate, formatDecimal, getUserInitials } from "@/lib/presentation";

interface FriendsTableProps {
  busyFriendId: string | null;
  friends: FriendSnapshot[];
  onAdd: () => void;
  onRemove: (friend: FriendSnapshot) => void;
}

function FriendAvatar({ friend }: { friend: FriendSnapshot }) {
  if (friend.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={friend.displayName}
        className="size-12 rounded-full border border-border object-cover shadow-[0_8px_18px_rgba(16,35,63,0.12)] sm:size-14"
        src={friend.avatarUrl}
      />
    );
  }

  return (
    <div className="surface-avatar-fallback flex size-12 items-center justify-center rounded-full border border-border text-sm font-semibold text-foreground shadow-[0_8px_18px_rgba(16,35,63,0.12)] sm:size-14">
      {getUserInitials(friend.displayName)}
    </div>
  );
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

function FriendCard({ friend, isBusy, onRemove }: { friend: FriendSnapshot; isBusy: boolean; onRemove: (friend: FriendSnapshot) => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const metricItems = [
    {
      delta: formatDelta(friend.latestWeightDelta),
      label: t("friends.labels.weight"),
      tone: getMetricDeltaToneClass("weight", friend.latestWeightDelta),
      value: formatDecimal(friend.latestWeight),
    },
    {
      delta: formatDelta(friend.latestMuscleDelta),
      label: t("friends.labels.muscle"),
      tone: getMetricDeltaToneClass("muscle", friend.latestMuscleDelta),
      value: formatDecimal(friend.latestMuscle),
    },
    {
      delta: formatDelta(friend.latestFatPercentDelta),
      label: t("friends.labels.fatPercent"),
      tone: getMetricDeltaToneClass("fatPercent", friend.latestFatPercentDelta),
      value: formatDecimal(friend.latestFatPercent),
    },
  ];

  return (
    <Card className="gap-3 rounded-[1.2rem] border-border/60 bg-card/94 p-3.5 shadow-[0_12px_28px_rgba(16,35,63,0.07)] sm:p-4">
      <div className="flex min-w-0 items-start gap-3">
        <FriendAvatar friend={friend} />

        <div className="min-w-0 flex-1">
          <p className="min-w-0 truncate pt-1.5 font-display text-[1.08rem] leading-tight text-foreground sm:text-[1.15rem]">{friend.displayName}</p>

          <div className="mt-1 flex min-w-0 flex-wrap gap-1.5">
            <span className="inline-flex h-7 max-w-full items-center rounded-full bg-success/10 px-2.5 text-xs font-semibold text-success">
              <span className="truncate">{friend.latestRecordedAt ? formatCompactDate(friend.latestRecordedAt, locale) : t("friends.noSnapshot")}</span>
            </span>
            <span className="inline-flex h-7 max-w-full items-center rounded-full bg-primary/8 px-2.5 font-mono text-[11px] font-semibold text-primary">
              <span className="truncate">{friend.friendCode}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {metricItems.map((item) => (
          <div className="surface-subtle-gradient min-w-0 rounded-[0.85rem] border border-border/60 px-2.5 py-2" key={item.label}>
            <p className="truncate text-[10px] font-semibold uppercase text-muted-foreground">{item.label}</p>
            <div className="mt-1 flex min-w-0 items-end justify-between gap-1">
              <p className="truncate font-display text-base leading-none text-foreground">{item.value}</p>
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none ${item.tone}`}>{item.delta}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-border/55 pt-3">
        <Button asChild aria-label={`${t("friends.view")} ${friend.displayName}`} className="h-11 px-2.5 text-xs" title={t("friends.view")} variant="ghost">
          <Link href={`/friends/${friend.friendUserId}`}>
            <Eye className="size-4" />
            <span className="truncate">{t("friends.view")}</span>
          </Link>
        </Button>
        <Button asChild aria-label={`${t("friends.compare")} ${friend.displayName}`} className="h-11 px-2.5 text-xs" title={t("friends.compare")} variant="ghost">
          <Link href={`/friends/${friend.friendUserId}/compare`}>
            <GitCompareArrows className="size-4" />
            <span className="truncate">{t("friends.compare")}</span>
          </Link>
        </Button>
        <Button
          aria-label={`${t("friends.remove")} ${friend.displayName}`}
          className="h-11 px-2.5 text-xs text-muted-foreground hover:bg-danger/8 hover:text-danger"
          disabled={isBusy}
          onClick={() => onRemove(friend)}
          title={t("friends.remove")}
          type="button"
          variant="ghost"
        >
          {isBusy ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          <span className="truncate">{t("friends.remove")}</span>
        </Button>
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
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {friends.map((friend) => {
        const isBusy = busyFriendId === friend.friendUserId;
        return <FriendCard friend={friend} isBusy={isBusy} key={friend.friendUserId} onRemove={onRemove} />;
      })}
    </div>
  );
}
