import type { User } from "@supabase/supabase-js";
import type { ChartMetric, InbodyRecord } from "@/lib/inbody/types";

export interface AppUserSummary {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string | null;
}

export function summarizeUser(user: User): AppUserSummary {
  const metadata = user.user_metadata || {};

  return {
    id: user.id,
    name: metadata.full_name || metadata.name || user.email || "InsightUp User",
    email: user.email ?? null,
    avatarUrl: metadata.avatar_url || metadata.picture || null,
    createdAt: user.created_at ?? null,
  };
}

export function getUserInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "IU";
}

export function formatLongDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatCompactDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(date);
}

export function formatDecimal(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  const numericValue = Number(value);
  if (Number.isInteger(numericValue)) return String(numericValue);
  return numericValue.toFixed(2);
}

export function formatMetricValue(metric: ChartMetric, value: number | null | undefined) {
  const formatted = formatDecimal(value);
  if (formatted === "-") return formatted;
  return metric.unit === "%" ? `${formatted}%` : `${formatted} ${metric.unit}`;
}

export function formatSourceType(sourceType: InbodyRecord["sourceType"]) {
  return sourceType === "photo_scan" ? "Photo Scan" : "Manual";
}

export function formatRecordCountLabel(count: number) {
  return `${count} 筆紀錄`;
}