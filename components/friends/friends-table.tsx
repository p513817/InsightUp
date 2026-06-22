"use client";

import Link from "next/link";
import { Copy, GitCompareArrows, LoaderCircle, Trash2, UserRoundSearch } from "lucide-react";
import { toast } from "sonner";
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
        className="size-10 rounded-full border border-border object-cover shadow-[0_8px_18px_rgba(16,35,63,0.12)] sm:size-11"
        src={friend.avatarUrl}
      />
    );
  }

  return (
    <div className="surface-avatar-fallback flex size-10 items-center justify-center rounded-full border border-border text-sm font-semibold text-foreground shadow-[0_8px_18px_rgba(16,35,63,0.12)] sm:size-11">
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

async function copyText(text: string) {
  if (typeof window !== "undefined" && window.isSecureContext && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard unavailable");
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("Clipboard fallback failed");
  }
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

  async function handleCopyFriendCode() {
    try {
      await copyText(friend.friendCode);
      toast.success(t("friends.copyCode"), {
        description: t("friends.copyCodeBody"),
      });
    } catch {
      toast.error(t("friends.copyCodeFailed"));
    }
  }

  return (
    <Card className="group relative cursor-pointer gap-2 overflow-hidden rounded-[1rem] border-border/60 bg-card/94 p-2.5 shadow-[0_10px_22px_rgba(16,35,63,0.06)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent/45 hover:shadow-[0_16px_34px_rgba(16,35,63,0.09)] sm:p-3">
      <Link
        aria-label={`${t("friends.view")} ${friend.displayName}`}
        className="absolute inset-0 z-0 rounded-[1rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        href={`/friends/${friend.friendUserId}`}
      />

      <div className="pointer-events-none relative z-10 flex min-w-0 items-center gap-2.5">
        <FriendAvatar friend={friend} />

        <div className="min-w-0 flex-1 self-stretch py-0.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="min-w-0 truncate font-display text-[1.02rem] leading-tight text-foreground transition-colors group-hover:text-primary">{friend.displayName}</p>
          </div>

          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs">
            <span className="max-w-[7.5rem] truncate font-semibold text-[rgb(var(--primary-strong))]">
              {friend.latestRecordedAt ? formatCompactDate(friend.latestRecordedAt, locale) : t("friends.noSnapshot")}
            </span>
          </div>
        </div>

        <div className="pointer-events-auto flex shrink-0 items-center gap-1.5">
          <Button asChild aria-label={`${t("friends.view")} ${friend.displayName}`} className="size-8" size="icon" title={t("friends.view")} variant="outline">
            <Link href={`/friends/${friend.friendUserId}`}>
              <UserRoundSearch className="size-3.5" />
            </Link>
          </Button>
          <Button asChild aria-label={`${t("friends.compare")} ${friend.displayName}`} className="size-8" size="icon" title={t("friends.compare")} variant="outline">
            <Link href={`/friends/${friend.friendUserId}/compare`}>
              <GitCompareArrows className="size-3.5" />
            </Link>
          </Button>
          <Button
            aria-label={`${t("common.copy")} ${friend.displayName} ${t("friends.friendCode")}`}
            className="size-8"
            onClick={handleCopyFriendCode}
            size="icon"
            title={t("common.copy")}
            type="button"
            variant="outline"
          >
            <Copy className="size-3.5" />
          </Button>
          <Button
            aria-label={`${t("friends.remove")} ${friend.displayName}`}
            className="size-8"
            disabled={isBusy}
            onClick={() => onRemove(friend)}
            size="icon"
            title={t("friends.remove")}
            type="button"
            variant="destructive"
          >
            {isBusy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          </Button>
        </div>
      </div>

      <div className="pointer-events-none relative z-10 grid grid-cols-3 divide-x divide-border/60 rounded-[0.8rem] border border-border/60 bg-surface/55 transition-colors group-hover:border-accent/35">
        {metricItems.map((item) => (
          <div className="min-w-0 px-2 py-1.5" key={item.label}>
            <p className="truncate text-[10px] font-semibold uppercase leading-none text-muted-foreground">{item.label}</p>
            <div className="mt-1 flex min-w-0 items-center gap-1">
              <p className="min-w-0 truncate font-display text-[0.95rem] leading-none text-foreground">{item.value}</p>
              <span className={`shrink-0 rounded-full px-1 py-0.5 text-[10px] font-semibold leading-none ${item.tone}`}>{item.delta}</span>
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
    <div className="grid gap-2.5">
      {friends.map((friend) => {
        const isBusy = busyFriendId === friend.friendUserId;
        return <FriendCard friend={friend} isBusy={isBusy} key={friend.friendUserId} onRemove={onRemove} />;
      })}
    </div>
  );
}
