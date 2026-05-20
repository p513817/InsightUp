import { NextResponse } from "next/server";
import { DEFAULT_GEMINI_ROTATION_MODELS, LlmProviderError, generateText, toLegacySummaryText } from "@/lib/llms";
import { consumeDailyFeatureUsage, getDailyFeatureUsage, resolveMyFeatureEntitlement } from "@/lib/llms/usage";
import { buildRecordScanPrompt, parseRecordScanResult } from "@/lib/inbody/scan";
import { getTodayTaipeiDate } from "@/lib/inbody/trend-summary";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const FEATURE_KEY = "inbody_scan";
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

async function getAuthenticatedContext() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

function mapLlmErrorStatus(error: LlmProviderError) {
  if (error.code === "authentication") return 401;
  if (error.code === "permission_denied") return 403;
  if (error.code === "invalid_request") return 400;
  if (error.code === "not_found") return 404;
  if (error.code === "quota") return 429;
  if (error.code === "timeout") return 504;
  if (error.code === "missing_key") return 500;
  if (error.code === "unavailable") return 503;
  return 502;
}

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedContext();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const requestDate = getTodayTaipeiDate();
    const entitlement = await resolveMyFeatureEntitlement(supabase, FEATURE_KEY);
    const usage = await getDailyFeatureUsage(supabase, user.id, FEATURE_KEY, requestDate);
    const usageCount = usage?.usage_count ?? 0;
    const canScan = entitlement.dailyLimit == null || usageCount < entitlement.dailyLimit;

    return NextResponse.json({
      requestDate,
      planCode: entitlement.planCode,
      dailyLimit: entitlement.dailyLimit,
      usageCount,
      canScan,
      message: canScan ? null : "今日 AI Scan 次數已達上限，請明天再試。",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ message: message.slice(0, 300) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedContext();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const requestDate = getTodayTaipeiDate();
    const entitlement = await resolveMyFeatureEntitlement(supabase, FEATURE_KEY);
    const usage = await getDailyFeatureUsage(supabase, user.id, FEATURE_KEY, requestDate);
    const usageCount = usage?.usage_count ?? 0;

    if (entitlement.dailyLimit === 0) {
      return NextResponse.json(
        {
          message: "你目前的方案無法使用 AI Scan。",
          requestDate,
          planCode: entitlement.planCode,
          dailyLimit: entitlement.dailyLimit,
          usageCount,
          canScan: false,
        },
        { status: 403 },
      );
    }

    if (entitlement.dailyLimit != null && usageCount >= entitlement.dailyLimit) {
      return NextResponse.json(
        {
          message: "今日 AI Scan 次數已達上限，請明天再試。",
          requestDate,
          planCode: entitlement.planCode,
          dailyLimit: entitlement.dailyLimit,
          usageCount,
          canScan: false,
        },
        { status: 429 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "缺少上傳檔案。" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ message: "僅支援 JPG、PNG、WEBP 或 PDF 檔案。" }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json({ message: "檔案大小必須介於 1 byte 到 10 MB 之間。" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const prompt = buildRecordScanPrompt();
    const llmResult = await generateText(prompt, [...DEFAULT_GEMINI_ROTATION_MODELS], {
      mimeType: file.type,
      data: buffer.toString("base64"),
    });
    const parsed = parseRecordScanResult(llmResult.text);
    const nextUsageCount = usageCount + 1;

    await consumeDailyFeatureUsage(supabase, user.id, FEATURE_KEY, requestDate, nextUsageCount);

    if (parsed.structuredSummary) {
      const { data: existingSummary } = await supabase
        .from("llm_trend_daily_summaries")
        .select("usage_count")
        .eq("user_id", user.id)
        .eq("feature_key", "trend_summary")
        .eq("request_date", requestDate)
        .maybeSingle();

      const { error: upsertError } = await supabase.from("llm_trend_daily_summaries").upsert(
        {
          user_id: user.id,
          feature_key: "trend_summary",
          request_date: requestDate,
          summary_text: JSON.stringify(parsed.structuredSummary),
          model_name: llmResult.model,
          source_record_count: 1,
          usage_count: existingSummary?.usage_count ?? 0,
          last_generated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,feature_key,request_date" },
      );

      if (upsertError) {
        throw upsertError;
      }
    }

    return NextResponse.json({
      draft: {
        ...parsed.record,
        isIncludedInCharts: parsed.record.isIncludedInCharts ?? true,
        sourceType: "photo_scan",
      },
      structuredSummary: parsed.structuredSummary,
      summary: parsed.structuredSummary ? toLegacySummaryText(parsed.structuredSummary) : null,
      uncertaintyNotes: parsed.uncertaintyNotes,
      scanConfidence: parsed.scanConfidence,
      modelName: llmResult.model,
      requestDate,
      planCode: entitlement.planCode,
      dailyLimit: entitlement.dailyLimit,
      usageCount: nextUsageCount,
      canScan: entitlement.dailyLimit == null || nextUsageCount < entitlement.dailyLimit,
    });
  } catch (error) {
    if (error instanceof LlmProviderError) {
      return NextResponse.json(
        {
          message: error.message.slice(0, 300),
          code: error.code,
          modelName: error.model,
        },
        { status: mapLlmErrorStatus(error) },
      );
    }

    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ message: message.slice(0, 300) }, { status: 500 });
  }
}
