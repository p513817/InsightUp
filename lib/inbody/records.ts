import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecordFormValues } from "@/lib/inbody/schema";
import {
  CHART_VIEWS,
  type ChartMetric,
  type ChartPayload,
  type ChartViewKey,
  type InbodyRecord,
  type RecordInput,
  type SegmentMap,
  SEGMENT_PARTS,
} from "@/lib/inbody/types";

const RECORD_SELECT = `
  id,
  user_id,
  recorded_at,
  height,
  age,
  gender,
  score,
  weight,
  muscle,
  fat,
  fat_percent,
  visceral_fat_level,
  bmr,
  recommended_calories,
  is_included_in_charts,
  source_type,
  notes,
  created_at,
  updated_at,
  inbody_segments (
    part_key,
    part_name,
    muscle,
    fat,
    muscle_ratio,
    fat_ratio
  )
`;

const OVERALL_METRICS: ChartMetric[] = [
  { key: "weight", label: "Weight", color: "#1c365f", unit: "kg", axis: "mass" },
  { key: "muscle", label: "Muscle", color: "#3d7bb2", unit: "kg", axis: "mass" },
  { key: "fat", label: "Fat", color: "#b56878", unit: "kg", axis: "mass" },
  { key: "fatPercent", label: "Fat %", color: "#8a659f", unit: "%", axis: "ratio" },
  { key: "score", label: "InBody Score", color: "#79d7c3", unit: "pt", axis: "ratio" },
  { key: "visceralFatLevel", label: "Visceral Fat", color: "#5e88a7", unit: "lvl", axis: "ratio" },
  { key: "bmr", label: "BMR", color: "#71839a", unit: "kcal", axis: "ratio" },
  { key: "recommendedCalories", label: "Calories", color: "#4d67a8", unit: "kcal", axis: "ratio" },
];

const SEGMENTAL_METRICS: ChartMetric[] = [
  { key: "muscle", label: "Muscle", color: "#3d7bb2", unit: "kg", axis: "mass" },
  { key: "fat", label: "Fat", color: "#b56878", unit: "kg", axis: "mass" },
  { key: "muscleRatio", label: "Muscle Ratio", color: "#79d7c3", unit: "%", axis: "ratio" },
  { key: "fatRatio", label: "Fat Ratio", color: "#8a659f", unit: "%", axis: "ratio" },
];

export function createSegmentalDataFromRecord(record: Partial<RecordInput>): SegmentMap {
  const muscle = Number(record?.muscle ?? 0);
  const fat = Number(record?.fat ?? 0);
  const fatPercent = Number(record?.fatPercent ?? 0);

  const armMuscleBase = muscle * 0.075;
  const armFatBase = fat * 0.09;
  const legMuscleBase = muscle * 0.235;
  const legFatBase = fat * 0.16;
  const trunkMuscleBase = muscle * 0.65;
  const trunkFatBase = fat * 0.5;

  return {
    leftArm: {
      name: "Left Arm",
      muscle: Number((armMuscleBase * 0.99).toFixed(2)),
      fat: Number((armFatBase * 1.02).toFixed(2)),
      muscleRatio: Number((98 + (muscle - 30) * 1.8).toFixed(1)),
      fatRatio: Number((100 + (fatPercent - 18) * 4).toFixed(1)),
    },
    rightArm: {
      name: "Right Arm",
      muscle: Number((armMuscleBase * 1.01).toFixed(2)),
      fat: Number((armFatBase * 0.98).toFixed(2)),
      muscleRatio: Number((100 + (muscle - 30) * 1.8).toFixed(1)),
      fatRatio: Number((98 + (fatPercent - 18) * 4).toFixed(1)),
    },
    trunk: {
      name: "Trunk",
      muscle: Number(trunkMuscleBase.toFixed(2)),
      fat: Number(trunkFatBase.toFixed(2)),
      muscleRatio: Number((96 + (muscle - 30) * 1.4).toFixed(1)),
      fatRatio: Number((120 + (fatPercent - 18) * 7).toFixed(1)),
    },
    leftLeg: {
      name: "Left Leg",
      muscle: Number((legMuscleBase * 0.995).toFixed(2)),
      fat: Number((legFatBase * 1.01).toFixed(2)),
      muscleRatio: Number((99 + (muscle - 30) * 1.6).toFixed(1)),
      fatRatio: Number((99 + (fatPercent - 18) * 3.5).toFixed(1)),
    },
    rightLeg: {
      name: "Right Leg",
      muscle: Number((legMuscleBase * 1.005).toFixed(2)),
      fat: Number((legFatBase * 0.99).toFixed(2)),
      muscleRatio: Number((100 + (muscle - 30) * 1.6).toFixed(1)),
      fatRatio: Number((98 + (fatPercent - 18) * 3.5).toFixed(1)),
    },
  };
}

export function ensureSegmentalData(record: Partial<RecordInput> & { segmental?: Partial<SegmentMap> | null }): SegmentMap {
  const fallback = createSegmentalDataFromRecord(record);

  return SEGMENT_PARTS.reduce((acc, part) => {
    const segment = record.segmental?.[part.key];
    acc[part.key] = {
      name: segment?.name || part.label,
      muscle: segment?.muscle ?? fallback[part.key].muscle,
      fat: segment?.fat ?? fallback[part.key].fat,
      muscleRatio: segment?.muscleRatio ?? fallback[part.key].muscleRatio,
      fatRatio: segment?.fatRatio ?? fallback[part.key].fatRatio,
    };
    return acc;
  }, {} as SegmentMap);
}

function mapSegmentRowsToObject(segmentRows: Array<Record<string, unknown>> = []) {
  return SEGMENT_PARTS.reduce((acc, part) => {
    const row = segmentRows.find((entry) => entry.part_key === part.key);
    acc[part.key] = {
      name: String(row?.part_name || part.label),
      muscle: (row?.muscle as number | null | undefined) ?? null,
      fat: (row?.fat as number | null | undefined) ?? null,
      muscleRatio: (row?.muscle_ratio as number | null | undefined) ?? null,
      fatRatio: (row?.fat_ratio as number | null | undefined) ?? null,
    };
    return acc;
  }, {} as SegmentMap);
}

function mapRecordRow(row: Record<string, unknown>): InbodyRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    date: String(row.recorded_at),
    height: (row.height as number | null | undefined) ?? null,
    age: (row.age as number | null | undefined) ?? null,
    gender: String(row.gender || "unknown") as InbodyRecord["gender"],
    score: (row.score as number | null | undefined) ?? null,
    weight: (row.weight as number | null | undefined) ?? null,
    muscle: (row.muscle as number | null | undefined) ?? null,
    fat: (row.fat as number | null | undefined) ?? null,
    fatPercent: (row.fat_percent as number | null | undefined) ?? null,
    visceralFatLevel: (row.visceral_fat_level as number | null | undefined) ?? null,
    bmr: (row.bmr as number | null | undefined) ?? null,
    recommendedCalories: (row.recommended_calories as number | null | undefined) ?? null,
    isIncludedInCharts: Boolean(row.is_included_in_charts),
    sourceType: String(row.source_type || "manual") as InbodyRecord["sourceType"],
    notes: (row.notes as string | null | undefined) ?? null,
    createdAt: (row.created_at as string | undefined) ?? undefined,
    updatedAt: (row.updated_at as string | undefined) ?? undefined,
    segmental: mapSegmentRowsToObject((row.inbody_segments as Array<Record<string, unknown>> | undefined) || []),
  };
}

function toRecordRowPayload(record: RecordInput, userId?: string) {
  return {
    ...(userId ? { user_id: userId } : {}),
    recorded_at: record.date,
    height: record.height,
    age: record.age,
    gender: record.gender,
    score: record.score,
    weight: record.weight,
    muscle: record.muscle,
    fat: record.fat,
    fat_percent: record.fatPercent,
    visceral_fat_level: record.visceralFatLevel,
    bmr: record.bmr,
    recommended_calories: record.recommendedCalories,
    is_included_in_charts: record.isIncludedInCharts,
    source_type: record.sourceType,
    notes: record.notes,
  };
}

function toSegmentRows(recordId: string, segmental: SegmentMap) {
  return Object.entries(segmental).map(([partKey, segment]) => ({
    record_id: recordId,
    part_key: partKey,
    part_name: segment.name,
    muscle: segment.muscle,
    fat: segment.fat,
    muscle_ratio: segment.muscleRatio,
    fat_ratio: segment.fatRatio,
  }));
}

export async function listRecords(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("inbody_records")
    .select(RECORD_SELECT)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("recorded_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => mapRecordRow(row as Record<string, unknown>));
}

export async function getRecordById(supabase: SupabaseClient, userId: string, recordId: string) {
  const { data, error } = await supabase
    .from("inbody_records")
    .select(RECORD_SELECT)
    .eq("user_id", userId)
    .eq("id", recordId)
    .is("deleted_at", null)
    .single();

  if (error) {
    throw error;
  }

  return mapRecordRow(data as Record<string, unknown>);
}

export async function createRecord(supabase: SupabaseClient, userId: string, input: RecordInput) {
  const payload = toRecordRowPayload(input, userId);
  const { data, error } = await supabase
    .from("inbody_records")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  const segmental = ensureSegmentalData(input);
  const { error: segmentError } = await supabase.from("inbody_segments").insert(toSegmentRows(data.id, segmental));

  if (segmentError) {
    throw segmentError;
  }

  return getRecordById(supabase, userId, data.id);
}

export async function updateRecord(supabase: SupabaseClient, userId: string, recordId: string, input: RecordInput) {
  const { error } = await supabase
    .from("inbody_records")
    .update(toRecordRowPayload(input))
    .eq("user_id", userId)
    .eq("id", recordId);

  if (error) {
    throw error;
  }

  const segmental = ensureSegmentalData(input);
  const { error: segmentError } = await supabase
    .from("inbody_segments")
    .upsert(toSegmentRows(recordId, segmental), { onConflict: "record_id,part_key" });

  if (segmentError) {
    throw segmentError;
  }

  return getRecordById(supabase, userId, recordId);
}

export async function softDeleteRecord(supabase: SupabaseClient, userId: string, recordId: string) {
  const { error } = await supabase
    .from("inbody_records")
    .update({ deleted_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", recordId);

  if (error) {
    throw error;
  }
}

export function buildChartPayload(records: InbodyRecord[], view: ChartViewKey): ChartPayload {
  const filteredRecords = records
    .filter((record) => record.isIncludedInCharts)
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());

  const metrics = view === "overall" ? OVERALL_METRICS : SEGMENTAL_METRICS;
  const points = filteredRecords.map((record) => {
    const point: Record<string, string | number | null> = {
      date: record.date,
      label: new Intl.DateTimeFormat("zh-TW", { month: "2-digit", day: "2-digit" }).format(new Date(record.date)),
    };

    metrics.forEach((metric) => {
      if (view === "overall") {
        point[metric.key] = (record as unknown as Record<string, number | null>)[metric.key] ?? null;
        return;
      }

      point[metric.key] = record.segmental[view]?.[metric.key as keyof SegmentMap[typeof view]] ?? null;
    });

    return point;
  });

  return { view, metrics, points };
}

export function getDefaultChartView(): ChartViewKey {
  return CHART_VIEWS[0].key;
}

export function getLatestIncludedRecord(records: InbodyRecord[]) {
  return [...records]
    .filter((record) => record.isIncludedInCharts)
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())[0] ?? null;
}

export function formValuesToRecordInput(values: RecordFormValues): RecordInput {
  return {
    ...values,
    notes: values.notes,
    segmental: ensureSegmentalData({ ...values, segmental: values.segmental as any }),
  };
}

export function recordToFormValues(record?: InbodyRecord | null): RecordFormValues {
  return {
    date: record?.date ?? new Date().toISOString().slice(0, 10),
    height: record?.height ?? null,
    age: record?.age ?? null,
    gender: record?.gender ?? "unknown",
    score: record?.score ?? null,
    weight: record?.weight ?? null,
    muscle: record?.muscle ?? null,
    fat: record?.fat ?? null,
    fatPercent: record?.fatPercent ?? null,
    visceralFatLevel: record?.visceralFatLevel ?? null,
    bmr: record?.bmr ?? null,
    recommendedCalories: record?.recommendedCalories ?? null,
    sourceType: record?.sourceType ?? "manual",
    isIncludedInCharts: record?.isIncludedInCharts ?? true,
    notes: record?.notes ?? null,
    segmental: {
      leftArm: {
        muscle: record?.segmental.leftArm.muscle ?? null,
        fat: record?.segmental.leftArm.fat ?? null,
      },
      rightArm: {
        muscle: record?.segmental.rightArm.muscle ?? null,
        fat: record?.segmental.rightArm.fat ?? null,
      },
      trunk: {
        muscle: record?.segmental.trunk.muscle ?? null,
        fat: record?.segmental.trunk.fat ?? null,
      },
      leftLeg: {
        muscle: record?.segmental.leftLeg.muscle ?? null,
        fat: record?.segmental.leftLeg.fat ?? null,
      },
      rightLeg: {
        muscle: record?.segmental.rightLeg.muscle ?? null,
        fat: record?.segmental.rightLeg.fat ?? null,
      },
    },
  };
}