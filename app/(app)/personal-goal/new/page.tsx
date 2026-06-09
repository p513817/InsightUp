import { PersonalGoalCreatePage } from "@/components/personal-goals/personal-goal-create-page";
import { getLatestRecord, listRecords } from "@/lib/inbody/records";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function NewPersonalGoalPage() {
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

  return <PersonalGoalCreatePage latestRecord={latestRecord} records={records} />;
}
