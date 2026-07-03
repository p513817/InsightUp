import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  E2E_PERSONAS,
  isE2EPersonaKey,
  isE2EScenarioKey,
  isLocalTestAuthShortcutAllowed,
} from "@/lib/test-auth/personas";
import { ensureE2EPersonas, getE2EPersonaCredentials, resetE2EScenario } from "@/lib/test-auth/supabase";
import { testAuthNotFound } from "../_shared";

function sanitizeNextPath(value: unknown) {
  return typeof value === "string" && value.startsWith("/") ? value : "/dashboard";
}

export async function POST(request: NextRequest) {
  const allowed = isLocalTestAuthShortcutAllowed({
    enabled: process.env.E2E_TEST_AUTH_ENABLED,
    nodeEnv: process.env.NODE_ENV,
    secret: process.env.E2E_TEST_AUTH_SECRET,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    vercelEnv: process.env.VERCEL_ENV,
  });

  if (!allowed) {
    return testAuthNotFound();
  }

  const body = await request.json().catch(() => ({}));
  const scenario = typeof body.scenario === "string" ? body.scenario : "dashboard-rich";
  const personaKey = typeof body.persona === "string" ? body.persona : "alice";

  if (!isE2EScenarioKey(scenario)) {
    return NextResponse.json({ message: "Unknown test scenario" }, { status: 400 });
  }

  if (!isE2EPersonaKey(personaKey)) {
    return NextResponse.json({ message: "Unknown test persona" }, { status: 400 });
  }

  await resetE2EScenario(scenario);
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
