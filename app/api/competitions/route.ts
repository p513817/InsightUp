import { NextResponse } from "next/server";
import {
  competitionCreateSchema,
  createCompetitionWithMembers,
  isCompetitionInviteeSelfError,
  isCompetitionInviteeValidationError,
  listCompetitionsWithProgress,
  validateCompetitionInviteeFriendCodes,
  validateCompetitionInviteeUserIds,
} from "@/lib/competitions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerTranslations } from "@/lib/i18n/server";

type Translator = (key: string, params?: Record<string, string | number>) => string;

function toErrorResponse(error: unknown, t: Translator) {
  if (isCompetitionInviteeSelfError(error)) {
    return NextResponse.json({ message: t("competitions.inviteSelf") }, { status: 400 });
  }

  if (isCompetitionInviteeValidationError(error)) {
    return NextResponse.json({ message: t("competitions.inviteNotFound") }, { status: 404 });
  }

  if (error instanceof Error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: t("api.invalidPayload") }, { status: 400 });
}

export async function GET() {
  const { t } = await getServerTranslations();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: t("api.unauthorized") }, { status: 401 });
  }

  const competitions = await listCompetitionsWithProgress(supabase);
  return NextResponse.json({ competitions });
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

    const inviteeUserIds = await validateCompetitionInviteeUserIds(supabase, user.id, parsed.data.inviteeUserIds || []);
    const inviteeFriendCodes = await validateCompetitionInviteeFriendCodes(supabase, user.id, parsed.data.inviteeFriendCodes || []);
    const competitionId = await createCompetitionWithMembers(
      supabase,
      parsed.data,
      inviteeUserIds,
      inviteeFriendCodes,
    );

    if (!competitionId) {
      return NextResponse.json({ message: t("api.invalidPayload") }, { status: 400 });
    }

    return NextResponse.json({ competitionId }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, t);
  }
}
