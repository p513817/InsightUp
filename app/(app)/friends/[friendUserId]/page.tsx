import { notFound } from "next/navigation";
import { FriendTrendWorkspace } from "@/components/friends/friend-trend-workspace";
import { listFriendRecords, listFriendSnapshots } from "@/lib/friends/service";
import { buildChartPayload } from "@/lib/inbody/records";
import { getServerTranslations } from "@/lib/i18n/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type FriendPageProps = {
  params: Promise<{
    friendUserId: string;
  }>;
};

export default async function FriendDetailPage({ params }: FriendPageProps) {
  const { friendUserId } = await params;
  const { locale } = await getServerTranslations();
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

  return <FriendTrendWorkspace chart={chart} friend={friend} />;
}
