import { NextResponse } from "next/server";
import { addFriendSchema } from "@/lib/friends/schema";
import {
  addFriendByCode,
  DuplicateFriendshipError,
  ensureCurrentUserProfile,
  FriendNotFoundError,
  listFriendSnapshots,
  MissingFriendsInfrastructureError,
  SelfFriendshipError,
} from "@/lib/friends/service";
import { getServerTranslations } from "@/lib/i18n/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Translator = (key: string, params?: Record<string, string | number>) => string;

function toErrorResponse(error: unknown, t: Translator) {
  if (error instanceof MissingFriendsInfrastructureError) {
    return NextResponse.json({ message: t("api.friendsInfraMissing") }, { status: 503 });
  }

  if (error instanceof FriendNotFoundError) {
    return NextResponse.json({ message: error.message }, { status: 404 });
  }

  if (error instanceof DuplicateFriendshipError) {
    return NextResponse.json({ message: error.message }, { status: 409 });
  }

  if (error instanceof SelfFriendshipError) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  throw error;
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

  try {
    const [profile, friends] = await Promise.all([ensureCurrentUserProfile(supabase, user), listFriendSnapshots(supabase)]);
    return NextResponse.json({ friends, profile });
  } catch (error) {
    return toErrorResponse(error, t);
  }
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
  const parsed = addFriendSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || t("api.invalidPayload") }, { status: 400 });
  }

  try {
    await ensureCurrentUserProfile(supabase, user);
    const friend = await addFriendByCode(supabase, user.id, parsed.data.friendCode);
    return NextResponse.json({ friend }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, t);
  }
}
