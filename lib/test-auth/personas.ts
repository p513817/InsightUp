export const E2E_TEST_AUTH_SECRET_HEADER = "x-e2e-test-auth-secret";

export const E2E_PERSONAS = {
  alice: {
    avatarUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='48' fill='%233FAF9A'/%3E%3Ccircle cx='48' cy='38' r='17' fill='%23FFFFFF' fill-opacity='.9'/%3E%3Cpath d='M20 84c5-18 18-28 28-28s23 10 28 28' fill='%23FFFFFF' fill-opacity='.9'/%3E%3Ctext x='48' y='91' text-anchor='middle' font-family='Arial' font-size='12' font-weight='700' fill='%2310233F'%3EMC%3C/text%3E%3C/svg%3E",
    displayName: "Mia Chen",
    email: "e2e-alice@insightup.test",
    friendCode: "E2EALICE1A",
    planCode: "free",
    userId: "10000000-0000-4000-8000-000000000001",
  },
  bob: {
    avatarUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='48' fill='%2317345D'/%3E%3Ccircle cx='48' cy='38' r='17' fill='%23DFF7EF'/%3E%3Cpath d='M20 84c5-18 18-28 28-28s23 10 28 28' fill='%23DFF7EF'/%3E%3Ctext x='48' y='91' text-anchor='middle' font-family='Arial' font-size='12' font-weight='700' fill='%23FFFFFF'%3ERL%3C/text%3E%3C/svg%3E",
    displayName: "Ryan Lin",
    email: "e2e-bob@insightup.test",
    friendCode: "E2EBOB001A",
    planCode: "e2e_pro",
    userId: "10000000-0000-4000-8000-000000000002",
  },
  empty: {
    avatarUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='48' fill='%23B85B73'/%3E%3Ccircle cx='48' cy='38' r='17' fill='%23FFF7FA'/%3E%3Cpath d='M20 84c5-18 18-28 28-28s23 10 28 28' fill='%23FFF7FA'/%3E%3Ctext x='48' y='91' text-anchor='middle' font-family='Arial' font-size='12' font-weight='700' fill='%23FFFFFF'%3END%3C/text%3E%3C/svg%3E",
    displayName: "No Data User",
    email: "e2e-empty@insightup.test",
    friendCode: "E2EEMPTY1A",
    planCode: "free",
    userId: "10000000-0000-4000-8000-000000000003",
  },
  competitor: {
    avatarUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='48' fill='%23F1B84B'/%3E%3Ccircle cx='48' cy='38' r='17' fill='%2310233F' fill-opacity='.9'/%3E%3Cpath d='M20 84c5-18 18-28 28-28s23 10 28 28' fill='%2310233F' fill-opacity='.9'/%3E%3Ctext x='48' y='91' text-anchor='middle' font-family='Arial' font-size='12' font-weight='700' fill='%2310233F'%3ENW%3C/text%3E%3C/svg%3E",
    displayName: "Nora Wu",
    email: "e2e-competitor@insightup.test",
    friendCode: "E2ECOMP01A",
    planCode: "free",
    userId: "10000000-0000-4000-8000-000000000004",
  },
  luna: {
    avatarUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='48' fill='%235980B8'/%3E%3Ccircle cx='48' cy='38' r='17' fill='%23F7FBFF'/%3E%3Cpath d='M20 84c5-18 18-28 28-28s23 10 28 28' fill='%23F7FBFF'/%3E%3Ctext x='48' y='91' text-anchor='middle' font-family='Arial' font-size='12' font-weight='700' fill='%23FFFFFF'%3ELL%3C/text%3E%3C/svg%3E",
    displayName: "Luna Lee",
    email: "e2e-luna@insightup.test",
    friendCode: "E2ELUNA01A",
    planCode: "free",
    userId: "10000000-0000-4000-8000-000000000005",
  },
  kai: {
    avatarUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='48' fill='%237D5FB2'/%3E%3Ccircle cx='48' cy='38' r='17' fill='%23FAF7FF'/%3E%3Cpath d='M20 84c5-18 18-28 28-28s23 10 28 28' fill='%23FAF7FF'/%3E%3Ctext x='48' y='91' text-anchor='middle' font-family='Arial' font-size='12' font-weight='700' fill='%23FFFFFF'%3EKC%3C/text%3E%3C/svg%3E",
    displayName: "Kai Chen",
    email: "e2e-kai@insightup.test",
    friendCode: "E2EKAI001A",
    planCode: "free",
    userId: "10000000-0000-4000-8000-000000000006",
  },
  sofia: {
    avatarUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='48' fill='%23C66A44'/%3E%3Ccircle cx='48' cy='38' r='17' fill='%23FFF7F2'/%3E%3Cpath d='M20 84c5-18 18-28 28-28s23 10 28 28' fill='%23FFF7F2'/%3E%3Ctext x='48' y='91' text-anchor='middle' font-family='Arial' font-size='12' font-weight='700' fill='%23FFFFFF'%3ESH%3C/text%3E%3C/svg%3E",
    displayName: "Sofia Hsu",
    email: "e2e-sofia@insightup.test",
    friendCode: "E2ESOFIA1A",
    planCode: "free",
    userId: "10000000-0000-4000-8000-000000000007",
  },
} as const;

export const E2E_SCENARIOS = {
  "dashboard-rich": {
    description: "Alice has records, goals, several friends, several competitions, and a cached trend summary.",
  },
  "friends-ready": {
    description: "Alice and Bob are already linked so friends and compare pages can be inspected immediately.",
  },
  "friend-add-flow": {
    description: "Alice and Bob exist but are not linked, so adding Bob by friend code can be tested.",
  },
  "empty-state": {
    description: "Empty persona has profile and subscription only, without records or friends.",
  },
} as const;

export type E2EPersonaKey = keyof typeof E2E_PERSONAS;
export type E2EScenarioKey = keyof typeof E2E_SCENARIOS;

export const E2E_TEST_CASES = {
  "dashboard-rich-alice": {
    description: "Full dashboard, records, goals, friends, competitions, and cached AI summary.",
    destination: "/dashboard",
    persona: "alice",
    scenario: "dashboard-rich",
    title: "Rich dashboard",
  },
  "friends-ready-alice": {
    description: "Alice and Bob are already friends, so friend snapshots and comparison views are ready.",
    destination: "/friends",
    persona: "alice",
    scenario: "friends-ready",
    title: "Friends ready",
  },
  "friend-add-alice": {
    description: "Alice can add Bob with friend code E2EBOB001A.",
    destination: "/friends",
    persona: "alice",
    scenario: "friend-add-flow",
    title: "Add friend flow",
  },
  "empty-user": {
    description: "A no-data user with profile and subscription only.",
    destination: "/dashboard",
    persona: "empty",
    scenario: "empty-state",
    title: "Empty state",
  },
  "bob-perspective": {
    description: "Bob's pro-plan perspective with his own strength-focused records.",
    destination: "/dashboard",
    persona: "bob",
    scenario: "dashboard-rich",
    title: "Bob perspective",
  },
} as const satisfies Record<
  string,
  {
    description: string;
    destination: string;
    persona: E2EPersonaKey;
    scenario: E2EScenarioKey;
    title: string;
  }
>;

export type E2ETestCaseKey = keyof typeof E2E_TEST_CASES;

export type TestAuthEnvironment = {
  enabled?: string;
  nodeEnv?: string;
  secret?: string;
  vercelEnv?: string;
};

export function isE2EPersonaKey(value: string | null | undefined): value is E2EPersonaKey {
  return Boolean(value && value in E2E_PERSONAS);
}

export function isE2EScenarioKey(value: string | null | undefined): value is E2EScenarioKey {
  return Boolean(value && value in E2E_SCENARIOS);
}

export function isProductionRuntime(env: Pick<TestAuthEnvironment, "nodeEnv" | "vercelEnv">) {
  if (env.vercelEnv === "production") {
    return true;
  }

  return !env.vercelEnv && env.nodeEnv === "production";
}

export function getTestAuthAvailability(env: TestAuthEnvironment) {
  if (isProductionRuntime(env)) {
    return { allowed: false, reason: "production" as const };
  }

  if (env.enabled !== "true") {
    return { allowed: false, reason: "disabled" as const };
  }

  if (!env.secret) {
    return { allowed: false, reason: "missing_secret" as const };
  }

  return { allowed: true, reason: "allowed" as const };
}

export function hasTestAuthServiceRole(serviceRoleKey: string | undefined) {
  return Boolean(serviceRoleKey);
}

export function isValidTestAuthSecret(inputSecret: string | null, expectedSecret: string | undefined) {
  return Boolean(expectedSecret && inputSecret && inputSecret === expectedSecret);
}

export function getE2EPersonaPassword(env: Pick<TestAuthEnvironment, "secret"> & { password?: string }) {
  return env.password || env.secret || "";
}
