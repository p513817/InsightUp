import { NextResponse } from "next/server";
import { z } from "zod";
import { createPersonalGoals, listPersonalGoals, personalGoalBatchCreateSchema } from "@/lib/personal-goals";
import { getLatestRecord, listRecords } from "@/lib/inbody/records";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerTranslations } from "@/lib/i18n/server";
import { listCompetitionsWithProgress } from "@/lib/competitions";

type RouteContext = {
  params: Promise<{
    competitionId: string;
  }>;
};

const competitionGoalCreateRequestSchema = z.object({
  goals: personalGoalBatchCreateSchema.shape.goals,
});

export async function POST(request: Request, context: RouteContext) {
  const { t } = await getServerTranslations();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: t("api.unauthorized") }, { status: 401 });
  }

  const { competitionId } = await context.params;
  const competitions = await listCompetitionsWithProgress(supabase);
  const competition = competitions.find((entry) => entry.id === competitionId);

  if (!competition) {
    return NextResponse.json({ message: t("competitions.notFound") }, { status: 404 });
  }

  const member = competition.members.find((entry) => entry.userId === user.id);
  if (!member || (member.role !== "owner" && member.status !== "accepted")) {
    return NextResponse.json({ message: t("competitions.goalLockedUntilAccepted") }, { status: 409 });
  }

  const json = await request.json();
  const parsed = competitionGoalCreateRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || t("api.invalidPayload") }, { status: 400 });
  }

  const [latestRecord, records] = await Promise.all([
    getLatestRecord(supabase, user.id),
    listRecords(supabase, user.id),
  ]);

  const createPayload = parsed.data.goals.map((goal) => ({
    ...goal,
    title: competition.name,
    competitionId,
    competitionMemberId: member.id,
    targetDate: competition.targetDate,
    targetDateLocked: true,
  }));

  const created = await createPersonalGoals(supabase, user.id, createPayload, latestRecord);
  const createdIds = new Set(created.map((goal) => goal.id));
  const allGoals = await listPersonalGoals(supabase, user.id, latestRecord, records);
  const goals = allGoals.filter((goal) => createdIds.has(goal.id));

  return NextResponse.json({ goals }, { status: 201 });
}
