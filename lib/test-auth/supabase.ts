import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/env";
import {
  E2E_PERSONAS,
  type E2EPersonaKey,
  type E2EScenarioKey,
  getE2EPersonaPassword,
} from "@/lib/test-auth/personas";

type AdminClient = SupabaseClient;
type Persona = (typeof E2E_PERSONAS)[E2EPersonaKey];

const TEST_EMAIL_DOMAIN = "@insightup.test";
const SEGMENT_PARTS = ["leftArm", "rightArm", "trunk", "leftLeg", "rightLeg"] as const;

type SeedRecord = {
  bmr: number;
  date: string;
  fat: number;
  fatPercent: number;
  isIncludedInCharts?: boolean;
  muscle: number;
  notes: string;
  recommendedCalories: number;
  score: number;
  visceralFatLevel: number;
  weight: number;
};

function getAdminClient() {
  const { url } = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getPersonaPassword() {
  const password = getE2EPersonaPassword({
    password: process.env.E2E_TEST_USER_PASSWORD,
    secret: process.env.E2E_TEST_AUTH_SECRET,
  });

  if (!password) {
    throw new Error("Missing E2E_TEST_AUTH_SECRET or E2E_TEST_USER_PASSWORD.");
  }

  return password;
}

function assertTestPersona(persona: Persona) {
  if (!persona.email.endsWith(TEST_EMAIL_DOMAIN)) {
    throw new Error(`Refusing to seed non-test persona email: ${persona.email}`);
  }
}

async function upsertAuthUser(admin: AdminClient, persona: Persona, password: string) {
  assertTestPersona(persona);

  const attributes = {
    app_metadata: {
      provider: "email",
      providers: ["email"],
      test_persona: true,
    },
    email: persona.email,
    email_confirm: true,
    id: persona.userId,
    password,
    user_metadata: {
      avatar_url: persona.avatarUrl,
      full_name: persona.displayName,
      name: persona.displayName,
    },
  };

  const { data: existingData, error: getError } = await admin.auth.admin.getUserById(persona.userId);

  if (getError && getError.status !== 404) {
    throw getError;
  }

  const existingUser = existingData.user;

  if (existingUser) {
    if (existingUser.email?.toLowerCase() !== persona.email.toLowerCase()) {
      throw new Error(`E2E persona ${persona.userId} exists with unexpected email ${existingUser.email}.`);
    }

    const { data, error } = await admin.auth.admin.updateUserById(existingUser.id, attributes);
    if (error) {
      throw error;
    }
    return data.user;
  }

  const { data, error } = await admin.auth.admin.createUser(attributes);

  if (error) {
    throw error;
  }

  return data.user;
}

async function upsertProfile(admin: AdminClient, persona: Persona) {
  const { error } = await admin.from("user_profiles").upsert(
    {
      avatar_url: persona.avatarUrl,
      display_name: persona.displayName,
      friend_code: persona.friendCode,
      user_id: persona.userId,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw error;
  }
}

async function seedSubscription(admin: AdminClient, persona: Persona) {
  if (persona.planCode === "e2e_pro") {
    const { error: planError } = await admin.from("subscription_plans").upsert(
      {
        code: "e2e_pro",
        display_name: "E2E Pro",
        is_active: true,
        is_default: false,
      },
      { onConflict: "code" },
    );

    if (planError) {
      throw planError;
    }

    const { error: entitlementError } = await admin.from("plan_feature_entitlements").upsert(
      {
        config: {
          allow_rotation: false,
          model_pool: ["gemini-2.5-flash-lite"],
        },
        daily_limit: 20,
        feature_key: "trend_summary",
        plan_code: "e2e_pro",
      },
      { onConflict: "plan_code,feature_key" },
    );

    if (entitlementError) {
      throw entitlementError;
    }
  }

  const { error } = await admin.from("user_subscriptions").insert({
    metadata: { e2e: true },
    plan_code: persona.planCode,
    provider: "e2e",
    provider_subscription_id: `e2e-${persona.userId}`,
    status: "active",
    user_id: persona.userId,
  });

  if (error) {
    throw error;
  }
}

async function seedRecord(admin: AdminClient, persona: Persona, record: SeedRecord) {
  const { data, error } = await admin
    .from("inbody_records")
    .insert({
      age: 32,
      bmr: record.bmr,
      fat: record.fat,
      fat_percent: record.fatPercent,
      gender: "unknown",
      height: 170,
      is_included_in_charts: record.isIncludedInCharts ?? true,
      muscle: record.muscle,
      notes: record.notes,
      recommended_calories: record.recommendedCalories,
      recorded_at: record.date,
      score: record.score,
      source_type: "manual",
      user_id: persona.userId,
      visceral_fat_level: record.visceralFatLevel,
      weight: record.weight,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    throw error;
  }

  const segmentRows = SEGMENT_PARTS.map((partKey, index) => ({
    fat: Number((record.fat * [0.09, 0.09, 0.5, 0.16, 0.16][index]).toFixed(2)),
    fat_ratio: Number((100 + record.fatPercent * [1.1, 1, 2.8, 1.5, 1.45][index]).toFixed(1)),
    muscle: Number((record.muscle * [0.075, 0.077, 0.64, 0.235, 0.235][index]).toFixed(2)),
    muscle_ratio: Number((92 + record.muscle * [0.22, 0.24, 0.28, 0.26, 0.25][index]).toFixed(1)),
    part_key: partKey,
    part_name: partKey,
    record_id: data.id,
  }));

  const { error: segmentError } = await admin.from("inbody_segments").insert(segmentRows);

  if (segmentError) {
    throw segmentError;
  }

  return data.id;
}

async function resetPersonaData(admin: AdminClient, personaIds: string[]) {
  const deletes = [
    admin.from("llm_daily_feature_usage").delete().in("user_id", personaIds),
    admin.from("llm_trend_daily_summaries").delete().in("user_id", personaIds),
    admin.from("user_personal_goals").delete().in("user_id", personaIds),
    admin.from("competition_members").delete().in("user_id", personaIds),
    admin.from("competitions").delete().in("owner_id", personaIds),
    admin.from("user_friendships").delete().in("user_id", personaIds),
    admin.from("user_friendships").delete().in("friend_user_id", personaIds),
    admin.from("inbody_records").delete().in("user_id", personaIds),
    admin.from("user_subscriptions").delete().in("user_id", personaIds),
    admin.from("user_profiles").delete().in("user_id", personaIds),
  ];

  for (const deleteRequest of deletes) {
    const { error } = await deleteRequest;
    if (error) {
      throw error;
    }
  }
}

async function seedAliceRich(admin: AdminClient) {
  const alice = E2E_PERSONAS.alice;

  const records: SeedRecord[] = [
    {
      bmr: 1472,
      date: "2025-07-12",
      fat: 19.4,
      fatPercent: 29.1,
      muscle: 25.2,
      notes: "E2E Alice starting point after a training break",
      recommendedCalories: 2020,
      score: 69,
      visceralFatLevel: 10,
      weight: 66.6,
    },
    {
      bmr: 1470,
      date: "2025-08-16",
      fat: 19.2,
      fatPercent: 28.8,
      muscle: 25.3,
      notes: "E2E Alice restarted resistance training",
      recommendedCalories: 2015,
      score: 70,
      visceralFatLevel: 10,
      weight: 66.7,
    },
    {
      bmr: 1486,
      date: "2025-09-20",
      fat: 18.8,
      fatPercent: 28.2,
      muscle: 25.7,
      notes: "E2E Alice steady protein intake",
      recommendedCalories: 2055,
      score: 72,
      visceralFatLevel: 9,
      weight: 66.3,
    },
    {
      bmr: 1494,
      date: "2025-10-18",
      fat: 18.1,
      fatPercent: 27.3,
      muscle: 26.2,
      notes: "E2E Alice improved lower-body training",
      recommendedCalories: 2075,
      score: 73,
      visceralFatLevel: 9,
      weight: 66.0,
    },
    {
      bmr: 1491,
      date: "2025-11-15",
      fat: 17.7,
      fatPercent: 26.8,
      muscle: 26.0,
      notes: "E2E Alice body recomposition trend",
      recommendedCalories: 2065,
      score: 74,
      visceralFatLevel: 8,
      weight: 65.9,
    },
    {
      bmr: 1506,
      date: "2025-12-13",
      fat: 17.1,
      fatPercent: 25.9,
      muscle: 26.5,
      notes: "E2E Alice holiday maintenance",
      recommendedCalories: 2105,
      score: 76,
      visceralFatLevel: 8,
      weight: 65.6,
    },
    {
      bmr: 1512,
      date: "2026-01-10",
      fat: 16.5,
      fatPercent: 25.0,
      muscle: 26.9,
      notes: "E2E Alice new block baseline",
      recommendedCalories: 2120,
      score: 77,
      visceralFatLevel: 8,
      weight: 65.1,
    },
    {
      bmr: 1518,
      date: "2026-02-14",
      fat: 16.4,
      fatPercent: 24.8,
      muscle: 27.1,
      notes: "E2E Alice consistent workouts",
      recommendedCalories: 2130,
      score: 78,
      visceralFatLevel: 7,
      weight: 65.0,
    },
    {
      bmr: 1515,
      date: "2026-03-12",
      fat: 16.0,
      fatPercent: 24.4,
      muscle: 27.0,
      notes: "E2E Alice improving record",
      recommendedCalories: 2125,
      score: 79,
      visceralFatLevel: 7,
      weight: 64.7,
    },
    {
      bmr: 1498,
      date: "2026-04-08",
      fat: 17.2,
      fatPercent: 26.0,
      isIncludedInCharts: false,
      muscle: 26.2,
      notes: "E2E Alice excluded travel-week record",
      recommendedCalories: 2075,
      score: 75,
      visceralFatLevel: 8,
      weight: 66.1,
    },
    {
      bmr: 1526,
      date: "2026-04-18",
      fat: 15.6,
      fatPercent: 23.9,
      muscle: 27.5,
      notes: "E2E Alice recovered after travel",
      recommendedCalories: 2150,
      score: 80,
      visceralFatLevel: 7,
      weight: 64.5,
    },
    {
      bmr: 1531,
      date: "2026-05-16",
      fat: 15.3,
      fatPercent: 23.5,
      muscle: 27.8,
      notes: "E2E Alice lean mass improved",
      recommendedCalories: 2165,
      score: 82,
      visceralFatLevel: 6,
      weight: 64.3,
    },
    {
      bmr: 1537,
      date: "2026-06-13",
      fat: 14.9,
      fatPercent: 23.0,
      muscle: 28.1,
      notes: "E2E Alice latest rich dashboard record",
      recommendedCalories: 2185,
      score: 83,
      visceralFatLevel: 6,
      weight: 64.0,
    },
  ];

  for (const record of records) {
    await seedRecord(admin, alice, record);
  }

  const { error: goalsError } = await admin.from("user_personal_goals").insert([
    {
      metric_key: "fatPercent",
      start_value: 27.3,
      target_value: 23.5,
      title: "E2E lower body fat",
      unit: "%",
      user_id: alice.userId,
    },
    {
      metric_key: "muscle",
      start_value: 25.8,
      target_value: 27.5,
      title: "E2E build muscle",
      unit: "kg",
      user_id: alice.userId,
    },
  ]);

  if (goalsError) {
    throw goalsError;
  }

  const { error: summaryError } = await admin.from("llm_trend_daily_summaries").upsert(
    {
      feature_key: "trend_summary",
      last_generated_at: "2026-06-13T00:00:00Z",
      model_name: "e2e-static",
      request_date: "2026-06-13",
      source_record_count: 12,
      summary_text: JSON.stringify({
        actionPlan: ["Keep protein consistent.", "Use the excluded travel-week record as context only."],
        keyChanges: ["Body fat percentage moved from 29.1% to 23.0% with a few realistic plateaus.", "Skeletal muscle increased from 25.2kg to 28.1kg despite small month-to-month dips."],
        overview: "E2E cached summary for a rich 12-record included trend.",
        watchouts: ["One travel-week record is excluded from charts.", "Visceral fat improved, but should keep monitoring."],
      }),
      usage_count: 1,
      user_id: alice.userId,
    },
    { onConflict: "user_id,feature_key,request_date" },
  );

  if (summaryError) {
    throw summaryError;
  }
}

async function seedBob(admin: AdminClient) {
  const bob = E2E_PERSONAS.bob;

  const records: SeedRecord[] = [
    {
      bmr: 1648,
      date: "2025-11-08",
      fat: 14.8,
      fatPercent: 20.8,
      muscle: 32.8,
      notes: "E2E Bob strength baseline",
      recommendedCalories: 2380,
      score: 80,
      visceralFatLevel: 6,
      weight: 71.0,
    },
    {
      bmr: 1660,
      date: "2025-12-06",
      fat: 14.4,
      fatPercent: 20.2,
      muscle: 33.1,
      notes: "E2E Bob training volume increased",
      recommendedCalories: 2400,
      score: 82,
      visceralFatLevel: 5,
      weight: 71.3,
    },
    {
      bmr: 1668,
      date: "2026-01-17",
      fat: 14.1,
      fatPercent: 19.8,
      muscle: 33.4,
      notes: "E2E Bob winter check-in",
      recommendedCalories: 2420,
      score: 83,
      visceralFatLevel: 5,
      weight: 71.5,
    },
    {
      bmr: 1675,
      date: "2026-03-07",
      fat: 13.9,
      fatPercent: 19.4,
      muscle: 33.7,
      notes: "E2E Bob heavier compound lifts",
      recommendedCalories: 2430,
      score: 84,
      visceralFatLevel: 5,
      weight: 71.7,
    },
    {
      bmr: 1684,
      date: "2026-05-18",
      fat: 13.5,
      fatPercent: 18.9,
      muscle: 34.1,
      notes: "E2E Bob latest comparison record",
      recommendedCalories: 2450,
      score: 85,
      visceralFatLevel: 5,
      weight: 71.8,
    },
    {
      bmr: 1690,
      date: "2026-06-10",
      fat: 13.4,
      fatPercent: 18.6,
      muscle: 34.4,
      notes: "E2E Bob pro-plan current record",
      recommendedCalories: 2470,
      score: 86,
      visceralFatLevel: 4,
      weight: 72.0,
    },
  ];

  for (const record of records) {
    await seedRecord(admin, bob, record);
  }
}

async function seedCompetitor(admin: AdminClient) {
  const records: SeedRecord[] = [
    {
      bmr: 1540,
      date: "2026-02-01",
      fat: 16.0,
      fatPercent: 23.8,
      muscle: 28.4,
      notes: "E2E competitor baseline",
      recommendedCalories: 2200,
      score: 76,
      visceralFatLevel: 8,
      weight: 67.2,
    },
    {
      bmr: 1548,
      date: "2026-03-15",
      fat: 15.7,
      fatPercent: 23.1,
      muscle: 28.7,
      notes: "E2E competitor mid-cycle",
      recommendedCalories: 2220,
      score: 77,
      visceralFatLevel: 8,
      weight: 67.5,
    },
    {
      bmr: 1560,
      date: "2026-05-01",
      fat: 15.2,
      fatPercent: 22.4,
      muscle: 29.1,
      notes: "E2E competitor latest before invite",
      recommendedCalories: 2240,
      score: 79,
      visceralFatLevel: 7,
      weight: 67.9,
    },
    {
      bmr: 1566,
      date: "2026-06-08",
      fat: 15.0,
      fatPercent: 22.0,
      muscle: 29.4,
      notes: "E2E competitor current competition record",
      recommendedCalories: 2250,
      score: 80,
      visceralFatLevel: 7,
      weight: 68.1,
    },
  ];

  for (const record of records) {
    await seedRecord(admin, E2E_PERSONAS.competitor, record);
  }
}

async function seedFriendship(admin: AdminClient) {
  const { error } = await admin.from("user_friendships").insert({
    friend_user_id: E2E_PERSONAS.bob.userId,
    user_id: E2E_PERSONAS.alice.userId,
  });

  if (error) {
    throw error;
  }
}

async function seedCompetition(admin: AdminClient) {
  const { data: competition, error: competitionError } = await admin
    .from("competitions")
    .insert({
      name: "E2E Summer Cut",
      owner_id: E2E_PERSONAS.alice.userId,
      status: "active",
      target_date: "2026-07-31",
    })
    .select("id")
    .single<{ id: string }>();

  if (competitionError) {
    throw competitionError;
  }

  const { data: members, error: membersError } = await admin
    .from("competition_members")
    .insert([
      {
        competition_id: competition.id,
        display_name: E2E_PERSONAS.alice.displayName,
        friend_code: E2E_PERSONAS.alice.friendCode,
        joined_at: "2026-06-01T00:00:00Z",
        role: "owner",
        status: "accepted",
        user_id: E2E_PERSONAS.alice.userId,
      },
      {
        competition_id: competition.id,
        display_name: E2E_PERSONAS.competitor.displayName,
        friend_code: E2E_PERSONAS.competitor.friendCode,
        invited_by_user_id: E2E_PERSONAS.alice.userId,
        role: "participant",
        status: "invited",
        user_id: E2E_PERSONAS.competitor.userId,
      },
    ])
    .select("id,user_id");

  if (membersError) {
    throw membersError;
  }

  const aliceMember = members?.find((member) => member.user_id === E2E_PERSONAS.alice.userId);

  if (aliceMember) {
    const { error: goalError } = await admin.from("user_personal_goals").insert({
      competition_id: competition.id,
      competition_member_id: aliceMember.id,
      metric_key: "fatPercent",
      start_value: 27.3,
      target_date: "2026-07-31",
      target_date_locked: true,
      target_value: 23,
      title: "E2E competition fat goal",
      unit: "%",
      user_id: E2E_PERSONAS.alice.userId,
    });

    if (goalError) {
      throw goalError;
    }
  }
}

export async function ensureE2EPersonas() {
  const admin = getAdminClient();
  const password = getPersonaPassword();
  const users: Record<E2EPersonaKey, User> = {} as Record<E2EPersonaKey, User>;

  for (const [key, persona] of Object.entries(E2E_PERSONAS) as Array<[E2EPersonaKey, Persona]>) {
    const user = await upsertAuthUser(admin, persona, password);
    if (!user) {
      throw new Error(`Failed to ensure E2E persona ${key}.`);
    }

    await upsertProfile(admin, persona);
    users[key] = user;
  }

  return users;
}

export async function resetE2EScenario(scenario: E2EScenarioKey) {
  const admin = getAdminClient();
  await ensureE2EPersonas();
  await resetPersonaData(admin, Object.values(E2E_PERSONAS).map((persona) => persona.userId));

  for (const persona of Object.values(E2E_PERSONAS)) {
    await upsertProfile(admin, persona);
    await seedSubscription(admin, persona);
  }

  if (scenario === "empty-state") {
    return;
  }

  await seedAliceRich(admin);

  if (scenario === "dashboard-rich" || scenario === "friends-ready" || scenario === "friend-add-flow") {
    await seedBob(admin);
  }

  if (scenario === "dashboard-rich" || scenario === "friends-ready") {
    await seedFriendship(admin);
  }

  if (scenario === "dashboard-rich") {
    await seedCompetitor(admin);
    await seedCompetition(admin);
  }
}

export function getE2EPersonaCredentials(personaKey: E2EPersonaKey) {
  const persona = E2E_PERSONAS[personaKey];
  return {
    email: persona.email,
    password: getPersonaPassword(),
  };
}
