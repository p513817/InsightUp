import { notFound } from "next/navigation";
import type { FriendCompareMetricItem } from "@/components/friends/friend-compare-grid";
import { FriendCompareWorkspace } from "@/components/friends/friend-compare-workspace";
import { Card } from "@/components/ui/card";
import { listFriendRecords, listFriendSnapshots } from "@/lib/friends/service";
import { buildChartPayload, getLatestIncludedRecord, listRecords } from "@/lib/inbody/records";
import type { ChartMetric, InbodyRecord } from "@/lib/inbody/types";
import { getServerTranslations } from "@/lib/i18n/server";
import { formatDecimal, formatLongDate, getUserInitials, summarizeUser } from "@/lib/presentation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type FriendComparePageProps = {
  params: Promise<{
    friendUserId: string;
  }>;
};

function getRecordMetricValue(record: InbodyRecord | null, key: string) {
  return record ? ((record as unknown as Record<string, number | null>)[key] ?? null) : null;
}

function formatDifference(myValue: number | null, friendValue: number | null) {
  if (myValue == null || friendValue == null) {
    return "-";
  }

  const diff = friendValue - myValue;
  return `${diff > 0 ? "+" : ""}${formatDecimal(diff)}`;
}

export default async function FriendComparePage({ params }: FriendComparePageProps) {
  const { friendUserId } = await params;
  const { locale, t } = await getServerTranslations();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [friends, friendRecords, myRecords] = await Promise.all([listFriendSnapshots(supabase), listFriendRecords(supabase, friendUserId, 5), listRecords(supabase, user.id)]);
  const friend = friends.find((entry) => entry.friendUserId === friendUserId);

  if (!friend) {
    notFound();
  }

  const friendLatest = getLatestIncludedRecord(friendRecords);
  const myLatest = getLatestIncludedRecord(myRecords);
  const me = summarizeUser(user);
  const metrics = buildChartPayload(friendRecords.length ? friendRecords : myRecords, "overall", locale).metrics;
  const compareItems: FriendCompareMetricItem[] = metrics.map((metric) => {
    const myValue = getRecordMetricValue(myLatest, metric.key);
    const friendValue = getRecordMetricValue(friendLatest, metric.key);

    return {
      diffText: formatDifference(myValue, friendValue),
      friendText: formatDecimal(friendValue),
      friendValue,
      isSecondary: !["weight", "muscle", "fatPercent"].includes(metric.key),
      key: metric.key,
      label: metric.label,
      myText: formatDecimal(myValue),
      myValue,
      unit: metric.unit,
    };
  });

  return (
    <div className="space-y-4 pb-24 sm:space-y-6 sm:pb-28">
      <Card className="gap-0 overflow-hidden p-3 sm:p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
          <div className="flex min-w-0 flex-col items-center rounded-[0.9rem] bg-muted/35 px-2 py-2.5 text-center sm:px-3">
            {!me.avatarUrl ? (
              <div className="surface-avatar-fallback flex size-10 items-center justify-center rounded-full border border-border text-sm font-semibold text-foreground shadow-[0_8px_18px_rgba(16,35,63,0.1)] sm:size-11">
                {getUserInitials(me.name)}
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={me.name} className="size-10 rounded-full border border-border object-cover shadow-[0_8px_18px_rgba(16,35,63,0.1)] sm:size-11" src={me.avatarUrl} />
            )}
            <p className="mt-1.5 max-w-full truncate font-display text-[0.98rem] leading-tight text-foreground sm:text-base">{me.name}</p>
            <p className="mt-1 max-w-full truncate text-[11px] text-muted-foreground sm:text-xs">{myLatest ? formatLongDate(myLatest.date, locale) : "-"}</p>
          </div>

          <div className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-card text-[11px] font-semibold text-muted-foreground shadow-[0_8px_18px_rgba(16,35,63,0.08)] sm:size-10">
            VS
          </div>

          <div className="flex min-w-0 flex-col items-center rounded-[0.9rem] bg-primary/7 px-2 py-2.5 text-center sm:px-3">
            {friend.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={friend.displayName} className="size-10 rounded-full border border-border object-cover shadow-[0_8px_18px_rgba(16,35,63,0.1)] sm:size-11" src={friend.avatarUrl} />
            ) : (
              <div className="surface-avatar-fallback flex size-10 items-center justify-center rounded-full border border-border text-sm font-semibold text-foreground shadow-[0_8px_18px_rgba(16,35,63,0.1)] sm:size-11">
                {getUserInitials(friend.displayName)}
              </div>
            )}
            <p className="mt-1.5 max-w-full truncate font-display text-[0.98rem] leading-tight text-foreground sm:text-base">{friend.displayName}</p>
            <p className="mt-1 max-w-full truncate text-[11px] text-muted-foreground sm:text-xs">{friendLatest ? formatLongDate(friendLatest.date, locale) : "-"}</p>
          </div>
        </div>
      </Card>

      <FriendCompareWorkspace friendUserId={friendUserId} items={compareItems} />
    </div>
  );
}
