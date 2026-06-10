import { redirect } from "next/navigation";
import { PersonalGoalCreatePage } from "@/components/personal-goals/personal-goal-create-page";
import { getLatestRecord, listRecords } from "@/lib/inbody/records";
import { getCompetitionById, getCompetitionMemberByUserId, listCompetitionsWithProgress } from "@/lib/competitions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CompetitionGoalNewPageProps = {
  params: Promise<{
    competitionId: string;
  }>;
};

export default async function CompetitionGoalNewPage({ params }: CompetitionGoalNewPageProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { competitionId } = await params;
  const [latestRecord, records, competitions] = await Promise.all([
    getLatestRecord(supabase, user.id),
    listRecords(supabase, user.id),
    listCompetitionsWithProgress(supabase),
  ]);
  const competition = getCompetitionById(competitions, competitionId);

  if (!competition) {
    redirect("/competitions");
  }

  const member = getCompetitionMemberByUserId(competition, user.id);
  if (!member || (member.role !== "owner" && member.status !== "accepted")) {
    redirect(`/competitions/${competitionId}`);
  }

  return (
    <PersonalGoalCreatePage
      cancelHref={`/competitions/${competitionId}`}
      createEndpoint={`/api/competitions/${competitionId}/goals`}
      fixedTitle={competition.name}
      fixedTargetDate={competition.targetDate}
      latestRecord={latestRecord}
      records={records}
      successHref={`/competitions/${competitionId}`}
      titleLocked
      targetDateLocked
    />
  );
}
