import { DEFAULT_GEMINI_ROTATION_MODELS, getModelPool, parseEntitlementConfig } from "@/lib/llms/models";
import { generateGeminiText } from "@/lib/llms/providers/gemini";
import type { InlineFileInput, StructuredTrendSummary } from "@/lib/llms/types";
import { LlmProviderError } from "@/lib/llms/types";

function normalizePlainText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function stripJsonFence(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => normalizePlainText(item))
    .filter((item) => item.length > 0);
}

export function parseStructuredSummaryText(text: string) {
  try {
    const parsed = JSON.parse(stripJsonFence(text)) as Record<string, unknown>;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    const overviewRaw = parsed.overview;
    const overview = typeof overviewRaw === "string" ? normalizePlainText(overviewRaw) : "";
    const keyChanges = toStringArray(parsed.keyChanges);
    const actionPlan = toStringArray(parsed.actionPlan);
    const watchouts = toStringArray(parsed.watchouts);

    if (!overview && keyChanges.length === 0 && actionPlan.length === 0 && watchouts.length === 0) {
      return null;
    }

    return {
      overview: overview || keyChanges[0] || actionPlan[0] || watchouts[0] || "",
      keyChanges,
      actionPlan,
      watchouts,
    } satisfies StructuredTrendSummary;
  } catch {
    return null;
  }
}

export function decodeStoredStructuredSummary(summaryText: string) {
  const structured = parseStructuredSummaryText(summaryText);

  if (structured) {
    return structured;
  }

  return {
    overview: normalizePlainText(summaryText),
    keyChanges: [],
    actionPlan: [],
    watchouts: [],
  } satisfies StructuredTrendSummary;
}

export function toLegacySummaryText(structured: StructuredTrendSummary) {
  return [structured.overview, ...structured.keyChanges, ...structured.actionPlan, ...structured.watchouts]
    .filter((line) => line.length > 0)
    .join(" ");
}

export async function generateText(prompt: string, modelPool: string[], inlineFile?: InlineFileInput) {
  return generateGeminiText(prompt, modelPool, inlineFile);
}

export {
  DEFAULT_GEMINI_ROTATION_MODELS,
  getModelPool,
  parseEntitlementConfig,
  LlmProviderError,
};
export type { InlineFileInput, StructuredTrendSummary } from "@/lib/llms/types";
