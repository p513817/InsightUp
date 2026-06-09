import { NextResponse } from "next/server";
import { getLatestRecord } from "@/lib/inbody/records";
import {
  personalGoalUpdateSchema,
  softDeletePersonalGoal,
  updatePersonalGoal,
} from "@/lib/personal-goals";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    goalId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { goalId } = await context.params;
  const json = await request.json();
  const parsed = personalGoalUpdateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
  }

  const latestRecord = await getLatestRecord(supabase, user.id);
  const goal = await updatePersonalGoal(supabase, user.id, goalId, parsed.data, latestRecord);
  return NextResponse.json({ goal });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { goalId } = await context.params;
  await softDeletePersonalGoal(supabase, user.id, goalId);
  return NextResponse.json({ success: true });
}
