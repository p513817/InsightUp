import { NextResponse } from "next/server";
import {
  competitionCreateSchema,
  competitionUpdateSchema,
  createCompetitionWithMembers,
  deleteCompetitionWithMembers,
  getCompetitionLeaderBoard,
  getCompetitionMemberByUserId,
  listCompetitionsWithProgress,
  normalizeCompetitionInviteeCode,
  updateCompetitionWithMembers,
} from "@/lib/competitions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerTranslations } from "@/lib/i18n/server";

type RouteContext = {
  params: Promise<{
    competitionId: string;
  }>;
};

async function resolveInviteeUserIds(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  inviteeUserIds: string[],
  inviteeFriendCodes: string[],
  t: Awaited<ReturnType<typeof getServerTranslations>>["t"],
) {
  const resolved = new Set(inviteeUserIds.filter((value) => value !== userId));

  for (const inviteeFriendCode of inviteeFriendCodes) {
    const normalized = normalizeCompetitionInviteeCode(inviteeFriendCode);
    if (!normalized) {
      continue;
    }

    const { data, error } = await supabase.rpc("find_user_profile_by_friend_code", {
      input_code: normalized,
    });

    if (error) {
      throw error;
    }

    const profile = ((data || []) as Array<{ user_id: string }>)[0];
    if (!profile) {
      return { error: NextResponse.json({ message: t("competitions.inviteNotFound") }, { status: 404 }) };
    }

    if (profile.user_id === userId) {
      return { error: NextResponse.json({ message: t("competitions.inviteSelf") }, { status: 400 }) };
    }

    resolved.add(profile.user_id);
  }

  return { inviteeUserIds: [...resolved] };
}

export async function GET(_request: Request, context: RouteContext) {
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

  const currentUserMember = getCompetitionMemberByUserId(competition, user.id);

  return NextResponse.json({
    competition: {
      ...competition,
      currentUserMember,
      leaderboard: getCompetitionLeaderBoard(competition),
    },
  });
}

export async function POST(request: Request) {
  const { t } = await getServerTranslations();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: t("api.unauthorized") }, { status: 401 });
  }

  const json = await request.json();
  const parsed = competitionCreateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || t("api.invalidPayload") }, { status: 400 });
  }

  const invitees = await resolveInviteeUserIds(supabase, user.id, parsed.data.inviteeUserIds || [], parsed.data.inviteeFriendCodes || [], t);
  if ("error" in invitees) {
    return invitees.error;
  }

  const competitionId = await createCompetitionWithMembers(supabase, parsed.data, invitees.inviteeUserIds);

  if (!competitionId) {
    return NextResponse.json({ message: t("api.invalidPayload") }, { status: 400 });
  }

  return NextResponse.json({ competitionId }, { status: 201 });
}

export async function PATCH(request: Request, context: RouteContext) {
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

  if (competition.ownerId !== user.id) {
    return NextResponse.json({ message: t("competitions.notFound") }, { status: 404 });
  }

  const json = await request.json();
  const parsed = competitionUpdateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || t("api.invalidPayload") }, { status: 400 });
  }

  const invitees = await resolveInviteeUserIds(supabase, user.id, parsed.data.inviteeUserIds || [], parsed.data.inviteeFriendCodes || [], t);
  if ("error" in invitees) {
    return invitees.error;
  }

  const updatedCompetitionId = await updateCompetitionWithMembers(supabase, competitionId, parsed.data, invitees.inviteeUserIds);

  if (!updatedCompetitionId) {
    return NextResponse.json({ message: t("api.invalidPayload") }, { status: 400 });
  }

  return NextResponse.json({ competitionId: updatedCompetitionId });
}

export async function DELETE(_request: Request, context: RouteContext) {
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

  if (competition.ownerId !== user.id) {
    return NextResponse.json({ message: t("competitions.notFound") }, { status: 404 });
  }

  const deletedCompetitionId = await deleteCompetitionWithMembers(supabase, competitionId);

  if (!deletedCompetitionId) {
    return NextResponse.json({ message: t("api.invalidPayload") }, { status: 400 });
  }

  return NextResponse.json({ competitionId: deletedCompetitionId });
}
