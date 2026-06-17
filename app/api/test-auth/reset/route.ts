import { NextResponse, type NextRequest } from "next/server";
import { E2E_PERSONAS, E2E_SCENARIOS, isE2EScenarioKey } from "@/lib/test-auth/personas";
import { resetE2EScenario } from "@/lib/test-auth/supabase";
import { validateTestAuthRequest } from "../_shared";

export async function POST(request: NextRequest) {
  const guardResponse = validateTestAuthRequest(request);
  if (guardResponse) {
    return guardResponse;
  }

  const body = await request.json().catch(() => ({}));
  const scenario = typeof body.scenario === "string" ? body.scenario : "dashboard-rich";

  if (!isE2EScenarioKey(scenario)) {
    return NextResponse.json({ message: "Unknown test scenario" }, { status: 400 });
  }

  await resetE2EScenario(scenario);

  return NextResponse.json({
    personas: Object.fromEntries(
      Object.entries(E2E_PERSONAS).map(([key, persona]) => [
        key,
        {
          displayName: persona.displayName,
          email: persona.email,
          friendCode: persona.friendCode,
          userId: persona.userId,
        },
      ]),
    ),
    scenario,
    scenarioDescription: E2E_SCENARIOS[scenario].description,
  });
}
