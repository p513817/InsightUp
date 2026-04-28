import { NextResponse } from "next/server";
import { MissingFriendsInfrastructureError, removeFriend } from "@/lib/friends/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    friendUserId: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { friendUserId } = await context.params;

  try {
    await removeFriend(supabase, user.id, friendUserId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof MissingFriendsInfrastructureError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }

    throw error;
  }
}