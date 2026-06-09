import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { InbodyRecord } from "@/lib/inbody/types";

export const PERSONAL_GOAL_METRIC_KEYS = [
  "weight",
  "muscle",
  "fat",
  "fatPercent",
  "score",
  "visceralFatLevel",
  "bmr",
  "recommendedCalories",
] as const;

export type PersonalGoalMetricKey = (typeof PERSONAL_GOAL_METRIC_KEYS)[number];

export type PersonalGoalMetric = {
  key: PersonalGoalMetricKey;
  recordKey: keyof Pick<
    InbodyRecord,
    "weight" | "muscle" | "fat" | "fatPercent" | "score" | "visceralFatLevel" | "bmr" | "recommendedCalories"
  >;
  unit: string;
  step: number;
};

export const PERSONAL_GOAL_METRICS: PersonalGoalMetric[] = [
  { key: "weight", recordKey: "weight", unit: "kg", step: 0.1 },
  { key: "muscle", recordKey: "muscle", unit: "kg", step: 0.1 },
  { key: "fat", recordKey: "fat", unit: "kg", step: 0.1 },
  { key: "fatPercent", recordKey: "fatPercent", unit: "%", step: 0.1 },
  { key: "score", recordKey: "score", unit: "pt", step: 1 },
  { key: "visceralFatLevel", recordKey: "visceralFatLevel", unit: "lvl", step: 1 },
  { key: "bmr", recordKey: "bmr", unit: "kcal", step: 10 },
  { key: "recommendedCalories", recordKey: "recommendedCalories", unit: "kcal", step: 10 },
];

export const personalGoalCreateSchema = z.object({
  title: z.string().trim().max(80).nullable().optional(),
  startRecordId: z.string().uuid().nullable().optional(),
  metricKey: z.enum(PERSONAL_GOAL_METRIC_KEYS),
  startValue: z.number().finite(),
  targetValue: z.number().finite(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export const personalGoalBatchCreateSchema = z.object({
  goals: z.array(personalGoalCreateSchema).min(1).max(PERSONAL_GOAL_METRICS.length),
});

export type PersonalGoalCreateValues = z.infer<typeof personalGoalCreateSchema>;

export const personalGoalUpdateSchema = z.object({
  title: z.string().trim().max(80).nullable().optional(),
  startRecordId: z.string().uuid().nullable().optional(),
  startValue: z.number().finite(),
  targetValue: z.number().finite(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export type PersonalGoalUpdateValues = z.infer<typeof personalGoalUpdateSchema>;

export type PersonalGoal = {
  id: string;
  title: string | null;
  startRecordId: string | null;
  metricKey: PersonalGoalMetricKey;
  startValue: number;
  targetValue: number;
  unit: string;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
  latestValue: number | null;
  referenceRecordDate: string | null;
  progressPercent: number;
  isAchieved: boolean;
};

type PersonalGoalRow = {
  id: string;
  title?: string | null;
  start_record_id?: string | null;
  metric_key: PersonalGoalMetricKey;
  start_value: number | string;
  target_value: number | string;
  unit: string;
  target_date?: string | null;
  created_at: string;
  updated_at: string;
};

function isMissingPersonalGoalsTable(error: { code?: string; message?: string } | null) {
  return error?.code === "42P01" || Boolean(error?.message?.includes("user_personal_goals"));
}

function isMissingPersonalGoalTitleColumn(error: { code?: string; message?: string } | null) {
  return error?.code === "42703" && Boolean(error?.message?.includes("title"));
}

function isMissingPersonalGoalStartRecordColumn(error: { code?: string; message?: string } | null) {
  return error?.code === "42703" && Boolean(error?.message?.includes("start_record_id"));
}

function getGoalMetric(metricKey: PersonalGoalMetricKey) {
  return PERSONAL_GOAL_METRICS.find((metric) => metric.key === metricKey) ?? PERSONAL_GOAL_METRICS[0];
}

export function getLatestMetricValue(record: InbodyRecord | null | undefined, metricKey: PersonalGoalMetricKey) {
  if (!record) {
    return null;
  }

  const metric = getGoalMetric(metricKey);
  const value = record[metric.recordKey];
  return typeof value === "number" ? value : null;
}

function getProgressRecordForGoal(records: InbodyRecord[] | undefined, targetDate: string | null | undefined, fallbackRecord: InbodyRecord | null) {
  if (!records?.length) {
    return fallbackRecord;
  }

  const eligibleRecords = targetDate
    ? records.filter((record) => record.date <= targetDate)
    : records;

  return [...eligibleRecords].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())[0] ?? fallbackRecord;
}

function calculateGoalProgress(startValue: number, targetValue: number, latestValue: number | null) {
  if (latestValue == null) {
    return { progressPercent: 0, isAchieved: false };
  }

  const totalChange = targetValue - startValue;

  if (totalChange === 0) {
    return { progressPercent: latestValue === targetValue ? 100 : 0, isAchieved: latestValue === targetValue };
  }

  const rawProgress = ((latestValue - startValue) / totalChange) * 100;
  const isAchieved = totalChange > 0 ? latestValue >= targetValue : latestValue <= targetValue;

  return {
    progressPercent: isAchieved ? 100 : Math.round(rawProgress),
    isAchieved,
  };
}

function mapGoalRow(row: PersonalGoalRow, latestRecord: InbodyRecord | null, progressRecords?: InbodyRecord[]): PersonalGoal {
  const startValue = Number(row.start_value);
  const targetValue = Number(row.target_value);
  const progressRecord = getProgressRecordForGoal(progressRecords, row.target_date, latestRecord);
  const latestValue = getLatestMetricValue(progressRecord, row.metric_key);
  const progress = calculateGoalProgress(startValue, targetValue, latestValue);

  return {
    id: row.id,
    title: row.title ?? null,
    startRecordId: row.start_record_id ?? null,
    metricKey: row.metric_key,
    startValue,
    targetValue,
    unit: row.unit,
    targetDate: row.target_date ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    latestValue,
    referenceRecordDate: progressRecord?.date ?? null,
    ...progress,
  };
}

export async function listPersonalGoals(
  supabase: SupabaseClient,
  userId: string,
  latestRecord: InbodyRecord | null,
  progressRecords?: InbodyRecord[],
) {
  const { data, error } = await supabase
    .from("user_personal_goals")
    .select("id, title, start_record_id, metric_key, start_value, target_value, unit, target_date, created_at, updated_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingPersonalGoalsTable(error)) {
      return [];
    }

    if (isMissingPersonalGoalTitleColumn(error) || isMissingPersonalGoalStartRecordColumn(error)) {
      const { data: legacyData, error: legacyError } = await supabase
        .from("user_personal_goals")
        .select("id, metric_key, start_value, target_value, unit, target_date, created_at, updated_at")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (legacyError) {
        throw legacyError;
      }

      return ((legacyData || []) as PersonalGoalRow[]).map((row) => mapGoalRow(row, latestRecord, progressRecords));
    }

    throw error;
  }

  return ((data || []) as PersonalGoalRow[]).map((row) => mapGoalRow(row, latestRecord, progressRecords));
}

export async function createPersonalGoal(
  supabase: SupabaseClient,
  userId: string,
  input: PersonalGoalCreateValues,
  latestRecord: InbodyRecord | null,
) {
  const metric = getGoalMetric(input.metricKey);
  const { data, error } = await supabase
    .from("user_personal_goals")
    .insert({
      user_id: userId,
      title: input.title?.trim() || null,
      start_record_id: input.startRecordId ?? null,
      metric_key: input.metricKey,
      start_value: input.startValue,
      target_value: input.targetValue,
      unit: metric.unit,
      target_date: input.targetDate ?? null,
    })
    .select("id, title, start_record_id, metric_key, start_value, target_value, unit, target_date, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return mapGoalRow(data as PersonalGoalRow, latestRecord);
}

export async function createPersonalGoals(
  supabase: SupabaseClient,
  userId: string,
  inputs: PersonalGoalCreateValues[],
  latestRecord: InbodyRecord | null,
) {
  const payload = inputs.map((input) => {
    const metric = getGoalMetric(input.metricKey);

    return {
      user_id: userId,
      title: input.title?.trim() || null,
      start_record_id: input.startRecordId ?? null,
      metric_key: input.metricKey,
      start_value: input.startValue,
      target_value: input.targetValue,
      unit: metric.unit,
      target_date: input.targetDate ?? null,
    };
  });

  const { data, error } = await supabase
    .from("user_personal_goals")
    .insert(payload)
    .select("id, title, start_record_id, metric_key, start_value, target_value, unit, target_date, created_at, updated_at");

  if (error) {
    throw error;
  }

  return ((data || []) as PersonalGoalRow[]).map((row) => mapGoalRow(row, latestRecord));
}

export async function updatePersonalGoal(
  supabase: SupabaseClient,
  userId: string,
  goalId: string,
  input: PersonalGoalUpdateValues,
  latestRecord: InbodyRecord | null,
) {
  const { data, error } = await supabase
    .from("user_personal_goals")
    .update({
      title: input.title?.trim() || null,
      start_record_id: input.startRecordId ?? null,
      start_value: input.startValue,
      target_value: input.targetValue,
      target_date: input.targetDate ?? null,
    })
    .eq("id", goalId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("id, title, start_record_id, metric_key, start_value, target_value, unit, target_date, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return mapGoalRow(data as PersonalGoalRow, latestRecord);
}

export async function softDeletePersonalGoal(supabase: SupabaseClient, userId: string, goalId: string) {
  const { error } = await supabase
    .from("user_personal_goals")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", goalId)
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }
}
