import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  formValuesToRecordInput,
  getRecordById,
  recordToFormValues,
  softDeleteRecord,
  updateRecord,
} from "@/lib/inbody/records";
import { recordFormSchema } from "@/lib/inbody/schema";

type RouteContext = {
  params: Promise<{
    recordId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { recordId } = await context.params;

  const json = await request.json();

  if (typeof json?.isIncludedInCharts === "boolean" && Object.keys(json).length === 1) {
    const existing = await getRecordById(supabase, user.id, recordId);
    const nextValues = recordToFormValues({
      ...existing,
      isIncludedInCharts: json.isIncludedInCharts,
    });
    const updatedRecord = await updateRecord(supabase, user.id, recordId, formValuesToRecordInput(nextValues));
    return NextResponse.json({ record: updatedRecord });
  }

  const parsed = recordFormSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
  }

  const record = await updateRecord(supabase, user.id, recordId, formValuesToRecordInput(parsed.data));
  return NextResponse.json({ record });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { recordId } = await context.params;

  await softDeleteRecord(supabase, user.id, recordId);
  return NextResponse.json({ success: true });
}