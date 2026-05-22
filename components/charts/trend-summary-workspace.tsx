"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardList, Lightbulb, LoaderCircle, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

function getProviderLabel(provider: TrendSummaryResponse["provider"], reused: boolean, modelName?: string | null) {
  const baseLabel = provider === "gemini" ? "來源：Gemini" : reused ? "來源：今日快取摘要" : "來源：快取摘要";
  return modelName ? `${baseLabel} · ${modelName}` : baseLabel;
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
  const [summary, setSummary] = useState<string | null>(null);
  const [structuredSummary, setStructuredSummary] = useState<TrendSummaryResponse["structuredSummary"]>(null);
  const [requestDate, setRequestDate] = useState<string | null>(null);
  const [canGenerate, setCanGenerate] = useState(true);
  const [usageBadge, setUsageBadge] = useState<string | null>(null);
  const [providerLabel, setProviderLabel] = useState<string | null>(null);

  const hasSummary = useMemo(() => Boolean(summary || structuredSummary), [structuredSummary, summary]);

  function applySummaryResponse(data: TrendSummaryResponse) {
    setSummary(data.summary);
    setStructuredSummary(data.structuredSummary ?? null);
    setRequestDate(data.requestDate);
    setCanGenerate(data.canGenerate ?? true);
    setUsageBadge(`使用次數 ${data.usageCount ?? 0} / ${data.dailyLimit == null ? "不限" : data.dailyLimit}`);
    setProviderLabel(getProviderLabel(data.provider, data.reused, data.modelName));
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

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 pb-8">
      <Card className="gap-4 border-border/55 bg-card/86 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">AI trend summary</p>
            <h1 className="mt-2 font-display text-3xl leading-tight text-foreground">近期 5 筆趨勢摘要</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">讀取最新快取摘要；需要更新時再手動重新生成。</p>
          </div>
          <Button disabled={loadingSummary || generating || !canGenerate} onClick={regenerateSummary} type="button">
            {generating ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            <span>{generating ? (hasSummary ? "重新生成中..." : "生成中...") : hasSummary ? "重新生成" : "生成摘要"}</span>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border/55 pt-4">
          {requestDate ? <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-xs font-medium text-foreground">{requestDate}</span> : null}
          {usageBadge ? <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-xs font-medium text-foreground">{usageBadge}</span> : null}
          {providerLabel ? <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-xs font-medium text-foreground">{providerLabel}</span> : null}
          {refreshingSummary ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <LoaderCircle className="size-3 animate-spin" />
              更新最新摘要中
            </span>
          ) : null}
        </div>
      </Card>

      {loadingSummary ? (
        <Card className="min-h-72 items-center justify-center gap-3 text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin" />
          <p className="text-sm">讀取最新摘要中...</p>
        </Card>
      ) : !structuredSummary ? (
        <Card className="min-h-72 justify-center gap-4 border-dashed border-border/80 bg-surface/58 text-center">
          <p className="text-sm leading-6 text-muted-foreground">{summary || "目前尚無摘要內容，點擊上方按鈕即可生成最新摘要。"}</p>
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
    </div>
  );
}
