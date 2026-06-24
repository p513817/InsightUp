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
  age?: number;
  bmr: number;
  date: string;
  fat: number;
  fatPercent: number;
  gender?: "male" | "female" | "other" | "unknown";
  height?: number;
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
    const existingEmail = existingUser.email?.toLowerCase() ?? "";
    const targetEmail = persona.email.toLowerCase();

    if (existingEmail !== targetEmail && !existingEmail.endsWith(TEST_EMAIL_DOMAIN)) {
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
        display_name: "Pro",
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
      age: record.age ?? 32,
      bmr: record.bmr,
      fat: record.fat,
      fat_percent: record.fatPercent,
      gender: record.gender ?? "unknown",
      height: record.height ?? 170,
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
      age: 31,
      bmr: 1324,
      date: "2025-07-12",
      fat: 18.6,
      fatPercent: 30.0,
      gender: "female",
      height: 162.4,
      muscle: 23.8,
      notes: "Baseline after three low-activity months",
      recommendedCalories: 1830,
      score: 68,
      visceralFatLevel: 9,
      weight: 62.0,
    },
    {
      age: 31,
      bmr: 1328,
      date: "2025-08-16",
      fat: 18.3,
      fatPercent: 29.4,
      gender: "female",
      height: 162.4,
      muscle: 24.0,
      notes: "Restarted two strength sessions per week",
      recommendedCalories: 1840,
      score: 70,
      visceralFatLevel: 9,
      weight: 62.2,
    },
    {
      age: 31,
      bmr: 1337,
      date: "2025-09-20",
      fat: 17.8,
      fatPercent: 28.6,
      gender: "female",
      height: 162.4,
      muscle: 24.4,
      notes: "Protein target became more consistent",
      recommendedCalories: 1865,
      score: 72,
      visceralFatLevel: 8,
      weight: 62.3,
    },
    {
      age: 31,
      bmr: 1346,
      date: "2025-10-18",
      fat: 17.2,
      fatPercent: 27.8,
      gender: "female",
      height: 162.4,
      muscle: 24.7,
      notes: "Lower-body training volume increased",
      recommendedCalories: 1885,
      score: 74,
      visceralFatLevel: 8,
      weight: 61.9,
    },
    {
      age: 31,
      bmr: 1341,
      date: "2025-11-15",
      fat: 17.4,
      fatPercent: 28.1,
      gender: "female",
      height: 162.4,
      muscle: 24.5,
      notes: "Busy work month, sleep and steps dropped",
      recommendedCalories: 1870,
      score: 72,
      visceralFatLevel: 8,
      weight: 61.8,
    },
    {
      age: 31,
      bmr: 1351,
      date: "2025-12-13",
      fat: 16.9,
      fatPercent: 27.1,
      gender: "female",
      height: 162.4,
      muscle: 24.9,
      notes: "Holiday maintenance with regular workouts",
      recommendedCalories: 1895,
      score: 75,
      visceralFatLevel: 8,
      weight: 62.3,
    },
    {
      age: 31,
      bmr: 1362,
      date: "2026-01-10",
      fat: 16.2,
      fatPercent: 26.3,
      gender: "female",
      height: 162.4,
      muscle: 25.2,
      notes: "New training block baseline",
      recommendedCalories: 1920,
      score: 77,
      visceralFatLevel: 7,
      weight: 61.6,
    },
    {
      age: 31,
      bmr: 1368,
      date: "2026-02-14",
      fat: 15.9,
      fatPercent: 25.8,
      gender: "female",
      height: 162.4,
      muscle: 25.5,
      notes: "Consistent workouts, appetite higher",
      recommendedCalories: 1935,
      score: 78,
      visceralFatLevel: 7,
      weight: 61.7,
    },
    {
      age: 31,
      bmr: 1364,
      date: "2026-03-12",
      fat: 16.1,
      fatPercent: 26.1,
      gender: "female",
      height: 162.4,
      muscle: 25.3,
      notes: "Short plateau after deload week",
      recommendedCalories: 1925,
      score: 77,
      visceralFatLevel: 7,
      weight: 61.6,
    },
    {
      age: 31,
      bmr: 1348,
      date: "2026-04-08",
      fat: 17.0,
      fatPercent: 27.2,
      gender: "female",
      height: 162.4,
      isIncludedInCharts: false,
      muscle: 24.8,
      notes: "Travel-week scan after a late dinner, excluded from charts",
      recommendedCalories: 1890,
      score: 73,
      visceralFatLevel: 8,
      weight: 62.5,
    },
    {
      age: 31,
      bmr: 1374,
      date: "2026-04-18",
      fat: 15.4,
      fatPercent: 25.2,
      gender: "female",
      height: 162.4,
      muscle: 25.8,
      notes: "Recovered after travel, hydration normalized",
      recommendedCalories: 1950,
      score: 80,
      visceralFatLevel: 7,
      weight: 61.1,
    },
    {
      age: 31,
      bmr: 1383,
      date: "2026-05-16",
      fat: 14.8,
      fatPercent: 24.5,
      gender: "female",
      height: 162.4,
      muscle: 26.1,
      notes: "Lean mass improved during heavier phase",
      recommendedCalories: 1975,
      score: 82,
      visceralFatLevel: 6,
      weight: 60.4,
    },
    {
      age: 31,
      bmr: 1390,
      date: "2026-06-13",
      fat: 14.5,
      fatPercent: 24.0,
      gender: "female",
      height: 162.4,
      muscle: 26.4,
      notes: "Current check-in before demo recording",
      recommendedCalories: 1990,
      score: 83,
      visceralFatLevel: 6,
      weight: 60.3,
    },
  ];

  for (const record of records) {
    await seedRecord(admin, alice, record);
  }

  const { error: goalsError } = await admin.from("user_personal_goals").insert([
    {
      metric_key: "fatPercent",
      start_value: 27.8,
      target_value: 23.5,
      title: "Summer body fat goal",
      unit: "%",
      user_id: alice.userId,
    },
    {
      metric_key: "muscle",
      start_value: 26.1,
      target_value: 26.8,
      title: "June lean-mass stretch",
      unit: "kg",
      user_id: alice.userId,
    },
    {
      metric_key: "weight",
      start_value: 60.0,
      target_value: 59.6,
      title: "Hold the new low",
      unit: "kg",
      user_id: alice.userId,
    },
    {
      metric_key: "score",
      start_value: 83,
      target_value: 86,
      title: "Performance score push",
      unit: "pts",
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
      model_name: "demo-static",
      request_date: "2026-06-13",
      source_record_count: 12,
      summary_text: JSON.stringify({
        actionPlan: [
          "Keep the current strength schedule and protect sleep during busy weeks.",
          "Treat the excluded travel-week scan as context, not as a trend reversal.",
        ],
        keyChanges: [
          "Included records show body fat percentage moving from 30.0% to 24.0%, with one realistic plateau in March.",
          "Skeletal muscle increased from 23.8kg to 26.4kg while weight moved down from 62.0kg to 60.3kg.",
          "Visceral fat improved from level 9 to level 6 after January.",
        ],
        overview:
          "Alice's recent records look like a steady recomposition phase rather than a perfect linear cut. The strongest signal is fat loss with preserved and gradually rising muscle mass.",
        watchouts: [
          "March and the excluded April travel scan show how sleep, meals, and hydration can distort short-term readings.",
          "The weight-maintenance goal is intentionally behind because the latest check-in rebounded 0.3kg above Mia's short-term low.",
        ],
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
      notes: "Strength baseline after restarting barbell work",
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
      notes: "Training volume increased with better recovery",
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
      notes: "Winter check-in after a steady strength block",
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
      notes: "Heavier compound lifts started to show up in muscle mass",
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
      notes: "Latest comparison record before the summer challenge",
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
      notes: "Current record with a small strength-phase gain",
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

async function seedPeerRecords(admin: AdminClient, personaKey: E2EPersonaKey, records: SeedRecord[]) {
  const persona = E2E_PERSONAS[personaKey];

  for (const record of records) {
    await seedRecord(admin, persona, record);
  }
}

async function seedRichPeers(admin: AdminClient) {
  await seedPeerRecords(admin, "competitor", [
    {
      bmr: 1540,
      date: "2026-02-01",
      fat: 16.0,
      fatPercent: 23.8,
      muscle: 28.4,
      notes: "Baseline before joining the summer group",
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
      notes: "Mid-cycle check-in with steady training",
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
      notes: "Latest record before the competition invite",
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
      notes: "Current competition record",
      recommendedCalories: 2250,
      score: 80,
      visceralFatLevel: 7,
      weight: 68.1,
    },
  ]);

  await seedPeerRecords(admin, "luna", [
    {
      bmr: 1340,
      date: "2026-04-05",
      fat: 11.2,
      fatPercent: 18.5,
      muscle: 28.4,
      notes: "Friend baseline before a slow cut",
      recommendedCalories: 1860,
      score: 79,
      visceralFatLevel: 5,
      weight: 60.4,
    },
    {
      bmr: 1352,
      date: "2026-06-06",
      fat: 10.6,
      fatPercent: 17.5,
      muscle: 29.0,
      notes: "Current friend record with modest weight loss",
      recommendedCalories: 1880,
      score: 82,
      visceralFatLevel: 5,
      weight: 60.0,
    },
  ]);

  await seedPeerRecords(admin, "kai", [
    {
      bmr: 1605,
      date: "2026-04-12",
      fat: 16.4,
      fatPercent: 22.0,
      muscle: 32.2,
      notes: "Friend baseline before rebuilding consistency",
      recommendedCalories: 2320,
      score: 77,
      visceralFatLevel: 7,
      weight: 74.4,
    },
    {
      bmr: 1610,
      date: "2026-06-08",
      fat: 15.8,
      fatPercent: 21.2,
      muscle: 32.8,
      notes: "Current friend record after a lighter training month",
      recommendedCalories: 2340,
      score: 79,
      visceralFatLevel: 6,
      weight: 74.0,
    },
  ]);

  await seedPeerRecords(admin, "sofia", [
    {
      bmr: 1284,
      date: "2026-05-03",
      fat: 13.8,
      fatPercent: 24.4,
      muscle: 24.6,
      notes: "Friend baseline at the start of a fat-loss phase",
      recommendedCalories: 1760,
      score: 74,
      visceralFatLevel: 6,
      weight: 56.5,
    },
    {
      bmr: 1302,
      date: "2026-06-11",
      fat: 12.7,
      fatPercent: 22.8,
      muscle: 25.3,
      notes: "Current friend record with strong fat-mass progress",
      recommendedCalories: 1790,
      score: 80,
      visceralFatLevel: 5,
      weight: 55.8,
    },
  ]);
}

async function seedFriendships(admin: AdminClient, friendKeys: E2EPersonaKey[]) {
  const { error } = await admin.from("user_friendships").insert(
    friendKeys.map((friendKey) => ({
      friend_user_id: E2E_PERSONAS[friendKey].userId,
      user_id: E2E_PERSONAS.alice.userId,
    })),
  );

  if (error) {
    throw error;
  }
}

type CompetitionMemberSeed = {
  invitedBy?: E2EPersonaKey;
  joinedAt?: string;
  role: "owner" | "participant";
  status: "invited" | "accepted" | "declined" | "removed";
  user: E2EPersonaKey;
};

type CompetitionGoalSeed = {
  member: E2EPersonaKey;
  metricKey: string;
  startValue: number;
  targetValue: number;
  title: string;
  unit: string;
};

async function seedCompetitionWithMembers(
  admin: AdminClient,
  input: {
    goals: CompetitionGoalSeed[];
    members: CompetitionMemberSeed[];
    name: string;
    owner: E2EPersonaKey;
    status: "active" | "completed" | "cancelled";
    targetDate: string;
  },
) {
  const { data: competition, error: competitionError } = await admin
    .from("competitions")
    .insert({
      name: input.name,
      owner_id: E2E_PERSONAS[input.owner].userId,
      status: input.status,
      target_date: input.targetDate,
    })
    .select("id")
    .single<{ id: string }>();

  if (competitionError) {
    throw competitionError;
  }

  const { data: members, error: membersError } = await admin
    .from("competition_members")
    .insert(
      input.members.map((member) => {
        const persona = E2E_PERSONAS[member.user];
        return {
          avatar_url: persona.avatarUrl,
          competition_id: competition.id,
          display_name: persona.displayName,
          friend_code: persona.friendCode,
          invited_by_user_id: member.invitedBy ? E2E_PERSONAS[member.invitedBy].userId : null,
          joined_at: member.joinedAt ?? null,
          role: member.role,
          status: member.status,
          user_id: persona.userId,
        };
      }),
    )
    .select("id,user_id");

  if (membersError) {
    throw membersError;
  }

  const memberIds = new Map(members?.map((member) => [member.user_id, member.id]) ?? []);
  const goalRows = input.goals
    .map((goal) => {
      const persona = E2E_PERSONAS[goal.member];
      const memberId = memberIds.get(persona.userId);
      if (!memberId) {
        return null;
      }

      return {
        competition_id: competition.id,
        competition_member_id: memberId,
        metric_key: goal.metricKey,
        start_value: goal.startValue,
        target_date: input.targetDate,
        target_date_locked: true,
        target_value: goal.targetValue,
        title: goal.title,
        unit: goal.unit,
        user_id: persona.userId,
      };
    })
    .filter((goal): goal is NonNullable<typeof goal> => Boolean(goal));

  if (goalRows.length === 0) {
    return;
  }

  const { error: goalError } = await admin.from("user_personal_goals").insert(goalRows);

  if (goalError) {
    throw goalError;
  }
}

async function seedCompetitions(admin: AdminClient) {
  await seedCompetitionWithMembers(admin, {
    goals: [
      { member: "alice", metricKey: "fatPercent", startValue: 27.8, targetValue: 23.5, title: "Mia body-fat target", unit: "%" },
      { member: "bob", metricKey: "muscle", startValue: 34.1, targetValue: 35.0, title: "Ryan lean-mass block", unit: "kg" },
      { member: "luna", metricKey: "weight", startValue: 60.4, targetValue: 59.2, title: "Luna slow-cut target", unit: "kg" },
    ],
    members: [
      { joinedAt: "2026-06-01T00:00:00Z", role: "owner", status: "accepted", user: "alice" },
      { invitedBy: "alice", joinedAt: "2026-06-02T00:00:00Z", role: "participant", status: "accepted", user: "bob" },
      { invitedBy: "alice", joinedAt: "2026-06-03T00:00:00Z", role: "participant", status: "accepted", user: "luna" },
      { invitedBy: "alice", role: "participant", status: "invited", user: "competitor" },
    ],
    name: "Summer Recomp Crew",
    owner: "alice",
    status: "active",
    targetDate: "2026-07-31",
  });

  await seedCompetitionWithMembers(admin, {
    goals: [
      { member: "alice", metricKey: "muscle", startValue: 26.1, targetValue: 27.0, title: "Mia upper-body phase", unit: "kg" },
      { member: "kai", metricKey: "score", startValue: 80, targetValue: 83, title: "Kai consistency rebound", unit: "pts" },
      { member: "sofia", metricKey: "fat", startValue: 13.8, targetValue: 12.5, title: "Sofia fat-mass phase", unit: "kg" },
    ],
    members: [
      { joinedAt: "2026-06-07T00:00:00Z", role: "owner", status: "accepted", user: "alice" },
      { invitedBy: "alice", joinedAt: "2026-06-08T00:00:00Z", role: "participant", status: "accepted", user: "kai" },
      { invitedBy: "alice", joinedAt: "2026-06-09T00:00:00Z", role: "participant", status: "accepted", user: "sofia" },
    ],
    name: "August Strength Block",
    owner: "alice",
    status: "active",
    targetDate: "2026-08-15",
  });

  await seedCompetitionWithMembers(admin, {
    goals: [
      { member: "alice", metricKey: "weight", startValue: 62.0, targetValue: 60.8, title: "May finish check", unit: "kg" },
      { member: "bob", metricKey: "score", startValue: 80, targetValue: 87, title: "Ryan score stretch", unit: "pts" },
    ],
    members: [
      { joinedAt: "2026-04-20T00:00:00Z", role: "owner", status: "accepted", user: "alice" },
      { invitedBy: "alice", joinedAt: "2026-04-21T00:00:00Z", role: "participant", status: "accepted", user: "bob" },
    ],
    name: "May Check-in League",
    owner: "alice",
    status: "completed",
    targetDate: "2026-05-31",
  });

  await seedCompetitionWithMembers(admin, {
    goals: [{ member: "sofia", metricKey: "fatPercent", startValue: 24.4, targetValue: 21.8, title: "Sofia late-summer cut", unit: "%" }],
    members: [
      { joinedAt: "2026-06-12T00:00:00Z", role: "owner", status: "accepted", user: "sofia" },
      { invitedBy: "sofia", role: "participant", status: "invited", user: "alice" },
    ],
    name: "Sofia's Late-Summer Cut",
    owner: "sofia",
    status: "active",
    targetDate: "2026-08-31",
  });
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

  if (scenario === "dashboard-rich") {
    await seedRichPeers(admin);
    await seedFriendships(admin, ["bob", "competitor", "luna", "kai", "sofia"]);
  }

  if (scenario === "friends-ready") {
    await seedFriendships(admin, ["bob"]);
  }

  if (scenario === "dashboard-rich") {
    await seedCompetitions(admin);
  }
}

export function getE2EPersonaCredentials(personaKey: E2EPersonaKey) {
  const persona = E2E_PERSONAS[personaKey];
  return {
    email: persona.email,
    password: getPersonaPassword(),
  };
}
