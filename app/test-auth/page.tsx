import { notFound } from "next/navigation";
import { TestAuthPanel } from "@/components/test-auth/test-auth-panel";
import { E2E_PERSONAS, E2E_TEST_CASES, getTestAuthAvailability, hasTestAuthServiceRole } from "@/lib/test-auth/personas";

export default function TestAuthPage() {
  const availability = getTestAuthAvailability({
    enabled: process.env.E2E_TEST_AUTH_ENABLED,
    nodeEnv: process.env.NODE_ENV,
    secret: process.env.E2E_TEST_AUTH_SECRET,
    vercelEnv: process.env.VERCEL_ENV,
  });

  if (!availability.allowed) {
    notFound();
  }

  return (
    <TestAuthPanel
      hasServiceRole={hasTestAuthServiceRole(process.env.SUPABASE_SERVICE_ROLE_KEY)}
      testCases={Object.entries(E2E_TEST_CASES).map(([key, testCase]) => ({
        description: testCase.description,
        destination: testCase.destination,
        key: key as keyof typeof E2E_TEST_CASES,
        persona: {
          avatarUrl: E2E_PERSONAS[testCase.persona].avatarUrl,
          displayName: E2E_PERSONAS[testCase.persona].displayName,
          email: E2E_PERSONAS[testCase.persona].email,
          friendCode: E2E_PERSONAS[testCase.persona].friendCode,
          key: testCase.persona,
        },
        scenario: testCase.scenario,
        title: testCase.title,
      }))}
    />
  );
}
