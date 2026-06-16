import { getMetricProgressTone } from "@/lib/inbody/metrics";

export function getMetricProgressDirection(metricKey: string, delta: number | null | undefined) {
  return getMetricProgressTone(metricKey, delta);
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
