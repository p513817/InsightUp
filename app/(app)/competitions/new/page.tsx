import { CompetitionCreatePage } from "@/components/competitions/competition-create-page";
import { listFriendSnapshots } from "@/lib/friends/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function NewCompetitionPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const initialFriends = await listFriendSnapshots(supabase);

  return <CompetitionCreatePage initialFriends={initialFriends} />;
}
