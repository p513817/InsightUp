import { RecordCreatePage } from "@/components/records/record-create-page";
import { listRecords } from "@/lib/inbody/records";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function NewRecordPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const records = await listRecords(supabase, user.id);
  const latestRecord = records.at(-1) ?? null;

  return <RecordCreatePage latestRecordForAutofill={latestRecord} />;
}
