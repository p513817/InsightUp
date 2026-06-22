"use client";

import { useMemo, useState, type ComponentType } from "react";
import { AlertTriangle, ClipboardList, Lightbulb, LoaderCircle, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CompactInfoCard } from "@/components/ui/compact-info-card";
import { FAB_BASE_CLASS, FAB_PRIMARY_TONE_CLASS } from "@/components/ui/floating-action-styles";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatsScrollbarRow } from "@/components/ui/stats-scrollbar-row";
import { useLocale, useTranslations } from "@/components/i18n-provider";
import { formatCompactDate } from "@/lib/presentation";

export interface TrendSummaryResponse {
  summary: string | null;
  structuredSummary?: {
    overview: string;
    keyChanges: string[] | string;
    actionPlan: string[] | string;
    watchouts: string[] | string;
  } | null;
  generatedAt: string | null;
  modelName?: string | null;
  planCode?: string | null;
  provider: "gemini" | "cache";
  reused: boolean;
  requestDate: string;
  usageCount?: number;
  dailyLimit?: number | null;
  canGenerate?: boolean;
  message?: string;
}

type SectionKey = "overview" | "keyChanges" | "actionPlan" | "watchouts";

interface TrendSummaryWorkspaceProps {
  initialSummary?: TrendSummaryResponse | null;
}

function buildUsageQuota(t: ReturnType<typeof useTranslations>, data: TrendSummaryResponse) {
  return `${data.usageCount ?? 0}/${data.dailyLimit == null ? t("summary.usage.unlimited") : data.dailyLimit}`;
}

function buildSourceLabel(t: ReturnType<typeof useTranslations>, data: TrendSummaryResponse) {
  if (data.provider === "gemini") {
    return t("summary.source.gemini");
  }

  return data.reused ? t("summary.source.cacheReused") : t("summary.source.cache");
}

function formatModelShortName(modelName: string | null) {
  if (!modelName) {
    return null;
  }

  return modelName
    .replace(/^gemini-/i, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function TrendSummaryWorkspace({ initialSummary = null }: TrendSummaryWorkspaceProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [generating, setGenerating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(initialSummary?.summary ?? null);
  const [structuredSummary, setStructuredSummary] = useState<TrendSummaryResponse["structuredSummary"]>(initialSummary?.structuredSummary ?? null);
  const [requestDate, setRequestDate] = useState<string | null>(initialSummary?.requestDate ?? null);
  const [canGenerate, setCanGenerate] = useState(initialSummary?.canGenerate ?? true);
  const [usageQuota, setUsageQuota] = useState<string | null>(initialSummary ? buildUsageQuota(t, initialSummary) : null);
  const [modelLabel, setModelLabel] = useState<string | null>(initialSummary?.modelName ?? null);
  const [sourceLabel, setSourceLabel] = useState<string | null>(initialSummary ? buildSourceLabel(t, initialSummary) : null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const hasSummary = useMemo(() => Boolean(summary || structuredSummary), [structuredSummary, summary]);

  function applySummaryResponse(data: TrendSummaryResponse) {
    setSummary(data.summary);
    setStructuredSummary(data.structuredSummary ?? null);
    setRequestDate(data.requestDate);
    setCanGenerate(data.canGenerate ?? true);
    setUsageQuota(buildUsageQuota(t, data));
    setModelLabel(data.modelName || null);
    setSourceLabel(buildSourceLabel(t, data));
  }

  async function regenerateSummary() {
    if (generating || !canGenerate) {
      return;
    }

    setConfirmOpen(false);
    setGenerating(true);
    setSummaryError(null);

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
      const message = error instanceof Error ? error.message : t("summary.errors.generateFailed");
      setSummaryError(message);
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }

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
          <StatsScrollbarRow className="grid grid-cols-3 gap-1.5">
            <CompactInfoCard
              label={t("summary.usage.date")}
              minWidthClassName="min-w-0"
              value={requestDate ? formatCompactDate(requestDate, locale) : t("summary.errors.noContent")}
              valueClassName="break-words leading-tight"
              variant="glass"
            />
            <CompactInfoCard
              label={t("summary.usage.limit")}
              minWidthClassName="min-w-0"
              value={usageQuota || t("common.loading")}
              valueClassName="break-words leading-tight"
            />
            <CompactInfoCard
              className={modelLabel ? "cursor-pointer transition hover:border-primary/35 active:scale-[0.99]" : undefined}
              label={t("summary.usage.model")}
              minWidthClassName="min-w-0"
              onClick={modelLabel ? () => setModelDialogOpen(true) : undefined}
              role={modelLabel ? "button" : undefined}
              tabIndex={modelLabel ? 0 : undefined}
              value={formatModelShortName(modelLabel) || t("common.notAvailable")}
              valueClassName="truncate leading-tight"
              onKeyDown={
                modelLabel
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setModelDialogOpen(true);
                      }
                    }
                  : undefined
              }
            />
          </StatsScrollbarRow>

          {sourceLabel ? <p className="px-1 text-xs leading-5 text-muted-foreground">{sourceLabel}</p> : null}
        </div>
      </section>

      {summaryError ? (
        <Card className="border-destructive/25 bg-destructive/7 p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-foreground">{t("summary.errors.generateFailed")}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{summaryError}</p>
            </div>
          </div>
        </Card>
      ) : null}

      {!structuredSummary ? (
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

      <div className="pointer-events-none fixed inset-x-5 bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] z-40 sm:inset-x-7 sm:bottom-7">
        <div className="mx-auto flex w-full max-w-4xl justify-end">
          <Button
            aria-label={hasSummary ? t("summary.loading.openWithSummary") : t("summary.loading.open")}
            className={`pointer-events-auto relative ${FAB_BASE_CLASS} ${FAB_PRIMARY_TONE_CLASS} sm:size-[3.75rem] ${
              !generating && canGenerate ? "ai-generate-pulse" : ""
            }`}
            disabled={generating || !canGenerate}
            onClick={hasSummary ? () => setConfirmOpen(true) : () => void regenerateSummary()}
            title={hasSummary ? t("summary.loading.openWithSummary") : t("summary.loading.open")}
            type="button"
          >
            {generating ? <LoaderCircle className="size-7 animate-spin" /> : <Sparkles className="size-7" />}
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

      <Dialog onOpenChange={setModelDialogOpen} open={modelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="border-b-0 pb-3">
            <DialogTitle>{t("summary.usage.model")}</DialogTitle>
            <DialogDescription>{modelLabel || t("common.notAvailable")}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
