import type { SupabaseClient } from "@supabase/supabase-js";

interface SummarySegmentRow {
  part_key: string;
  muscle: number | null;
  fat: number | null;
  muscle_ratio: number | null;
  fat_ratio: number | null;
}

interface SummaryRecordRow {
  recorded_at: string;
  weight: number | null;
  muscle: number | null;
  fat: number | null;
  fat_percent: number | null;
  score: number | null;
  visceral_fat_level: number | null;
  bmr: number | null;
  recommended_calories: number | null;
  inbody_segments?: SummarySegmentRow[];
}

const SEGMENT_KEY_MAP = {
  leftArm: "la",
  rightArm: "ra",
  trunk: "tr",
  leftLeg: "ll",
  rightLeg: "rl",
} as const;

const SEGMENT_ORDER = ["la", "ra", "tr", "ll", "rl"] as const;
const SEGMENT_METRIC_KEYS = ["m", "f", "mr", "fr"] as const;

export interface CleanTrendRecord {
  date: string;
  values: Record<string, number>;
  segmental: Record<string, Record<string, number>>;
}

function toTaipeiDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatOneDecimal(value: number) {
  return Number(value.toFixed(1));
}

function formatSigned(value: number) {
  return `${value > 0 ? "+" : ""}${value}`;
}

function pruneSegments(segments: SummarySegmentRow[] = []) {
  return segments.reduce<Record<string, Record<string, number>>>((acc, segment) => {
    const shortPart = SEGMENT_KEY_MAP[segment.part_key as keyof typeof SEGMENT_KEY_MAP];

    if (!shortPart) {
      return acc;
    }

    const entries: Array<[string, number | null]> = [
      ["m", segment.muscle],
      ["f", segment.fat],
      ["mr", segment.muscle_ratio],
      ["fr", segment.fat_ratio],
    ];

    const values = entries.reduce<Record<string, number>>((metricAcc, [metricKey, value]) => {
      if (typeof value !== "number" || Number.isNaN(value)) {
        return metricAcc;
      }

      metricAcc[metricKey] = formatOneDecimal(value);
      return metricAcc;
    }, {});

    if (Object.keys(values).length > 0) {
      acc[shortPart] = values;
    }

    return acc;
  }, {});
}

function pruneRecord(record: SummaryRecordRow): CleanTrendRecord {
  const entries: Array<[string, number | null]> = [
    ["w", record.weight],
    ["m", record.muscle],
    ["f", record.fat],
    ["fp", record.fat_percent],
    ["s", record.score],
    ["vf", record.visceral_fat_level],
    ["b", record.bmr],
    ["c", record.recommended_calories],
  ];

  const values = entries.reduce<Record<string, number>>((acc, [key, value]) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return acc;
    }

    acc[key] = formatOneDecimal(value);
    return acc;
  }, {});

  return {
    date: record.recorded_at,
    values,
    segmental: pruneSegments(record.inbody_segments),
  };
}

function compactRecordLine(record: CleanTrendRecord) {
  const valuePairs = Object.entries(record.values)
    .map(([key, value]) => `${key}:${value}`)
    .join(",");

  return `${record.date}|${valuePairs}`;
}

function buildDeltaText(records: CleanTrendRecord[]) {
  if (records.length < 2) {
    return "delta=insufficient";
  }

  const oldest = records[0];
  const latest = records[records.length - 1];
  const keys = ["w", "m", "f", "fp", "s", "vf"];

  const deltas = keys
    .map((key) => {
      const from = oldest.values[key];
      const to = latest.values[key];
      if (typeof from !== "number" || typeof to !== "number") {
        return null;
      }

      const diff = formatOneDecimal(to - from);
      return `${key}:${diff > 0 ? "+" : ""}${diff}`;
    })
    .filter(Boolean)
    .join(",");

  return deltas ? `delta=${deltas}` : "delta=insufficient";
}

function buildSegmentLatestText(records: CleanTrendRecord[]) {
  const latest = records[records.length - 1];

  if (!latest) {
    return "seg_latest=insufficient";
  }

  const segmentLines = SEGMENT_ORDER.map((segmentKey) => {
    const segmentValues = latest.segmental[segmentKey];

    if (!segmentValues) {
      return null;
    }

    const metrics = SEGMENT_METRIC_KEYS.map((metricKey) => {
      const value = segmentValues[metricKey];
      return typeof value === "number" ? `${metricKey}:${value}` : null;
    })
      .filter(Boolean)
      .join(",");

    if (!metrics) {
      return null;
    }

    return `${segmentKey}{${metrics}}`;
  })
    .filter(Boolean)
    .join("|");

  return segmentLines ? `seg_latest=${segmentLines}` : "seg_latest=insufficient";
}

function buildSegmentDeltaText(records: CleanTrendRecord[]) {
  if (records.length < 2) {
    return "seg_delta=insufficient";
  }

  const oldest = records[0];
  const latest = records[records.length - 1];

  const deltas = SEGMENT_ORDER.flatMap((segmentKey) => {
    const fromSegment = oldest.segmental[segmentKey];
    const toSegment = latest.segmental[segmentKey];

    if (!fromSegment || !toSegment) {
      return [];
    }

    return SEGMENT_METRIC_KEYS.map((metricKey) => {
      const from = fromSegment[metricKey];
      const to = toSegment[metricKey];

      if (typeof from !== "number" || typeof to !== "number") {
        return null;
      }

      const diff = formatOneDecimal(to - from);
      return `${segmentKey}.${metricKey}:${formatSigned(diff)}`;
    }).filter(Boolean) as string[];
  });

  return deltas.length > 0 ? `seg_delta=${deltas.join(",")}` : "seg_delta=insufficient";
}

function hasTrendData(record: CleanTrendRecord) {
  if (Object.keys(record.values).length > 0) {
    return true;
  }

  return Object.values(record.segmental).some((segmentValues) => Object.keys(segmentValues).length > 0);
}

export function buildGeminiPrompt(records: CleanTrendRecord[]) {
  const compactRows = records.map((record) => compactRecordLine(record)).join("\n");
  const deltaText = buildDeltaText(records);
  const segmentLatestText = buildSegmentLatestText(records);
  const segmentDeltaText = buildSegmentDeltaText(records);

  return [
    "你是專業體態與健身教練。",
    "任務：依據最近 5 筆 InBody 趨勢資料，輸出繁體中文約 100 字摘要與建議。",
    "限制：僅能依資料推論，不可捏造疾病診斷，不可提及你看不到的資訊。",
    "格式：單段落，先總結趨勢，再給 2-3 個可執行建議。",
    "欄位縮寫：w體重(kg), m骨骼肌(kg), f脂肪(kg), fp體脂率(%), s分數, vf內臟脂肪, b基代, c建議熱量。",
    "部位縮寫：la左臂, ra右臂, tr軀幹, ll左腿, rl右腿；部位欄位：m肌肉kg, f脂肪kg, mr肌肉比%, fr脂肪比%。",
    `資料:\n${compactRows}\n${deltaText}\n${segmentLatestText}\n${segmentDeltaText}`,
  ].join("\n");
}

export async function listRecentRecordsForSummary(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("inbody_records")
    .select("recorded_at,weight,muscle,fat,fat_percent,score,visceral_fat_level,bmr,recommended_calories,inbody_segments(part_key,muscle,fat,muscle_ratio,fat_ratio)")
    .eq("user_id", userId)
    .eq("is_included_in_charts", true)
    .is("deleted_at", null)
    .order("recorded_at", { ascending: false })
    .limit(5);

  if (error) {
    throw error;
  }

  const rows = ((data as SummaryRecordRow[] | null) || []).slice().reverse();
  return rows.map((row) => pruneRecord(row)).filter((record) => hasTrendData(record));
}

export function getTodayTaipeiDate() {
  return toTaipeiDate();
}
