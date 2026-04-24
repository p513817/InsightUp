import { z } from "zod";
import { NextResponse } from "next/server";
import { MissingDashboardPreferencesTableError, upsertDashboardMetricOrder } from "@/lib/dashboard-preferences";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const dashboardPreferenceSchema = z.object({
  metricOrder: z.array(z.string().min(1)).max(24),
});

export async function PATCH(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = dashboardPreferenceSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
  }

  try {
    const metricOrder = await upsertDashboardMetricOrder(supabase, user.id, parsed.data.metricOrder);
    return NextResponse.json({ metricOrder });
  } catch (error) {
    if (error instanceof MissingDashboardPreferencesTableError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }

    throw error;
  }
}