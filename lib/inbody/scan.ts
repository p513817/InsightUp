import { z } from "zod";
import { recordDraftSchema } from "@/lib/inbody/schema";
import { SEGMENT_PARTS, type RecordInput } from "@/lib/inbody/types";
import type { StructuredTrendSummary } from "@/lib/llms";

const structuredSummarySchema = z.object({
  overview: z.string().trim().default(""),
  keyChanges: z.array(z.string().trim()).default([]),
  actionPlan: z.array(z.string().trim()).default([]),
  watchouts: z.array(z.string().trim()).default([]),
});

const scanExtractionSchema = z.object({
  record: recordDraftSchema.default({}),
  summary: structuredSummarySchema.optional().default({
    overview: "",
    keyChanges: [],
    actionPlan: [],
    watchouts: [],
  }),
  scanConfidence: z.number().min(0).max(100).nullable().optional().default(null),
  uncertaintyNotes: z.array(z.string().trim()).optional().default([]),
});

export interface RecordScanResult {
  record: z.infer<typeof recordDraftSchema>;
  structuredSummary: StructuredTrendSummary | null;
  scanConfidence: number | null;
  uncertaintyNotes: string[];
}

function stripJsonFence(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

export function buildRecordScanPrompt() {
  const segmentKeys = SEGMENT_PARTS.map((part) => part.key).join(", ");

  return [
    "You are extracting structured health metrics from an InBody report image or PDF.",
    "Read only what is clearly visible in the uploaded document.",
    "If any field is blurry, cropped, ambiguous, conflicting, or not present, return null for that field.",
    "Do not estimate, infer, back-calculate, or fill missing values from related fields.",
    "Keep the response as JSON only. Do not wrap it in markdown.",
    "Return metric values exactly as numbers when visible.",
    "Use ISO date format YYYY-MM-DD when the measured date is visible; otherwise return null.",
    "Set sourceType to photo_scan.",
    "Set isIncludedInCharts to true unless the document clearly indicates the user should exclude it, otherwise true.",
    "The summary should be short and practical, and should mention when the user needs to review missing or uncertain items manually.",
    "For segmental values, use these keys exactly:",
    segmentKeys,
    "Expected JSON schema:",
    JSON.stringify(
      {
        record: {
          date: "YYYY-MM-DD or null",
          height: null,
          age: null,
          gender: "male | female | other | unknown | null",
          score: null,
          weight: null,
          muscle: null,
          fat: null,
          fatPercent: null,
          visceralFatLevel: null,
          bmr: null,
          recommendedCalories: null,
          sourceType: "photo_scan",
          isIncludedInCharts: true,
          notes: "optional string or null",
          segmental: Object.fromEntries(
            SEGMENT_PARTS.map((part) => [
              part.key,
              {
                muscle: null,
                fat: null,
                muscleRatio: null,
                fatRatio: null,
              },
            ]),
          ),
        },
        summary: {
          overview: "",
          keyChanges: [""],
          actionPlan: [""],
          watchouts: [""],
        },
        scanConfidence: null,
        uncertaintyNotes: [""],
      },
      null,
      2,
    ),
  ].join("\n");
}

export function parseRecordScanResult(text: string): RecordScanResult {
  const parsed = scanExtractionSchema.parse(JSON.parse(stripJsonFence(text)) as unknown);

  const summary = parsed.summary;
  const structuredSummary =
    summary.overview || summary.keyChanges.length || summary.actionPlan.length || summary.watchouts.length
      ? {
          overview: summary.overview,
          keyChanges: summary.keyChanges.filter(Boolean),
          actionPlan: summary.actionPlan.filter(Boolean),
          watchouts: summary.watchouts.filter(Boolean),
        }
      : null;

  return {
    record: parsed.record,
    structuredSummary,
    scanConfidence: parsed.scanConfidence,
    uncertaintyNotes: parsed.uncertaintyNotes.filter(Boolean),
  };
}

export function mergeScanDraftIntoRecordInput(
  current: RecordInput,
  draft: z.infer<typeof recordDraftSchema>,
  generatedNotes: string | null,
) {
  const nextSegmental = { ...current.segmental };

  for (const part of SEGMENT_PARTS) {
    const draftPart = draft.segmental?.[part.key];
    if (!draftPart) {
      continue;
    }

    nextSegmental[part.key] = {
      ...nextSegmental[part.key],
      muscle: draftPart.muscle ?? nextSegmental[part.key].muscle,
      fat: draftPart.fat ?? nextSegmental[part.key].fat,
      muscleRatio: draftPart.muscleRatio ?? nextSegmental[part.key].muscleRatio,
      fatRatio: draftPart.fatRatio ?? nextSegmental[part.key].fatRatio,
    };
  }

  return {
    ...current,
    date: draft.date || current.date,
    height: draft.height ?? current.height,
    age: draft.age ?? current.age,
    gender: draft.gender ?? current.gender,
    score: draft.score ?? current.score,
    weight: draft.weight ?? current.weight,
    muscle: draft.muscle ?? current.muscle,
    fat: draft.fat ?? current.fat,
    fatPercent: draft.fatPercent ?? current.fatPercent,
    visceralFatLevel: draft.visceralFatLevel ?? current.visceralFatLevel,
    bmr: draft.bmr ?? current.bmr,
    recommendedCalories: draft.recommendedCalories ?? current.recommendedCalories,
    sourceType: draft.sourceType ?? current.sourceType,
    isIncludedInCharts: draft.isIncludedInCharts ?? current.isIncludedInCharts,
    notes: generatedNotes ?? current.notes,
    segmental: nextSegmental,
  };
}
