import { z } from "zod";
import { SEGMENT_PARTS } from "@/lib/inbody/types";

const nullableNumber = z.preprocess((value) => {
  if (value === "" || value == null) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}, z.number().nullable());

const nullableText = z.preprocess((value) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}, z.string().nullable());

const segmentSchema = z.object({
  muscle: nullableNumber,
  fat: nullableNumber,
});

export const recordFormSchema = z.object({
  date: z.string().min(1, "請選擇紀錄日期。"),
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
    Object.fromEntries(SEGMENT_PARTS.map((part) => [part.key, segmentSchema])) as Record<string, typeof segmentSchema>,
  ),
}).superRefine((value, context) => {
  if (value.weight == null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["weight"],
      message: "體重是必填欄位。",
    });
  }

  if (value.muscle == null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["muscle"],
      message: "肌肉量是必填欄位。",
    });
  }

  if (value.fat == null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["fat"],
      message: "脂肪量是必填欄位。",
    });
  }

  if (value.fatPercent == null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["fatPercent"],
      message: "體脂率是必填欄位。",
    });
  }
});

export type RecordFormValues = z.infer<typeof recordFormSchema>;