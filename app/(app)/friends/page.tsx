import { FriendsWorkspace } from "@/components/friends/friends-workspace";
import { listFriendSnapshots } from "@/lib/friends/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function FriendsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const friends = await listFriendSnapshots(supabase);

  return <FriendsWorkspace initialFriends={friends} />;
}