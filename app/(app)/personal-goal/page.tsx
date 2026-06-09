import { PersonalGoalsWorkspace } from "@/components/personal-goals/personal-goals-workspace";
import { getLatestRecord, listRecords } from "@/lib/inbody/records";
import { listPersonalGoals } from "@/lib/personal-goals";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function PersonalGoalPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [latestRecord, records] = await Promise.all([
    getLatestRecord(supabase, user.id),
    listRecords(supabase, user.id),
  ]);
  const goals = await listPersonalGoals(supabase, user.id, latestRecord, records);

  return <PersonalGoalsWorkspace goals={goals} latestRecord={latestRecord} records={records} />;
}
