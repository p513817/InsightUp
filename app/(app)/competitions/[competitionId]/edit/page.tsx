import { notFound } from "next/navigation";
import { CompetitionCreatePage } from "@/components/competitions/competition-create-page";
import { listCompetitionsWithProgress } from "@/lib/competitions";
import { listFriendSnapshots } from "@/lib/friends/service";
import type { FriendSnapshot } from "@/lib/friends/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CompetitionEditPageProps = {
  params: Promise<{
    competitionId: string;
  }>;
};

function mapMemberToInvitee(member: {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  friendCode: string | null;
}): FriendSnapshot {
  return {
    friendUserId: member.userId,
    friendCode: member.friendCode ?? member.userId,
    displayName: member.displayName,
    avatarUrl: member.avatarUrl,
    linkedAt: new Date().toISOString(),
    latestRecordedAt: null,
    latestWeight: null,
    latestWeightDelta: null,
    latestMuscle: null,
    latestMuscleDelta: null,
    latestFat: null,
    latestFatDelta: null,
    latestFatPercent: null,
    latestFatPercentDelta: null,
    latestScore: null,
    latestScoreDelta: null,
    latestSourceType: null,
  };
}

export default async function CompetitionEditPage({ params }: CompetitionEditPageProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { competitionId } = await params;
  const [competitions, initialFriends] = await Promise.all([listCompetitionsWithProgress(supabase), listFriendSnapshots(supabase)]);
  const competition = competitions.find((entry) => entry.id === competitionId);

  if (!competition || competition.ownerId !== user.id) {
    notFound();
  }

  const selectedInvitees = competition.members
    .filter((member) => member.userId !== user.id)
    .map(mapMemberToInvitee);

  return (
    <CompetitionCreatePage
      competitionId={competition.id}
      initialFriends={initialFriends}
      initialName={competition.name}
      initialSelectedInvitees={selectedInvitees}
      initialTargetDate={competition.targetDate}
      mode="edit"
    />
  );
}
