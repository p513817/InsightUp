import { NextResponse, type NextRequest } from "next/server";
import {
  E2E_TEST_AUTH_SECRET_HEADER,
  getTestAuthAvailability,
  hasTestAuthServiceRole,
  isValidTestAuthSecret,
} from "@/lib/test-auth/personas";

export function testAuthNotFound() {
  return NextResponse.json({ message: "Not found" }, { status: 404 });
}

export function validateTestAuthRequest(request: NextRequest) {
  const availability = getTestAuthAvailability({
    enabled: process.env.E2E_TEST_AUTH_ENABLED,
    nodeEnv: process.env.NODE_ENV,
    secret: process.env.E2E_TEST_AUTH_SECRET,
    vercelEnv: process.env.VERCEL_ENV,
  });

  if (!availability.allowed) {
    return testAuthNotFound();
  }

  if (!isValidTestAuthSecret(request.headers.get(E2E_TEST_AUTH_SECRET_HEADER), process.env.E2E_TEST_AUTH_SECRET)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!hasTestAuthServiceRole(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return NextResponse.json({ message: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 503 });
  }

  return null;
}
