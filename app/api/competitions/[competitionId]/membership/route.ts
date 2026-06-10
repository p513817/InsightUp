import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerTranslations } from "@/lib/i18n/server";

type RouteContext = {
  params: Promise<{
    competitionId: string;
  }>;
};

const competitionMemberResponseSchema = z.object({
  status: z.enum(["accepted", "declined"]),
});

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
  const json = await request.json();
  const parsed = competitionMemberResponseSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || t("api.invalidPayload") }, { status: 400 });
  }

  const { data: member, error } = await supabase
    .from("competition_members")
    .select("id, competition_id, user_id, display_name, avatar_url, friend_code, role, status, invited_by_user_id, joined_at, created_at, updated_at")
    .eq("competition_id", competitionId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!member) {
    return NextResponse.json({ message: t("competitions.notFound") }, { status: 404 });
  }

  if (member.role === "owner") {
    return NextResponse.json({ message: t("competitions.ownerCannotLeave") }, { status: 400 });
  }

  const nextJoinedAt = parsed.data.status === "accepted" ? new Date().toISOString() : null;

  const { error: updateError } = await supabase
    .from("competition_members")
    .update({
      status: parsed.data.status,
      joined_at: nextJoinedAt,
    })
    .eq("id", member.id)
    .eq("user_id", user.id);

  if (updateError) {
    throw updateError;
  }

  return NextResponse.json({
    member: {
      ...member,
      status: parsed.data.status,
      joined_at: nextJoinedAt,
      updated_at: new Date().toISOString(),
    },
  });
}
