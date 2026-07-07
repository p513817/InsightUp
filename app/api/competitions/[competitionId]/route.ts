import { NextResponse } from "next/server";
import {
  competitionCreateSchema,
  competitionUpdateSchema,
  createCompetitionWithMembers,
  deleteCompetitionWithMembers,
  getCompetitionLeaderBoard,
  getCompetitionMemberByUserId,
  isCompetitionInviteeSelfError,
  isCompetitionInviteeValidationError,
  listCompetitionsWithProgress,
  updateCompetitionWithMembers,
  validateCompetitionInviteeFriendCodes,
  validateCompetitionInviteeUserIds,
} from "@/lib/competitions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerTranslations } from "@/lib/i18n/server";

type RouteContext = {
  params: Promise<{
    competitionId: string;
  }>;
};

async function resolveInvitees(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  inviteeUserIds: string[],
  inviteeFriendCodes: string[],
  t: Awaited<ReturnType<typeof getServerTranslations>>["t"],
) {
  try {
    const [validatedInviteeUserIds, validatedInviteeFriendCodes] = await Promise.all([
      validateCompetitionInviteeUserIds(supabase, userId, inviteeUserIds),
      validateCompetitionInviteeFriendCodes(supabase, userId, inviteeFriendCodes),
    ]);

    return {
      inviteeUserIds: validatedInviteeUserIds,
      inviteeFriendCodes: validatedInviteeFriendCodes,
    };
  } catch (error) {
    if (isCompetitionInviteeSelfError(error)) {
      return { error: NextResponse.json({ message: t("competitions.inviteSelf") }, { status: 400 }) };
    }

    if (isCompetitionInviteeValidationError(error)) {
      return { error: NextResponse.json({ message: t("competitions.inviteNotFound") }, { status: 404 }) };
    }

    throw error;
  }
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

  try {
    const json = await request.json();
    const parsed = competitionCreateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || t("api.invalidPayload") }, { status: 400 });
    }

    const invitees = await resolveInvitees(supabase, user.id, parsed.data.inviteeUserIds || [], parsed.data.inviteeFriendCodes || [], t);
    if ("error" in invitees) {
      return invitees.error;
    }

    const competitionId = await createCompetitionWithMembers(
      supabase,
      parsed.data,
      invitees.inviteeUserIds,
      invitees.inviteeFriendCodes,
    );

    if (!competitionId) {
      return NextResponse.json({ message: t("api.invalidPayload") }, { status: 400 });
    }

    return NextResponse.json({ competitionId }, { status: 201 });
  } catch (error) {
    if (isCompetitionInviteeSelfError(error)) {
      return NextResponse.json({ message: t("competitions.inviteSelf") }, { status: 400 });
    }

    if (isCompetitionInviteeValidationError(error)) {
      return NextResponse.json({ message: t("competitions.inviteNotFound") }, { status: 404 });
    }

    throw error;
  }
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

  try {
    const json = await request.json();
    const parsed = competitionUpdateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || t("api.invalidPayload") }, { status: 400 });
    }

    const invitees = await resolveInvitees(supabase, user.id, parsed.data.inviteeUserIds || [], parsed.data.inviteeFriendCodes || [], t);
    if ("error" in invitees) {
      return invitees.error;
    }

    const updatedCompetitionId = await updateCompetitionWithMembers(
      supabase,
      competitionId,
      parsed.data,
      invitees.inviteeUserIds,
      invitees.inviteeFriendCodes,
    );

    if (!updatedCompetitionId) {
      return NextResponse.json({ message: t("api.invalidPayload") }, { status: 400 });
    }

    return NextResponse.json({ competitionId: updatedCompetitionId });
  } catch (error) {
    if (isCompetitionInviteeSelfError(error)) {
      return NextResponse.json({ message: t("competitions.inviteSelf") }, { status: 400 });
    }

    if (isCompetitionInviteeValidationError(error)) {
      return NextResponse.json({ message: t("competitions.inviteNotFound") }, { status: 404 });
    }

    throw error;
  }
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
