import { redirect } from "next/navigation";
import { PersonalGoalCreatePage } from "@/components/personal-goals/personal-goal-create-page";
import { getLatestRecord, listRecords } from "@/lib/inbody/records";
import { listPersonalGoals } from "@/lib/personal-goals";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type EditPersonalGoalPageProps = {
  searchParams: Promise<{
    ids?: string;
  }>;
};

export default async function EditPersonalGoalPage({ searchParams }: EditPersonalGoalPageProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { ids } = await searchParams;
  const requestedIds = new Set((ids || "").split(",").filter(Boolean));

  if (requestedIds.size === 0) {
    redirect("/personal-goal");
  }

  const [latestRecord, records] = await Promise.all([
    getLatestRecord(supabase, user.id),
    listRecords(supabase, user.id),
  ]);
  const goals = await listPersonalGoals(supabase, user.id, latestRecord);
  const selectedGoals = goals.filter((goal) => requestedIds.has(goal.id));

  if (selectedGoals.length === 0) {
    redirect("/personal-goal");
  }

  return (
    <PersonalGoalCreatePage
      fixedTargetDate={selectedGoals[0]?.targetDate || null}
      initialGoals={selectedGoals}
      latestRecord={latestRecord}
      mode="edit"
      records={records}
      targetDateLocked={selectedGoals.some((goal) => goal.targetDateLocked)}
    />
  );
}
