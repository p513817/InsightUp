const REDUCE_IS_BETTER_KEYS = new Set(["weight", "fat", "fatPercent", "visceralFatLevel", "fatRatio"]);
const INCREASE_IS_BETTER_KEYS = new Set(["muscle", "score", "bmr", "recommendedCalories", "muscleRatio"]);

export function getMetricProgressDirection(metricKey: string, delta: number | null | undefined) {
  if (delta == null || Number.isNaN(Number(delta)) || Number(delta) === 0) {
    return "neutral" as const;
  }

  if (REDUCE_IS_BETTER_KEYS.has(metricKey)) {
    return Number(delta) < 0 ? ("positive" as const) : ("negative" as const);
  }

  if (INCREASE_IS_BETTER_KEYS.has(metricKey)) {
    return Number(delta) > 0 ? ("positive" as const) : ("negative" as const);
  }

  return "neutral" as const;
}

export function getMetricDeltaToneClass(metricKey: string, delta: number | null | undefined) {
  const direction = getMetricProgressDirection(metricKey, delta);

  if (direction === "positive") {
    return "bg-success/10 text-success";
  }

  if (direction === "negative") {
    return "bg-danger/10 text-danger";
  }

  return "bg-muted/42 text-muted-foreground";
}
