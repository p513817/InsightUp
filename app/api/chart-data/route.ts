import { NextResponse } from "next/server";
import { buildChartPayload, listRecords } from "@/lib/inbody/records";
import { CHART_VIEWS, type ChartViewKey } from "@/lib/inbody/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const viewParam = requestUrl.searchParams.get("view") || "overall";
  const availableView = CHART_VIEWS.find((view) => view.key === viewParam);

  if (!availableView) {
    return NextResponse.json({ message: "Unsupported chart view" }, { status: 400 });
  }

  const records = await listRecords(supabase, user.id);
  const chart = buildChartPayload(records, availableView.key as ChartViewKey);

  return NextResponse.json({ chart });
}