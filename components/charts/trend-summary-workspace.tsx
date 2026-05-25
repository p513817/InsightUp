"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardList, Lightbulb, LoaderCircle, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatsScrollbarRow } from "@/components/ui/stats-scrollbar-row";

interface TrendSummaryResponse {
  summary: string | null;
  structuredSummary?: {
    overview: string;
    keyChanges: string[];
    actionPlan: string[];
    watchouts: string[];
  } | null;
  generatedAt: string | null;
  modelName?: string | null;
  provider: "gemini" | "cache";
  reused: boolean;
  requestDate: string;
  usageCount?: number;
  dailyLimit?: number | null;
  canGenerate?: boolean;
  message?: string;
}

type SectionKey = "overview" | "keyChanges" | "actionPlan" | "watchouts";

const SECTIONS: Array<{ key: SectionKey; title: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "overview", title: "趨勢總結", icon: TrendingUp },
  { key: "keyChanges", title: "重點變化", icon: ClipboardList },
  { key: "actionPlan", title: "行動建議", icon: Lightbulb },
  { key: "watchouts", title: "注意事項", icon: AlertTriangle },
];

function getSourceLabel(provider: TrendSummaryResponse["provider"], reused: boolean) {
  if (provider === "gemini") {
    return "Gemini";
  }

  return reused ? "今日快取摘要" : "快取摘要";
}

function getSectionContent(data: TrendSummaryResponse["structuredSummary"], key: SectionKey) {
  if (!data) {
    return null;
  }

  if (key === "overview") {
    return data.overview || null;
  }

  return data[key]?.length ? data[key] : null;
}

export function TrendSummaryWorkspace() {
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [refreshingSummary, setRefreshingSummary] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [structuredSummary, setStructuredSummary] = useState<TrendSummaryResponse["structuredSummary"]>(null);
  const [requestDate, setRequestDate] = useState<string | null>(null);
  const [canGenerate, setCanGenerate] = useState(true);
  const [usageBadge, setUsageBadge] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [modelLabel, setModelLabel] = useState<string | null>(null);

  const hasSummary = useMemo(() => Boolean(summary || structuredSummary), [structuredSummary, summary]);

  function applySummaryResponse(data: TrendSummaryResponse) {
    setSummary(data.summary);
    setStructuredSummary(data.structuredSummary ?? null);
    setRequestDate(data.requestDate);
    setCanGenerate(data.canGenerate ?? true);
    setUsageBadge(`使用次數 ${data.usageCount ?? 0} / ${data.dailyLimit == null ? "不限" : data.dailyLimit}`);
    setSourceLabel(getSourceLabel(data.provider, data.reused));
    setModelLabel(data.modelName || null);
  }

  async function fetchLatestSummary({ quiet = false } = {}) {
    setLoadingSummary(!quiet);
    setRefreshingSummary(quiet);

    try {
      const response = await fetch("/api/trend-summary", { method: "GET" });
      const payload = (await response.json().catch(() => null)) as TrendSummaryResponse | { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message || "無法讀取摘要，請稍後再試。");
      }

      const data = payload as TrendSummaryResponse;
      applySummaryResponse(data);

      if (data.message && !quiet) {
        toast.message(data.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法讀取摘要，請稍後再試。");
    } finally {
      setLoadingSummary(false);
      setRefreshingSummary(false);
    }
  }

  async function regenerateSummary() {
    if (generating || !canGenerate) {
      return;
    }

    setConfirmOpen(false);
    setGenerating(true);

    try {
      const response = await fetch("/api/trend-summary", {
        headers: { "Content-Type": "application/json" },
        method: "POST",
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

  useEffect(() => {
    void fetchLatestSummary();
  }, []);

  useEffect(() => {
    if (confirmOpen) {
      document.body.classList.add("dialog-overlay-no-blur");
    } else {
      document.body.classList.remove("dialog-overlay-no-blur");
    }

    return () => {
      document.body.classList.remove("dialog-overlay-no-blur");
    };
  }, [confirmOpen]);

  function handleGenerateClick() {
    if (loadingSummary || generating || !canGenerate) {
      return;
    }

    if (hasSummary) {
      setConfirmOpen(true);
      return;
    }

    void regenerateSummary();
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 pb-24 sm:pb-28">
      <section className="relative p-1 sm:p-2">
        <div className="relative z-10 mx-auto max-w-4xl space-y-3">
          <StatsScrollbarRow
            className="stats-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-[1fr_1fr_1fr_1.1fr]"
          >
            <div className="surface-glass-card min-w-[8.75rem] shrink-0 rounded-[0.875rem] px-3 py-3 sm:min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">摘要日期</p>
              <p className="mt-1 break-words font-display text-[1.2rem] leading-tight text-foreground sm:text-[1.35rem]">{requestDate || "尚未生成"}</p>
            </div>
            <div className="surface-soft-card min-w-[8.75rem] shrink-0 rounded-[0.875rem] px-3 py-3 sm:min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">今日額度</p>
              <p className="mt-1 break-words font-display text-[1.2rem] leading-tight text-foreground sm:text-[1.35rem]">{usageBadge || "讀取中"}</p>
            </div>
            <div className="surface-soft-card min-w-[8.75rem] shrink-0 rounded-[0.875rem] px-3 py-3 sm:min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">摘要來源</p>
              <p className="mt-1 break-words font-display text-[1.2rem] leading-tight text-foreground sm:text-[1.35rem]">{sourceLabel || "尚無資料"}</p>
            </div>
            <div className="surface-soft-card min-w-[8.75rem] shrink-0 rounded-[0.875rem] px-3 py-3 sm:min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">模型</p>
              <p className="mt-1 break-words font-display text-[1.2rem] leading-tight text-foreground sm:text-[1.35rem]">{modelLabel || "尚無資料"}</p>
            </div>
          </StatsScrollbarRow>

          {refreshingSummary ? (
            <div className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
              <LoaderCircle className="size-3 animate-spin" />
              更新最新摘要中
            </div>
          ) : null}
        </div>
      </section>

      {loadingSummary ? (
        <Card className="min-h-72 items-center justify-center gap-3 text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin" />
          <p className="text-sm">讀取最新摘要中...</p>
        </Card>
      ) : !structuredSummary ? (
        <Card className="surface-state-panel min-h-72 items-center justify-center gap-2 p-8 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-primary/7 text-primary">
            <Sparkles className="size-5" />
          </span>
          <p className="font-display text-[1.7rem] text-foreground sm:text-2xl">{summary ? "近期 5 筆趨勢摘要" : "生成第一筆 AI 摘要"}</p>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">{summary || "目前尚無摘要內容。點擊右下角按鈕，根據最新納入圖表的 InBody 紀錄生成第一筆 AI 摘要。"}</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {SECTIONS.map((section) => {
            const content = getSectionContent(structuredSummary, section.key);
            const Icon = section.icon;

            if (!content) {
              return null;
            }

            return (
              <Card className="gap-3 border-border/55 bg-card/90 p-5" key={section.key}>
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-full bg-primary/7 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <h2 className="font-display text-xl text-foreground">{section.title}</h2>
                </div>

                {Array.isArray(content) ? (
                  <ul className="space-y-2 pl-1">
                    {content.map((item, index) => (
                      <li className="flex gap-2 text-sm leading-6 text-foreground" key={`${section.key}-${index}`}>
                        <span className="mt-[0.45rem] inline-block size-1.5 shrink-0 rounded-full bg-foreground/55" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-6 text-foreground">{content}</p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <div className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-40 sm:inset-x-7 sm:bottom-7">
        <div className="mx-auto flex w-full max-w-4xl justify-end">
          <Button
            aria-label={hasSummary ? "重新生成 AI 趨勢摘要" : "生成 AI 趨勢摘要"}
            className={`pointer-events-auto relative size-12 overflow-hidden rounded-full p-0 shadow-[0_12px_28px_rgb(23_52_93/0.20)] transition-[box-shadow,transform] duration-200 hover:shadow-[0_16px_34px_rgb(23_52_93/0.24)] active:scale-[0.96] ${
              !loadingSummary && !generating && canGenerate ? "ai-generate-pulse" : ""
            }`}
            disabled={loadingSummary || generating || !canGenerate}
            onClick={handleGenerateClick}
            title={hasSummary ? "重新生成 AI 趨勢摘要" : "生成 AI 趨勢摘要"}
            type="button"
          >
            {generating ? <LoaderCircle className="size-6 animate-spin" /> : <Sparkles className="size-6" />}
          </Button>
        </div>
      </div>

      <Dialog onOpenChange={setConfirmOpen} open={confirmOpen}>
        <DialogContent className="max-w-md" showCloseButton={false}>
          <DialogHeader className="border-b-0 pb-3">
            <DialogTitle>重新生成 AI 摘要？</DialogTitle>
            <DialogDescription>
              這會使用今日額度產生新的趨勢摘要，並取代目前顯示的最新摘要。
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col-reverse gap-3 px-6 pb-6 pt-1 sm:flex-row sm:justify-end">
            <Button className="h-12 sm:min-w-24" disabled={generating} onClick={() => setConfirmOpen(false)} type="button" variant="outline">
              取消
            </Button>
            <Button className="h-12 sm:min-w-24" disabled={generating || !canGenerate} onClick={() => void regenerateSummary()} type="button">
              {generating ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              <span>重新生成</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
