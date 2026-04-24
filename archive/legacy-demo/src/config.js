import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://kuhugqowjarxepapkzib.supabase.co/";
const SUPABASE_ANON_KEY = "sb_publishable_QT-37em6YpLv401MeqaGRQ_1vi1bYKI";

export const REDIRECT_URL = `${window.location.origin}/`;
export const DEFAULT_CHART_VIEW = "overall";
export const PROFILE_VIEW = "profile";

export const CHART_VIEWS = [
  { key: "overall", label: "Overall" },
  { key: "leftArm", label: "Left Arm" },
  { key: "rightArm", label: "Right Arm" },
  { key: "trunk", label: "Trunk" },
  { key: "leftLeg", label: "Left Leg" },
  { key: "rightLeg", label: "Right Leg" },
];

export function createChartMetrics(ensureSegmentalData) {
  return {
    overall: [
      { key: "weight", label: "Weight (kg)", color: "#6B5DD6", axisId: "yMass", unit: "kg", dashed: false, getValue: (record) => record.weight ?? null },
      { key: "muscle", label: "Muscle (kg)", color: "#547792", axisId: "yMass", unit: "kg", dashed: false, getValue: (record) => record.muscle ?? null },
      { key: "fat", label: "Fat (kg)", color: "#ef4444", axisId: "yMass", unit: "kg", dashed: false, getValue: (record) => record.fat ?? null },
      { key: "fatPercent", label: "Fat %", color: "#f59e0b", axisId: "yRatio", unit: "%", dashed: true, getValue: (record) => record.fatPercent ?? null },
      { key: "score", label: "InBody Score", color: "#10b981", axisId: "yRatio", dashed: true, getValue: (record) => record.score ?? null },
      { key: "visceralFatLevel", label: "Visceral Fat Level", color: "#f97316", axisId: "yRatio", dashed: true, getValue: (record) => record.visceralFatLevel ?? null },
      { key: "bmr", label: "BMR (kcal)", color: "#94b4c1", axisId: "yRatio", unit: "kcal", dashed: false, getValue: (record) => record.bmr ?? null },
      { key: "recommendedCalories", label: "Recommended Calories (kcal)", color: "#14b8a6", axisId: "yRatio", unit: "kcal", dashed: false, getValue: (record) => record.recommendedCalories ?? null },
    ],
    segmental: [
      { key: "muscle", label: "Muscle Mass (kg)", color: "#547792", axisId: "yMass", unit: "kg", dashed: false, getValue: (record, viewKey) => ensureSegmentalData(record)[viewKey]?.muscle ?? null },
      { key: "fat", label: "Fat Mass (kg)", color: "#ef4444", axisId: "yMass", unit: "kg", dashed: false, getValue: (record, viewKey) => ensureSegmentalData(record)[viewKey]?.fat ?? null },
      { key: "muscleRatio", label: "Muscle Ratio (%)", color: "#10b981", axisId: "yRatio", unit: "%", dashed: true, getValue: (record, viewKey) => ensureSegmentalData(record)[viewKey]?.muscleRatio ?? null },
      { key: "fatRatio", label: "Fat Ratio (%)", color: "#f59e0b", axisId: "yRatio", unit: "%", dashed: true, getValue: (record, viewKey) => ensureSegmentalData(record)[viewKey]?.fatRatio ?? null },
    ],
  };
}

function getSupabaseSingleton() {
  const globalScope = globalThis;

  if (globalScope.__insightupSupabaseClient) {
    return globalScope.__insightupSupabaseClient;
  }

  globalScope.__insightupSupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "insightup-auth",
    },
  });

  return globalScope.__insightupSupabaseClient;
}

export const supabase = getSupabaseSingleton();