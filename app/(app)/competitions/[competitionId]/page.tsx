import { notFound, redirect } from "next/navigation";
import { CompetitionDetailWorkspace } from "@/components/competitions/competition-detail-workspace";
import { getCompetitionById, listCompetitionsWithProgress } from "@/lib/competitions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CompetitionDetailPageProps = {
  params: Promise<{
    competitionId: string;
  }>;
};

export default async function CompetitionDetailPage({ params }: CompetitionDetailPageProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { competitionId } = await params;
  const competitions = await listCompetitionsWithProgress(supabase);
  const competition = getCompetitionById(competitions, competitionId);

  if (!competition) {
    notFound();
  }

  const currentMember = competition.members.find((member) => member.userId === user.id) ?? null;
  if (currentMember?.status === "invited") {
    redirect("/competitions");
  }

  return <CompetitionDetailWorkspace competition={competition} userId={user.id} />;
}
