"use client";

import { useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TrendSummaryResponse {
  summary: string;
  generatedAt: string;
  modelName?: string | null;
  provider: "gemini" | "cache";
  reused: boolean;
  requestDate: string;
  message?: string;
}

function getProviderLabel(provider: TrendSummaryResponse["provider"], reused: boolean, modelName?: string | null) {
  const baseLabel = provider === "gemini" ? "來源：Gemini" : reused ? "來源：今日快取摘要" : "來源：快取摘要";
  return modelName ? `${baseLabel} · ${modelName}` : baseLabel;
}

export function TrendSummaryFab() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [requestDate, setRequestDate] = useState<string | null>(null);
  const [isReused, setIsReused] = useState(false);
  const [providerLabel, setProviderLabel] = useState<string | null>(null);

  async function fetchSummary() {
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/trend-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const payload = (await response.json().catch(() => null)) as TrendSummaryResponse | { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message || "無法產生摘要，請稍後再試。");
      }

      const data = payload as TrendSummaryResponse;
      setSummary(data.summary);
      setRequestDate(data.requestDate);
      setIsReused(data.reused);
      setProviderLabel(getProviderLabel(data.provider, data.reused, data.modelName));
      setOpen(true);

      if (data.message) {
        toast.message(data.message);
      } else if (data.reused) {
        toast.message("今天已使用過一次，顯示今日摘要。");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法產生摘要，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!open ? (
        <div className="fixed bottom-5 right-5 z-40 sm:bottom-7 sm:right-7">
          <Button
            aria-label="詢問 AI 趨勢摘要"
            className="h-12 rounded-full px-4 shadow-panel sm:h-14 sm:px-5"
            disabled={loading}
            onClick={fetchSummary}
            type="button"
          >
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            <span className="font-medium">AI 趨勢建議</span>
          </Button>
        </div>
      ) : null}

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="surface-glass-panel max-w-xl border border-border/65 bg-card/88">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-[1.65rem] leading-tight">近期 5 筆趨勢摘要</DialogTitle>
            <DialogDescription>
              {requestDate || ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 pb-6 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="surface-soft-card rounded-full px-3 py-1 text-xs font-medium text-muted-foreground">使用次數 1 / 1</span>
              {providerLabel ? (
                <span className="surface-pill rounded-full px-3 py-1 text-xs font-medium text-foreground">{providerLabel}</span>
              ) : null}
            </div>
            <p className="surface-subtle-gradient rounded-2xl border border-border/70 px-4 py-4 text-[0.95rem] leading-8 text-foreground">
              {summary || "目前尚無摘要內容。"}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
