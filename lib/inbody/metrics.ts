import type { ChartMetric, ChartViewKey, InbodyRecord } from "@/lib/inbody/types";
import type { Locale } from "@/lib/i18n";

export type MetricImprovementDirection = "higher_is_better" | "lower_is_better" | "neutral";
export type MetricProgressTone = "positive" | "negative" | "neutral";

type MetricAxis = ChartMetric["axis"];
type ChartScope = "overall" | "segmental";
type OverallRecordMetricKey = keyof Pick<
  InbodyRecord,
  "weight" | "muscle" | "fat" | "fatPercent" | "score" | "visceralFatLevel" | "bmr" | "recommendedCalories"
>;

type PersonalGoalPolicy = {
  recordKey: OverallRecordMetricKey;
  step: number;
};

type MetricPolicy = {
  axis: MetricAxis;
  chartScopes: readonly ChartScope[];
  color: string;
  improvementDirection: MetricImprovementDirection;
  labels: Record<Locale, string>;
  personalGoal?: PersonalGoalPolicy;
  unit: string;
};

const CHART_BLUE_PALETTE = {
  navy: "#17345d",
  royal: "#245da8",
  azure: "#2f7fc2",
  sky: "#4c95d8",
  steel: "#5f82aa",
  slate: "#718aa8",
  indigo: "#3f5f9f",
  pale: "#7aa6d6",
} as const;

export const INBODY_METRIC_POLICIES = {
  weight: {
    axis: "mass",
    chartScopes: ["overall"],
    color: CHART_BLUE_PALETTE.navy,
    improvementDirection: "neutral",
    labels: { "zh-Hant": "體重", en: "Weight" },
    personalGoal: { recordKey: "weight", step: 0.1 },
    unit: "kg",
  },
  muscle: {
    axis: "mass",
    chartScopes: ["overall", "segmental"],
    color: CHART_BLUE_PALETTE.royal,
    improvementDirection: "higher_is_better",
    labels: { "zh-Hant": "骨骼肌量", en: "Skeletal muscle" },
    personalGoal: { recordKey: "muscle", step: 0.1 },
    unit: "kg",
  },
  fat: {
    axis: "mass",
    chartScopes: ["overall", "segmental"],
    color: CHART_BLUE_PALETTE.azure,
    improvementDirection: "lower_is_better",
    labels: { "zh-Hant": "體脂肪量", en: "Body fat" },
    personalGoal: { recordKey: "fat", step: 0.1 },
    unit: "kg",
  },
  fatPercent: {
    axis: "ratio",
    chartScopes: ["overall"],
    color: CHART_BLUE_PALETTE.indigo,
    improvementDirection: "lower_is_better",
    labels: { "zh-Hant": "體脂率", en: "Body fat %" },
    personalGoal: { recordKey: "fatPercent", step: 0.1 },
    unit: "%",
  },
  score: {
    axis: "ratio",
    chartScopes: ["overall"],
    color: CHART_BLUE_PALETTE.sky,
    improvementDirection: "higher_is_better",
    labels: { "zh-Hant": "InBody 分數", en: "InBody score" },
    personalGoal: { recordKey: "score", step: 1 },
    unit: "pt",
  },
  visceralFatLevel: {
    axis: "ratio",
    chartScopes: ["overall"],
    color: CHART_BLUE_PALETTE.steel,
    improvementDirection: "lower_is_better",
    labels: { "zh-Hant": "內臟脂肪", en: "Visceral fat" },
    personalGoal: { recordKey: "visceralFatLevel", step: 1 },
    unit: "lvl",
  },
  bmr: {
    axis: "ratio",
    chartScopes: ["overall"],
    color: CHART_BLUE_PALETTE.slate,
    improvementDirection: "neutral",
    labels: { "zh-Hant": "基礎代謝率", en: "BMR" },
    personalGoal: { recordKey: "bmr", step: 10 },
    unit: "kcal",
  },
  recommendedCalories: {
    axis: "ratio",
    chartScopes: ["overall"],
    color: CHART_BLUE_PALETTE.pale,
    improvementDirection: "neutral",
    labels: { "zh-Hant": "建議熱量", en: "Recommended calories" },
    personalGoal: { recordKey: "recommendedCalories", step: 10 },
    unit: "kcal",
  },
  muscleRatio: {
    axis: "ratio",
    chartScopes: ["segmental"],
    color: CHART_BLUE_PALETTE.sky,
    improvementDirection: "higher_is_better",
    labels: { "zh-Hant": "肌肉比例", en: "Muscle ratio" },
    unit: "%",
  },
  fatRatio: {
    axis: "ratio",
    chartScopes: ["segmental"],
    color: CHART_BLUE_PALETTE.indigo,
    improvementDirection: "lower_is_better",
    labels: { "zh-Hant": "脂肪比例", en: "Fat ratio" },
    unit: "%",
  },
} as const satisfies Record<string, MetricPolicy>;

export type InbodyMetricKey = keyof typeof INBODY_METRIC_POLICIES;

export const OVERALL_CHART_METRIC_KEYS = [
  "weight",
  "muscle",
  "fat",
  "fatPercent",
  "score",
  "visceralFatLevel",
  "bmr",
  "recommendedCalories",
] as const satisfies readonly InbodyMetricKey[];

export const SEGMENTAL_CHART_METRIC_KEYS = ["muscle", "fat", "muscleRatio", "fatRatio"] as const satisfies readonly InbodyMetricKey[];

export const PERSONAL_GOAL_METRIC_KEYS = [
  "weight",
  "muscle",
  "fat",
  "fatPercent",
  "score",
  "visceralFatLevel",
  "bmr",
  "recommendedCalories",
] as const satisfies readonly InbodyMetricKey[];
export type PersonalGoalMetricKey = (typeof PERSONAL_GOAL_METRIC_KEYS)[number];

export type PersonalGoalMetric = {
  key: PersonalGoalMetricKey;
  recordKey: OverallRecordMetricKey;
  step: number;
  unit: string;
};

function getMetricPolicy(metricKey: string) {
  return (INBODY_METRIC_POLICIES as Record<string, MetricPolicy | undefined>)[metricKey];
}

function toChartMetric(metricKey: InbodyMetricKey, locale: Locale): ChartMetric {
  const policy = INBODY_METRIC_POLICIES[metricKey];

  return {
    axis: policy.axis,
    color: policy.color,
    key: metricKey,
    label: policy.labels[locale],
    unit: policy.unit,
  };
}

export function getChartMetricsForView(view: ChartViewKey, locale: Locale = "zh-Hant"): ChartMetric[] {
  const metricKeys = view === "overall" ? OVERALL_CHART_METRIC_KEYS : SEGMENTAL_CHART_METRIC_KEYS;
  return metricKeys.map((metricKey) => toChartMetric(metricKey, locale));
}

export function getPersonalGoalMetrics(): PersonalGoalMetric[] {
  return PERSONAL_GOAL_METRIC_KEYS.map((metricKey) => {
    const policy = INBODY_METRIC_POLICIES[metricKey];
    const personalGoal = policy.personalGoal;

    if (!personalGoal) {
      throw new Error(`Metric ${metricKey} is missing personal goal policy.`);
    }

    return {
      key: metricKey,
      recordKey: personalGoal.recordKey,
      step: personalGoal.step,
      unit: policy.unit,
    };
  });
}

export function getMetricImprovementDirection(metricKey: string): MetricImprovementDirection {
  return getMetricPolicy(metricKey)?.improvementDirection ?? "neutral";
}

export function getMetricProgressTone(metricKey: string, delta: number | null | undefined): MetricProgressTone {
  if (delta == null || Number.isNaN(Number(delta)) || Number(delta) === 0) {
    return "neutral";
  }

  const improvementDirection = getMetricImprovementDirection(metricKey);

  if (improvementDirection === "lower_is_better") {
    return Number(delta) < 0 ? "positive" : "negative";
  }

  if (improvementDirection === "higher_is_better") {
    return Number(delta) > 0 ? "positive" : "negative";
  }

  return "neutral";
}
