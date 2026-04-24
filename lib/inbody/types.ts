export const SEGMENT_PARTS = [
  { key: "leftArm", label: "Left Arm" },
  { key: "rightArm", label: "Right Arm" },
  { key: "trunk", label: "Trunk" },
  { key: "leftLeg", label: "Left Leg" },
  { key: "rightLeg", label: "Right Leg" },
] as const;

export const CHART_VIEWS = [
  { key: "overall", label: "Overall" },
  ...SEGMENT_PARTS.map((part) => ({ key: part.key, label: part.label })),
] as const;

export type SegmentPartKey = (typeof SEGMENT_PARTS)[number]["key"];
export type ChartViewKey = (typeof CHART_VIEWS)[number]["key"];
export type GenderType = "male" | "female" | "other" | "unknown";
export type RecordSourceType = "manual" | "photo_scan";

export interface SegmentMetric {
  name: string;
  muscle: number | null;
  fat: number | null;
  muscleRatio: number | null;
  fatRatio: number | null;
}

export type SegmentMap = Record<SegmentPartKey, SegmentMetric>;

export interface InbodyRecord {
  id: string;
  userId: string;
  date: string;
  height: number | null;
  age: number | null;
  gender: GenderType;
  score: number | null;
  weight: number | null;
  muscle: number | null;
  fat: number | null;
  fatPercent: number | null;
  visceralFatLevel: number | null;
  bmr: number | null;
  recommendedCalories: number | null;
  isIncludedInCharts: boolean;
  sourceType: RecordSourceType;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
  segmental: SegmentMap;
}

export interface RecordInput {
  date: string;
  height: number | null;
  age: number | null;
  gender: GenderType;
  score: number | null;
  weight: number | null;
  muscle: number | null;
  fat: number | null;
  fatPercent: number | null;
  visceralFatLevel: number | null;
  bmr: number | null;
  recommendedCalories: number | null;
  isIncludedInCharts: boolean;
  sourceType: RecordSourceType;
  notes: string | null;
  segmental: SegmentMap;
}

export interface ChartMetric {
  key: string;
  label: string;
  color: string;
  unit: string;
  axis: "mass" | "ratio";
}

export interface ChartPayload {
  view: ChartViewKey;
  metrics: ChartMetric[];
  points: Array<Record<string, string | number | null>>;
}