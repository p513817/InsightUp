import { notFound } from "next/navigation";
import { RecordEditPage } from "@/components/records/record-edit-page";
import { getRecordById } from "@/lib/inbody/records";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface EditRecordPageProps {
  params: Promise<{
    recordId: string;
  }>;
}

function isNotFoundError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "PGRST116";
}

export default async function EditRecordPage({ params }: EditRecordPageProps) {
  const { recordId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  try {
    const record = await getRecordById(supabase, user.id, recordId);
    return <RecordEditPage record={record} />;
  } catch (error) {
    if (isNotFoundError(error)) {
      notFound();
    }

    throw error;
  }
}
