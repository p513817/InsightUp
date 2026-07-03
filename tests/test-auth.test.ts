import { describe, expect, it } from "vitest";
import {
  E2E_PERSONAS,
  E2E_TEST_CASES,
  getTestAuthAvailability,
  hasTestAuthServiceRole,
  isE2EPersonaKey,
  isE2EScenarioKey,
  isLocalTestAuthShortcutAllowed,
  isProductionRuntime,
  isValidTestAuthSecret,
} from "@/lib/test-auth/personas";

describe("test auth guard", () => {
  it("blocks production even when the feature flag is enabled", () => {
    expect(isProductionRuntime({ nodeEnv: "production", vercelEnv: "production" })).toBe(true);
    expect(
      getTestAuthAvailability({
        enabled: "true",
        nodeEnv: "production",
        secret: "secret",
        vercelEnv: "production",
      }),
    ).toEqual({ allowed: false, reason: "production" });
  });

  it("allows local or preview only when the feature flag and shared secret are present", () => {
    expect(
      getTestAuthAvailability({
        enabled: "true",
        nodeEnv: "development",
        secret: "secret",
      }),
    ).toEqual({ allowed: true, reason: "allowed" });

    expect(
      getTestAuthAvailability({
        enabled: "true",
        nodeEnv: "development",
      }),
    ).toEqual({ allowed: false, reason: "missing_secret" });

    expect(hasTestAuthServiceRole("service-role")).toBe(true);
    expect(hasTestAuthServiceRole(undefined)).toBe(false);
  });

  it("requires the exact shared secret header", () => {
    expect(isValidTestAuthSecret("abc", "abc")).toBe(true);
    expect(isValidTestAuthSecret("abc", "def")).toBe(false);
    expect(isValidTestAuthSecret("abc", "abcd")).toBe(false);
    expect(isValidTestAuthSecret(null, "abc")).toBe(false);
  });

  it("allows the no-secret UI shortcut only in local development with complete env", () => {
    expect(
      isLocalTestAuthShortcutAllowed({
        enabled: "true",
        nodeEnv: "development",
        secret: "secret",
        serviceRoleKey: "service-role",
      }),
    ).toBe(true);

    expect(
      isLocalTestAuthShortcutAllowed({
        enabled: "true",
        nodeEnv: "development",
        secret: "secret",
      }),
    ).toBe(false);

    expect(
      isLocalTestAuthShortcutAllowed({
        enabled: "true",
        nodeEnv: "production",
        secret: "secret",
        serviceRoleKey: "service-role",
        vercelEnv: "preview",
      }),
    ).toBe(false);
  });
});

describe("test auth personas", () => {
  it("only accepts whitelisted insightup.test personas and scenarios", () => {
    expect(isE2EPersonaKey("alice")).toBe(true);
    expect(isE2EPersonaKey("real-user@example.com")).toBe(false);
    expect(isE2EScenarioKey("dashboard-rich")).toBe(true);
    expect(isE2EScenarioKey("production-copy")).toBe(false);

    expect(Object.values(E2E_PERSONAS).every((persona) => persona.email.endsWith("@insightup.test"))).toBe(true);
    expect(Object.values(E2E_PERSONAS).every((persona) => persona.displayName && !persona.displayName.startsWith("E2E "))).toBe(true);
    expect(Object.values(E2E_PERSONAS).every((persona) => persona.avatarUrl.startsWith("data:image/svg+xml,"))).toBe(true);
    expect(Object.values(E2E_PERSONAS).every((persona) => /^[A-Z0-9]{10}$/.test(persona.friendCode))).toBe(true);
    expect(new Set(Object.values(E2E_PERSONAS).map((persona) => persona.userId)).size).toBe(
      Object.values(E2E_PERSONAS).length,
    );
    expect(new Set(Object.values(E2E_PERSONAS).map((persona) => persona.friendCode)).size).toBe(
      Object.values(E2E_PERSONAS).length,
    );
  });

  it("binds human-facing test cases to intentional scenario and persona pairs", () => {
    expect(Object.values(E2E_TEST_CASES).every((testCase) => isE2EScenarioKey(testCase.scenario))).toBe(true);
    expect(Object.values(E2E_TEST_CASES).every((testCase) => isE2EPersonaKey(testCase.persona))).toBe(true);
    expect(E2E_TEST_CASES["empty-user"]).toMatchObject({
      persona: "empty",
      scenario: "empty-state",
    });
    expect(E2E_TEST_CASES["friend-add-alice"]).toMatchObject({
      persona: "alice",
      scenario: "friend-add-flow",
    });
  });
});
