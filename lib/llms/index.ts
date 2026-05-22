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

function extractFirstJsonObject(text: string) {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = inString;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
      continue;
    }

    if (char === "}" && depth > 0) {
      depth -= 1;

      if (depth === 0 && start >= 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return null;
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
    const strippedText = stripJsonFence(text);
    const parsed = JSON.parse(strippedText) as Record<string, unknown>;

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
    const extractedJson = extractFirstJsonObject(stripJsonFence(text));

    if (!extractedJson || extractedJson === text) {
      return null;
    }

    return parseStructuredSummaryText(extractedJson);
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
