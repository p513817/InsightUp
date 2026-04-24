import { NextResponse } from "next/server";
import { createRecord, formValuesToRecordInput, listRecords } from "@/lib/inbody/records";
import { recordFormSchema } from "@/lib/inbody/schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const records = await listRecords(supabase, user.id);
  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = recordFormSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
  }

  const record = await createRecord(supabase, user.id, formValuesToRecordInput(parsed.data));
  return NextResponse.json({ record }, { status: 201 });
}