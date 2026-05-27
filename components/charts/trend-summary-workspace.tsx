"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { AlertTriangle, ClipboardList, Lightbulb, LoaderCircle, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatsScrollbarRow } from "@/components/ui/stats-scrollbar-row";
import { useLocale, useTranslations } from "@/components/i18n-provider";
import { formatCompactDate } from "@/lib/presentation";

interface TrendSummaryResponse {
  summary: string | null;
  structuredSummary?: {
    overview: string;
    keyChanges: string[] | string;
    actionPlan: string[] | string;
    watchouts: string[] | string;
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

export function TrendSummaryWorkspace() {
  const t = useTranslations();
  const locale = useLocale();
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
    setUsageBadge(`${t("summary.usage.label")} ${data.usageCount ?? 0} / ${data.dailyLimit == null ? t("summary.usage.unlimited") : data.dailyLimit}`);
    setSourceLabel(
      data.provider === "gemini"
        ? t("summary.source.gemini")
        : data.reused
          ? t("summary.source.cacheReused")
          : t("summary.source.cache"),
    );
    setModelLabel(data.modelName || null);
  }

  async function fetchLatestSummary() {
    setLoadingSummary(true);
    setRefreshingSummary(true);

    try {
      const response = await fetch("/api/trend-summary", { method: "GET" });
      const payload = (await response.json().catch(() => null)) as TrendSummaryResponse | { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message || t("summary.errors.fetchFailed"));
      }

      const data = payload as TrendSummaryResponse;
      applySummaryResponse(data);

      if (data.message) {
        toast.message(data.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("summary.errors.fetchFailed"));
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
        throw new Error(payload?.message || t("summary.errors.generateFailed"));
      }

      const data = payload as TrendSummaryResponse;
      applySummaryResponse(data);

      if (data.message) {
        toast.message(data.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("summary.errors.generateFailed"));
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    void fetchLatestSummary();
  }, []);

  const sections: Array<{ key: SectionKey; title: string; icon: ComponentType<{ className?: string }> }> = [
    { key: "overview", title: t("summary.sections.overview"), icon: TrendingUp },
    { key: "keyChanges", title: t("summary.sections.keyChanges"), icon: ClipboardList },
    { key: "actionPlan", title: t("summary.sections.actionPlan"), icon: Lightbulb },
    { key: "watchouts", title: t("summary.sections.watchouts"), icon: AlertTriangle },
  ];

  function renderContent(key: SectionKey) {
    if (!structuredSummary) return null;
    if (key === "overview") return structuredSummary.overview;
    if (key === "keyChanges") return structuredSummary.keyChanges;
    if (key === "actionPlan") return structuredSummary.actionPlan;
    return structuredSummary.watchouts;
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 pb-24 sm:pb-28">
      <section className="relative p-1 sm:p-2">
        <div className="relative z-10 mx-auto max-w-4xl space-y-3">
          <StatsScrollbarRow className="stats-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-[1fr_1fr_1fr_1.1fr]">
            <div className="surface-glass-card min-w-[8.75rem] shrink-0 rounded-[0.875rem] px-3 py-3 sm:min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{t("summary.usage.date")}</p>
              <p className="mt-1 break-words font-display text-[1.2rem] leading-tight text-foreground sm:text-[1.35rem]">{requestDate ? formatCompactDate(requestDate, locale) : t("summary.errors.noContent")}</p>
            </div>
            <div className="surface-soft-card min-w-[8.75rem] shrink-0 rounded-[0.875rem] px-3 py-3 sm:min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{t("summary.usage.limit")}</p>
              <p className="mt-1 break-words font-display text-[1.2rem] leading-tight text-foreground sm:text-[1.35rem]">{usageBadge || t("common.loading")}</p>
            </div>
            <div className="surface-soft-card min-w-[8.75rem] shrink-0 rounded-[0.875rem] px-3 py-3 sm:min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{t("summary.usage.source")}</p>
              <p className="mt-1 break-words font-display text-[1.2rem] leading-tight text-foreground sm:text-[1.35rem]">{sourceLabel || t("common.notAvailable")}</p>
            </div>
            <div className="surface-soft-card min-w-[8.75rem] shrink-0 rounded-[0.875rem] px-3 py-3 sm:min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{t("summary.usage.model")}</p>
              <p className="mt-1 break-words font-display text-[1.2rem] leading-tight text-foreground sm:text-[1.35rem]">{modelLabel || t("common.notAvailable")}</p>
            </div>
          </StatsScrollbarRow>

          {refreshingSummary ? (
            <div className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
              <LoaderCircle className="size-3 animate-spin" />
              {t("summary.loading.refreshing")}
            </div>
          ) : null}
        </div>
      </section>

      {loadingSummary ? (
        <Card className="min-h-72 items-center justify-center gap-3 text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin" />
          <p className="text-sm">{t("summary.loading.fetching")}</p>
        </Card>
      ) : !structuredSummary ? (
        <Card className="surface-state-panel min-h-72 items-center justify-center gap-2 p-8 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-primary/7 text-primary">
            <Sparkles className="size-5" />
          </span>
          <p className="font-display text-[1.7rem] text-foreground sm:text-2xl">{summary ? t("summary.loading.emptyRecentTitle") : t("summary.loading.emptyTitle")}</p>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">{summary || t("summary.loading.emptyBody")}</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {sections.map((section) => {
            const content = renderContent(section.key);
            const Icon = section.icon;

            if (!content) return null;

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
            aria-label={hasSummary ? t("summary.loading.openWithSummary") : t("summary.loading.open")}
            className={`pointer-events-auto relative size-12 overflow-hidden rounded-full p-0 shadow-[0_12px_28px_rgb(23_52_93/0.20)] transition-[box-shadow,transform] duration-200 hover:shadow-[0_16px_34px_rgb(23_52_93/0.24)] active:scale-[0.96] ${
              !loadingSummary && !generating && canGenerate ? "ai-generate-pulse" : ""
            }`}
            disabled={loadingSummary || generating || !canGenerate}
            onClick={hasSummary ? () => setConfirmOpen(true) : () => void regenerateSummary()}
            title={hasSummary ? t("summary.loading.openWithSummary") : t("summary.loading.open")}
            type="button"
          >
            {generating ? <LoaderCircle className="size-6 animate-spin" /> : <Sparkles className="size-6" />}
          </Button>
        </div>
      </div>

      <Dialog onOpenChange={setConfirmOpen} open={confirmOpen}>
        <DialogContent className="max-w-md" showCloseButton={false}>
          <DialogHeader className="border-b-0 pb-3">
            <DialogTitle>{t("summary.loading.regenerateConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("summary.loading.regenerateConfirmBody")}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col-reverse gap-3 px-6 pb-6 pt-1 sm:flex-row sm:justify-end">
            <Button className="h-12 sm:min-w-24" disabled={generating} onClick={() => setConfirmOpen(false)} type="button" variant="outline">
              {t("common.cancel")}
            </Button>
            <Button className="h-12 sm:min-w-24" disabled={generating || !canGenerate} onClick={() => void regenerateSummary()} type="button">
              {generating ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              <span>{t("summary.loading.regenerate")}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
