import { z } from "zod";
import { SEGMENT_PARTS } from "@/lib/inbody/types";

export const nullableNumber = z.preprocess((value) => {
  if (value === "" || value == null) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}, z.number().nullable());

export const nullableText = z.preprocess((value) => {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  return text.length ? text : null;
}, z.string().nullable());

export const segmentFormSchema = z.object({
  muscle: nullableNumber,
  fat: nullableNumber,
  muscleRatio: nullableNumber,
  fatRatio: nullableNumber,
});

export const recordDraftSchema = z.object({
  date: z.string().nullable().optional(),
  height: nullableNumber.optional(),
  age: nullableNumber.optional(),
  gender: z.enum(["male", "female", "other", "unknown"]).nullable().optional(),
  score: nullableNumber.optional(),
  weight: nullableNumber.optional(),
  muscle: nullableNumber.optional(),
  fat: nullableNumber.optional(),
  fatPercent: nullableNumber.optional(),
  visceralFatLevel: nullableNumber.optional(),
  bmr: nullableNumber.optional(),
  recommendedCalories: nullableNumber.optional(),
  sourceType: z.enum(["manual", "photo_scan"]).nullable().optional(),
  isIncludedInCharts: z.boolean().nullable().optional(),
  notes: nullableText.optional(),
  segmental: z
    .object(
      Object.fromEntries(SEGMENT_PARTS.map((part) => [part.key, segmentFormSchema.partial().optional()])) as Record<
        string,
        z.ZodTypeAny
      >,
    )
    .partial()
    .optional(),
});

export const recordFormSchema = z
  .object({
    date: z.string().min(1, "請填寫日期。"),
    height: nullableNumber,
    age: nullableNumber,
    gender: z.enum(["male", "female", "other", "unknown"]),
    score: nullableNumber,
    weight: nullableNumber,
    muscle: nullableNumber,
    fat: nullableNumber,
    fatPercent: nullableNumber,
    visceralFatLevel: nullableNumber,
    bmr: nullableNumber,
    recommendedCalories: nullableNumber,
    sourceType: z.enum(["manual", "photo_scan"]),
    isIncludedInCharts: z.boolean(),
    notes: nullableText,
    segmental: z.object(
      Object.fromEntries(SEGMENT_PARTS.map((part) => [part.key, segmentFormSchema])) as Record<
        string,
        typeof segmentFormSchema
      >,
    ),
  })
  .superRefine((value, context) => {
    if (value.weight == null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weight"],
        message: "請填寫體重。",
      });
    }

    if (value.muscle == null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["muscle"],
        message: "請填寫肌肉量。",
      });
    }

    if (value.fat == null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fat"],
        message: "請填寫脂肪量。",
      });
    }

    if (value.fatPercent == null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fatPercent"],
        message: "請填寫體脂率。",
      });
    }
  });

export type RecordDraftValues = z.output<typeof recordDraftSchema>;
export type RecordDraftInputValues = z.input<typeof recordDraftSchema>;
export type RecordFormValues = z.output<typeof recordFormSchema>;
export type RecordFormInputValues = z.input<typeof recordFormSchema>;
