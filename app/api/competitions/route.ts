import { NextResponse } from "next/server";
import { createCompetitionWithMembers, competitionCreateSchema, listCompetitionsWithProgress } from "@/lib/competitions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerTranslations } from "@/lib/i18n/server";
import { normalizeCompetitionInviteeCode } from "@/lib/competitions";

type Translator = (key: string, params?: Record<string, string | number>) => string;

function toErrorResponse(error: unknown, t: Translator) {
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

  const json = await request.json();
  const parsed = competitionCreateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || t("api.invalidPayload") }, { status: 400 });
  }

  const inviteeUserIds = new Set(
    (parsed.data.inviteeUserIds || []).filter((value) => value !== user.id),
  );

  for (const inviteeFriendCode of parsed.data.inviteeFriendCodes || []) {
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
      return NextResponse.json({ message: t("competitions.inviteNotFound") }, { status: 404 });
    }

    if (profile.user_id === user.id) {
      return NextResponse.json({ message: t("competitions.inviteSelf") }, { status: 400 });
    }

    inviteeUserIds.add(profile.user_id);
  }

  const competitionId = await createCompetitionWithMembers(supabase, parsed.data, [...inviteeUserIds]);

  if (!competitionId) {
    return NextResponse.json({ message: t("api.invalidPayload") }, { status: 400 });
  }

  return NextResponse.json({ competitionId }, { status: 201 });
}
