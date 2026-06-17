import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { E2E_PERSONAS, isE2EPersonaKey } from "@/lib/test-auth/personas";
import { ensureE2EPersonas, getE2EPersonaCredentials } from "@/lib/test-auth/supabase";
import { validateTestAuthRequest } from "../_shared";

function sanitizeNextPath(value: unknown) {
  return typeof value === "string" && value.startsWith("/") ? value : "/dashboard";
}

export async function POST(request: NextRequest) {
  const guardResponse = validateTestAuthRequest(request);
  if (guardResponse) {
    return guardResponse;
  }

  const body = await request.json().catch(() => ({}));
  const personaKey = typeof body.persona === "string" ? body.persona : "alice";

  if (!isE2EPersonaKey(personaKey)) {
    return NextResponse.json({ message: "Unknown test persona" }, { status: 400 });
  }

  await ensureE2EPersonas();

  const supabase = await createServerSupabaseClient();
  const { email, password } = getE2EPersonaCredentials(personaKey);
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 401 });
  }

  return NextResponse.json({
    next: sanitizeNextPath(body.next),
    persona: {
      displayName: E2E_PERSONAS[personaKey].displayName,
      email,
      key: personaKey,
      userId: E2E_PERSONAS[personaKey].userId,
    },
  });
}
