"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RecordFormDialog } from "@/components/records/record-form-dialog";
import type { RecordFormValues } from "@/lib/inbody/schema";
import type { InbodyRecord } from "@/lib/inbody/types";

interface RecordEditPageProps {
  record: InbodyRecord;
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || "Request failed.");
  }

  return response.json() as Promise<T>;
}

export function RecordEditPage({ record }: RecordEditPageProps) {
  const router = useRouter();

  function returnToRecords() {
    router.replace("/records");
  }

  async function handleSubmit(values: RecordFormValues) {
    try {
      await requestJson<{ record: InbodyRecord }>(`/api/records/${record.id}`, {
        body: JSON.stringify(values),
        method: "PATCH",
      });
      toast.success("紀錄已更新。");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "更新紀錄失敗。");
      throw error;
    }
  }

  return (
    <RecordFormDialog
      initialRecord={record}
      onOpenChange={(open) => {
        if (!open) {
          returnToRecords();
        }
      }}
      onSubmit={handleSubmit}
      open
      presentation="page"
    />
  );
}
