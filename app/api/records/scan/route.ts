import { NextResponse } from "next/server";
import { DEFAULT_GEMINI_ROTATION_MODELS, LlmProviderError, generateText } from "@/lib/llms";
import { consumeDailyFeatureUsage, getDailyFeatureUsage, resolveMyFeatureEntitlement } from "@/lib/llms/usage";
import { MAX_UPLOAD_SIZE_BYTES, isOversizedScanUpload } from "@/lib/inbody/scan-upload";
import { buildRecordScanPrompt, parseRecordScanResult } from "@/lib/inbody/scan";
import { getTodayTaipeiDate } from "@/lib/inbody/trend-summary";
import { getServerTranslations } from "@/lib/i18n/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const FEATURE_KEY = "inbody_scan";
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
  const { t } = await getServerTranslations();

  try {
    const { supabase, user } = await getAuthenticatedContext();

    if (!user) {
      return NextResponse.json({ message: t("api.unauthorized") }, { status: 401 });
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
      message: canScan ? null : t("api.scan.dailyLimitReached"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : t("api.unexpected");
    return NextResponse.json({ message: message.slice(0, 300) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { t } = await getServerTranslations();

  try {
    const { supabase, user } = await getAuthenticatedContext();

    if (!user) {
      return NextResponse.json({ message: t("api.unauthorized") }, { status: 401 });
    }

    const requestDate = getTodayTaipeiDate();
    const entitlement = await resolveMyFeatureEntitlement(supabase, FEATURE_KEY);
    const usage = await getDailyFeatureUsage(supabase, user.id, FEATURE_KEY, requestDate);
    const usageCount = usage?.usage_count ?? 0;

    if (entitlement.dailyLimit === 0) {
      return NextResponse.json(
        {
          message: t("api.scan.notAllowed"),
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
          message: t("api.scan.dailyLimitReached"),
          requestDate,
          planCode: entitlement.planCode,
          dailyLimit: entitlement.dailyLimit,
          usageCount,
          canScan: false,
        },
        { status: 429 },
      );
    }

    if (isOversizedScanUpload(request.headers.get("content-length"))) {
      return NextResponse.json({ message: t("api.scan.fileTooLarge") }, { status: 413 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: t("api.scan.missingFile") }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ message: t("api.scan.unsupportedFile") }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json({ message: t("api.scan.fileTooLarge") }, { status: 400 });
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

    return NextResponse.json({
      draft: {
        ...parsed.record,
        isIncludedInCharts: parsed.record.isIncludedInCharts ?? true,
        sourceType: "photo_scan",
      },
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

    const message = error instanceof Error ? error.message : t("api.unexpected");
    return NextResponse.json({ message: message.slice(0, 300) }, { status: 500 });
  }
}
