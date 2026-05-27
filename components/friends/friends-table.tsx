"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocale, useTranslations } from "@/components/i18n-provider";
import type { FriendSnapshot } from "@/lib/friends/types";
import { formatDecimal, formatLongDate, formatSourceType, getUserInitials } from "@/lib/presentation";

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

function deltaTone(value: number | null | undefined) {
  if (value == null || Number(value) === 0) {
    return "text-muted-foreground";
  }

  return Number(value) > 0 ? "text-success" : "text-danger";
}

function MobileFriendCard({ friend, isBusy, onRemove }: { friend: FriendSnapshot; isBusy: boolean; onRemove: (friend: FriendSnapshot) => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const metricItems = [
    {
      label: t("friends.labels.weight"),
      value: formatDecimal(friend.latestWeight),
      delta: formatDelta(friend.latestWeightDelta),
      deltaClassName: deltaTone(friend.latestWeightDelta),
    },
    {
      label: t("friends.labels.muscle"),
      value: formatDecimal(friend.latestMuscle),
      delta: formatDelta(friend.latestMuscleDelta),
      deltaClassName: deltaTone(friend.latestMuscleDelta),
    },
    {
      label: t("friends.labels.fatPercent"),
      value: formatDecimal(friend.latestFatPercent),
      delta: formatDelta(friend.latestFatPercentDelta),
      deltaClassName: deltaTone(friend.latestFatPercentDelta),
    },
  ];

  return (
    <Card className="gap-3.5 border-border/60 bg-card/90 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {friend.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={friend.displayName} className="size-10 rounded-full border border-border object-cover" src={friend.avatarUrl} />
          ) : (
            <div className="surface-avatar-fallback flex size-10 items-center justify-center rounded-full border border-border text-sm font-semibold text-foreground">
              {getUserInitials(friend.displayName)}
            </div>
          )}

          <div className="min-w-0">
            <p className="truncate font-display text-[1.08rem] leading-none text-foreground">{friend.displayName}</p>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              {t("friends.latestDate")} {formatLongDate(friend.latestRecordedAt, locale)}
            </p>
          </div>
        </div>

        <Button className="size-9" disabled={isBusy} onClick={() => onRemove(friend)} size="icon" type="button" variant="ghost">
          {isBusy ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {metricItems.map((item) => (
          <div className="surface-subtle-gradient rounded-[1rem] border border-border/70 px-3 py-2.5" key={item.label}>
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
            <p className="mt-1 font-display text-[1rem] leading-tight text-foreground">{item.value}</p>
            <p className={`mt-1 text-[11px] leading-4 ${item.deltaClassName}`}>{item.delta}</p>
          </div>
        ))}
      </div>

      <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
        <div className="space-y-1 leading-5">
          <p>
            {t("friends.friendCode")}: <span className="font-mono text-[11px] text-foreground">{friend.friendCode}</span>
          </p>
          <p>
            {t("friends.latestSource")}: <span className="text-foreground">{friend.latestSourceType ? formatSourceType(friend.latestSourceType) : "-"}</span>
          </p>
        </div>
        <div className="space-y-1 text-right leading-5">
          <p>
            {t("friends.fat")}: <span className="text-foreground">{formatDecimal(friend.latestFat)}</span>
            <span className={`ml-1 ${deltaTone(friend.latestFatDelta)}`}>{formatDelta(friend.latestFatDelta)}</span>
          </p>
          <p>
            {t("friends.score")}: <span className="text-foreground">{formatDecimal(friend.latestScore)}</span>
            <span className={`ml-1 ${deltaTone(friend.latestScoreDelta)}`}>{formatDelta(friend.latestScoreDelta)}</span>
          </p>
        </div>
      </div>
    </Card>
  );
}

export function FriendsTable({ busyFriendId, friends, onAdd, onRemove }: FriendsTableProps) {
  const t = useTranslations();
  const locale = useLocale();

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
      <div className="surface-table-shell hidden overflow-hidden rounded-[1.2rem] lg:block sm:rounded-[1.75rem]">
        <div className="overflow-x-auto">
          <table className="min-w-[47rem] border-collapse text-left sm:min-w-full">
            <thead>
              <tr className="surface-table-head border-b border-border/70 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <th className="px-3 py-3 font-medium sm:px-5 sm:py-4">{t("friends.title")}</th>
                <th className="hidden px-4 py-4 font-medium md:table-cell">{t("friends.friendCode")}</th>
                <th className="px-3 py-3 font-medium sm:px-4 sm:py-4">{t("friends.latestDate")}</th>
                <th className="px-3 py-3 font-medium sm:px-4 sm:py-4">{t("friends.labels.weight")}</th>
                <th className="px-3 py-3 font-medium sm:px-4 sm:py-4">{t("friends.labels.muscle")}</th>
                <th className="hidden px-4 py-4 font-medium lg:table-cell">{t("friends.fat")}</th>
                <th className="hidden px-4 py-4 font-medium lg:table-cell">{t("friends.labels.fatPercent")}</th>
                <th className="hidden px-4 py-4 font-medium xl:table-cell">{t("friends.score")}</th>
                <th className="hidden px-4 py-4 font-medium xl:table-cell">{t("friends.latestSource")}</th>
                <th className="px-3 py-3 text-right font-medium sm:px-5 sm:py-4">{t("friends.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {friends.map((friend) => {
                const isBusy = busyFriendId === friend.friendUserId;

                return (
                  <tr className="border-b border-border/55 last:border-b-0" key={friend.friendUserId}>
                    <td className="px-3 py-3 align-middle sm:px-5 sm:py-4">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        {friend.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt={friend.displayName} className="size-9 rounded-full border border-border object-cover sm:size-11" src={friend.avatarUrl} />
                        ) : (
                          <div className="surface-avatar-fallback flex size-9 items-center justify-center rounded-full border border-border text-xs font-semibold text-foreground sm:size-11 sm:text-sm">
                            {getUserInitials(friend.displayName)}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground sm:text-base">{friend.displayName}</p>
                          <p className="text-[11px] leading-4 text-muted-foreground sm:text-xs">
            {t("friends.addedOn")} {formatLongDate(friend.linkedAt, locale)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-4 font-mono text-xs text-foreground md:table-cell">{friend.friendCode}</td>
                    <td className="px-3 py-3 text-xs text-foreground sm:px-4 sm:py-4 sm:text-sm">{formatLongDate(friend.latestRecordedAt, locale)}</td>
                    <td className="px-3 py-3 text-xs text-foreground sm:px-4 sm:py-4 sm:text-sm">{formatDecimal(friend.latestWeight)}</td>
                    <td className="px-3 py-3 text-xs text-foreground sm:px-4 sm:py-4 sm:text-sm">{formatDecimal(friend.latestMuscle)}</td>
                    <td className="hidden px-4 py-4 text-sm text-foreground lg:table-cell">{formatDecimal(friend.latestFat)}</td>
                    <td className="hidden px-4 py-4 text-sm text-foreground lg:table-cell">{formatDecimal(friend.latestFatPercent)}</td>
                    <td className="hidden px-4 py-4 text-sm text-foreground xl:table-cell">{formatDecimal(friend.latestScore)}</td>
                    <td className="hidden px-4 py-4 text-sm text-foreground xl:table-cell">{friend.latestSourceType ? formatSourceType(friend.latestSourceType) : "-"}</td>
                    <td className="px-3 py-3 text-right sm:px-5 sm:py-4">
                      <Button className="h-8 px-2.5 text-[11px] sm:h-9 sm:px-4 sm:text-xs" disabled={isBusy} onClick={() => onRemove(friend)} size="sm" type="button" variant="ghost">
                        {isBusy ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        {t("friends.remove")}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 lg:hidden">
        {friends.map((friend) => {
          const isBusy = busyFriendId === friend.friendUserId;
          return <MobileFriendCard friend={friend} isBusy={isBusy} key={friend.friendUserId} onRemove={onRemove} />;
        })}
      </div>
    </>
  );
}
