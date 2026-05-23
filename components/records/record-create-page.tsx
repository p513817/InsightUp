"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RecordFormDialog } from "@/components/records/record-form-dialog";
import type { RecordFormValues } from "@/lib/inbody/schema";
import type { InbodyRecord } from "@/lib/inbody/types";

interface RecordCreatePageProps {
  latestRecordForAutofill?: InbodyRecord | null;
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

export function RecordCreatePage({ latestRecordForAutofill = null }: RecordCreatePageProps) {
  const router = useRouter();

  function returnToRecords() {
    router.replace("/records");
  }

  async function handleSubmit(values: RecordFormValues) {
    try {
      await requestJson<{ record: InbodyRecord }>("/api/records", {
        body: JSON.stringify(values),
        method: "POST",
      });
      toast.success("已新增 InBody 紀錄");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "新增紀錄失敗");
      throw error;
    }
  }

  return (
    <RecordFormDialog
      latestRecordForAutofill={latestRecordForAutofill}
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
