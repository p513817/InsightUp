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
import { createServerSupabaseClient } from "@/lib/supabase/server";

function toErrorResponse(error: unknown) {
  if (error instanceof MissingFriendsInfrastructureError) {
    return NextResponse.json({ message: error.message }, { status: 503 });
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
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const [profile, friends] = await Promise.all([ensureCurrentUserProfile(supabase, user), listFriendSnapshots(supabase)]);
    return NextResponse.json({ friends, profile });
  } catch (error) {
    return toErrorResponse(error);
  }
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
  const parsed = addFriendSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
  }

  try {
    await ensureCurrentUserProfile(supabase, user);
    const friend = await addFriendByCode(supabase, user.id, parsed.data.friendCode);
    return NextResponse.json({ friend }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}