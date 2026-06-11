import { notFound } from "next/navigation";
import { MiniTrendGrid } from "@/components/charts/mini-trend-grid";
import { CopyFriendCodeButton } from "@/components/friends/copy-friend-code-button";
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
      <Card className="gap-3 rounded-[1.35rem] p-3.5 sm:p-4">
        <div className="flex items-center gap-3">
          {friend.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={friend.displayName} className="size-12 rounded-full border border-border object-cover shadow-[0_8px_18px_rgba(16,35,63,0.12)] sm:size-14" src={friend.avatarUrl} />
          ) : (
            <div className="surface-avatar-fallback flex size-12 items-center justify-center rounded-full border border-border text-sm font-semibold text-foreground shadow-[0_8px_18px_rgba(16,35,63,0.12)] sm:size-14">
              {getUserInitials(friend.displayName)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[1.55rem] leading-none text-foreground sm:text-2xl">{friend.displayName}</h1>
            <div className="mt-2 flex min-w-0 items-center gap-2 text-[11px] font-semibold leading-none text-[rgb(var(--primary-strong))]">
              <span className="shrink-0 whitespace-nowrap">{friend.latestRecordedAt ? formatLongDate(friend.latestRecordedAt, locale) : t("friends.noSnapshot")}</span>
              <span aria-hidden="true" className="size-1 rounded-full bg-border" />
              <span className="inline-flex min-w-0 items-center gap-0.5 text-primary">
                <span className="truncate leading-none">{friend.friendCode}</span>
                <CopyFriendCodeButton displayName={friend.displayName} friendCode={friend.friendCode} />
              </span>
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
