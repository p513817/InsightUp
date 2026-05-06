"use client";

import { useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TrendSummaryResponse {
  summary: string | null;
  generatedAt: string | null;
  modelName?: string | null;
  provider: "gemini" | "cache";
  reused: boolean;
  requestDate: string;
  usageCount?: number;
  dailyLimit?: number | null;
  planCode?: string;
  canGenerate?: boolean;
  message?: string;
}

function getProviderLabel(provider: TrendSummaryResponse["provider"], reused: boolean, modelName?: string | null) {
  const baseLabel = provider === "gemini" ? "來源：Gemini" : reused ? "來源：今日快取摘要" : "來源：快取摘要";
  return modelName ? `${baseLabel} · ${modelName}` : baseLabel;
}

export function TrendSummaryFab() {
  const [open, setOpen] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [requestDate, setRequestDate] = useState<string | null>(null);
  const [isReused, setIsReused] = useState(false);
  const [canGenerate, setCanGenerate] = useState(true);
  const [usageBadge, setUsageBadge] = useState<string | null>(null);
  const [providerLabel, setProviderLabel] = useState<string | null>(null);

  function applySummaryResponse(data: TrendSummaryResponse) {
    setSummary(data.summary);
    setRequestDate(data.requestDate);
    setIsReused(data.reused);
    setCanGenerate(data.canGenerate ?? true);
    setUsageBadge(`使用次數 ${data.usageCount ?? 0} / ${data.dailyLimit == null ? "∞" : data.dailyLimit}`);
    setProviderLabel(getProviderLabel(data.provider, data.reused, data.modelName));
  }

  async function openSummary() {
    if (loadingSummary || generating) {
      return;
    }

    setLoadingSummary(true);
    setOpen(true);

    try {
      const response = await fetch("/api/trend-summary", {
        method: "GET",
      });

      const payload = (await response.json().catch(() => null)) as TrendSummaryResponse | { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message || "無法產生摘要，請稍後再試。");
      }

      const data = payload as TrendSummaryResponse;
      applySummaryResponse(data);

      if (data.message) {
        toast.message(data.message);
      }
    } catch (error) {
      setOpen(false);
      toast.error(error instanceof Error ? error.message : "無法產生摘要，請稍後再試。");
    } finally {
      setLoadingSummary(false);
    }
  }

  async function regenerateSummary() {
    if (generating || !canGenerate) {
      return;
    }

    setGenerating(true);

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
      applySummaryResponse(data);

      if (data.message) {
        toast.message(data.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法產生摘要，請稍後再試。");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      {!open ? (
        <div className="fixed bottom-5 right-5 z-40 sm:bottom-7 sm:right-7">
          <Button
            aria-label="詢問 AI 趨勢摘要"
            className="h-12 rounded-full px-4 shadow-panel sm:h-14 sm:px-5"
            disabled={loadingSummary || generating}
            onClick={openSummary}
            type="button"
          >
            {loadingSummary ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
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
              {usageBadge ? (
                <span className="surface-soft-card rounded-full px-3 py-1 text-xs font-medium text-muted-foreground">{usageBadge}</span>
              ) : null}
              {providerLabel ? (
                <span className="surface-pill rounded-full px-3 py-1 text-xs font-medium text-foreground">{providerLabel}</span>
              ) : null}
            </div>
            <div className="surface-subtle-gradient rounded-2xl border border-border/70 px-4 py-4 text-[0.95rem] leading-8 text-foreground">
              {loadingSummary ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" />
                  讀取最新摘要中...
                </div>
              ) : (
                <p>{summary || "目前尚無摘要內容，點擊下方按鈕即可生成最新摘要。"}</p>
              )}
            </div>
            <div className="flex justify-end">
              <Button disabled={loadingSummary || generating || !canGenerate} onClick={regenerateSummary} type="button">
                {generating ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                <span>{summary ? "重新生成摘要" : "生成摘要"}</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
