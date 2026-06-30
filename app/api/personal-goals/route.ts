import { NextResponse } from "next/server";
import { getLatestRecord, listRecords } from "@/lib/inbody/records";
import {
  createPersonalGoal,
  createPersonalGoals,
  listPersonalGoals,
  personalGoalBatchCreateSchema,
  personalGoalCreateSchema,
  stripCompetitionGoalFields,
} from "@/lib/personal-goals";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const [latestRecord, records] = await Promise.all([
    getLatestRecord(supabase, user.id),
    listRecords(supabase, user.id),
  ]);
  const goals = await listPersonalGoals(supabase, user.id, latestRecord, records);
  return NextResponse.json({ goals });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const batchParsed = personalGoalBatchCreateSchema.safeParse(json);
  const latestRecord = await getLatestRecord(supabase, user.id);

  if (batchParsed.success) {
    const goals = await createPersonalGoals(
      supabase,
      user.id,
      batchParsed.data.goals.map((goal) => stripCompetitionGoalFields(goal)),
      latestRecord,
    );
    return NextResponse.json({ goals }, { status: 201 });
  }

  const parsed = personalGoalCreateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: batchParsed.error.issues[0]?.message || parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
  }

  const goal = await createPersonalGoal(supabase, user.id, stripCompetitionGoalFields(parsed.data), latestRecord);
  return NextResponse.json({ goal }, { status: 201 });
}
