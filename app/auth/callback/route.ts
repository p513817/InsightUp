import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function sanitizeNextPath(nextValue: string | null) {
  if (!nextValue || !nextValue.startsWith("/")) {
    return "/dashboard";
  }

  return nextValue;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = sanitizeNextPath(requestUrl.searchParams.get("next"));
  const failureUrl = new URL("/", request.url);

  failureUrl.searchParams.set("auth", "failed");

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const redirectUrl = new URL(nextPath, request.url);

      if (redirectUrl.pathname === "/dashboard") {
        redirectUrl.searchParams.set("welcome", "1");
      }

      const response = NextResponse.redirect(redirectUrl);

      return response;
    }

    failureUrl.searchParams.set("message", error.message);
    return NextResponse.redirect(failureUrl);
  }

  return NextResponse.redirect(failureUrl);
}
