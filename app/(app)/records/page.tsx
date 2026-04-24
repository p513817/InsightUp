import { RecordsWorkspace } from "@/components/workspace/records-workspace";
import { listRecords } from "@/lib/inbody/records";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function RecordsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const records = await listRecords(supabase, user.id);

  return <RecordsWorkspace initialRecords={records} mode="records" />;
}