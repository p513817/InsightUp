import { CompetitionsWorkspace } from "@/components/competitions/competitions-workspace";
import { listCompetitionsWithProgress } from "@/lib/competitions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function CompetitionsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const competitions = await listCompetitionsWithProgress(supabase);

  return <CompetitionsWorkspace competitions={competitions} userId={user.id} />;
}
