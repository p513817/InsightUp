import { notFound } from "next/navigation";
import { MiniTrendGrid } from "@/components/charts/mini-trend-grid";
import { Card } from "@/components/ui/card";
import { listFriendRecords, listFriendSnapshots } from "@/lib/friends/service";
import { buildChartPayload } from "@/lib/inbody/records";
import { getServerTranslations } from "@/lib/i18n/server";
import { formatLongDate, getUserInitials } from "@/lib/presentation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type FriendPageProps = {
  params: Promise<{
    friendUserId: string;
  }>;
};

export default async function FriendDetailPage({ params }: FriendPageProps) {
  const { friendUserId } = await params;
  const { locale, t } = await getServerTranslations();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [friends, records] = await Promise.all([listFriendSnapshots(supabase), listFriendRecords(supabase, friendUserId)]);
  const friend = friends.find((entry) => entry.friendUserId === friendUserId);

  if (!friend) {
    notFound();
  }

  const chart = buildChartPayload(records, "overall", locale);

  return (
    <div className="space-y-4 pb-24 sm:space-y-6 sm:pb-28">
      <Card className="gap-4 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          {friend.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={friend.displayName} className="size-14 rounded-full border border-border object-cover shadow-[0_8px_18px_rgba(16,35,63,0.12)]" src={friend.avatarUrl} />
          ) : (
            <div className="surface-avatar-fallback flex size-14 items-center justify-center rounded-full border border-border text-sm font-semibold text-foreground shadow-[0_8px_18px_rgba(16,35,63,0.12)]">
              {getUserInitials(friend.displayName)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl leading-tight text-foreground">{friend.displayName}</h1>
            <div className="mt-2 flex min-w-0 flex-wrap gap-2">
              <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">{friend.latestRecordedAt ? formatLongDate(friend.latestRecordedAt, locale) : t("friends.noSnapshot")}</span>
              <span className="rounded-full bg-primary/8 px-2.5 py-1 font-mono text-[11px] font-semibold text-primary">{friend.friendCode}</span>
            </div>
          </div>
        </div>
      </Card>

      <section>
        <MiniTrendGrid chart={chart} layout="one" />
      </section>
    </div>
  );
}
