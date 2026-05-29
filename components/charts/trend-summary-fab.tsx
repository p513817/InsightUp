"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { AlertTriangle, ChevronDown, ClipboardList, Lightbulb, LoaderCircle, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocale, useTranslations } from "@/components/i18n-provider";
import { formatCompactDate } from "@/lib/presentation";

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

interface TrendSummaryFabProps {
  embedded?: boolean;
  onOpenSummary?: () => void;
  triggerClassName?: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
}

export function TrendSummaryFab({
  embedded = false,
  onOpenSummary,
  triggerClassName,
  triggerLabel,
  triggerVariant = "default",
}: TrendSummaryFabProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [refreshingSummary, setRefreshingSummary] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [structuredSummary, setStructuredSummary] = useState<TrendSummaryResponse["structuredSummary"]>(null);
  const [requestDate, setRequestDate] = useState<string | null>(null);
  const [canGenerate, setCanGenerate] = useState(true);
  const [usageBadge, setUsageBadge] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [modelLabel, setModelLabel] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const sections: Array<{ key: SectionKey; title: string; icon: ComponentType<{ className?: string }> }> = useMemo(
    () => [
      { key: "overview", title: t("summary.sections.overview"), icon: TrendingUp },
      { key: "keyChanges", title: t("summary.sections.keyChanges"), icon: ClipboardList },
      { key: "actionPlan", title: t("summary.sections.actionPlan"), icon: Lightbulb },
      { key: "watchouts", title: t("summary.sections.watchouts"), icon: AlertTriangle },
    ],
    [t],
  );

  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    overview: true,
    keyChanges: false,
    actionPlan: false,
    watchouts: false,
  });

  const hasSummary = Boolean(summary || structuredSummary);

  function applySummaryResponse(data: TrendSummaryResponse) {
    setSummary(data.summary);
    setStructuredSummary(data.structuredSummary ?? null);
    setRequestDate(data.requestDate);
    setCanGenerate(data.canGenerate ?? true);
    setUsageBadge(
      `${t("summary.usage.label")} ${data.usageCount ?? 0} / ${data.dailyLimit == null ? t("summary.usage.unlimited") : data.dailyLimit}`,
    );
    setSourceLabel(
      data.provider === "gemini"
        ? t("summary.source.gemini")
        : data.reused
          ? t("summary.source.cacheReused")
          : t("summary.source.cache"),
    );
    setModelLabel(data.modelName || null);
  }

  async function fetchLatestSummary(quiet = false) {
    setLoadingSummary(!quiet);
    setRefreshingSummary(quiet);

    try {
      const response = await fetch("/api/trend-summary", { method: "GET" });
      const payload = (await response.json().catch(() => null)) as TrendSummaryResponse | { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message || t("summary.errors.fetchFailed"));
      }

      const data = payload as TrendSummaryResponse;
      applySummaryResponse(data);

      if (data.message && !quiet) {
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

  function handleOpenDialog() {
    setOpen(true);
    onOpenSummary?.();
    void fetchLatestSummary(true);
  }

  function toggleSection(key: SectionKey) {
    setOpenSections((current) => ({ ...current, [key]: !current[key] }));
  }

  const triggerButton = (
    <Button
      aria-label={hasSummary ? t("summary.loading.openWithSummary") : t("summary.loading.open")}
      className={
        triggerClassName ||
        (embedded
          ? "ai-trend-fab h-10 rounded-full px-3.5 shadow-panel sm:h-11 sm:px-4"
          : "ai-trend-fab size-14 rounded-full p-0 shadow-panel sm:size-[3.75rem]")
      }
      disabled={loadingSummary || generating}
      onClick={handleOpenDialog}
      type="button"
      variant={triggerVariant}
    >
      {loadingSummary ? <LoaderCircle className={`${embedded ? "size-4" : "size-7"} animate-spin`} /> : <Sparkles className={embedded ? "size-4" : "size-7"} />}
      {embedded ? <span className="text-sm font-semibold">{triggerLabel || t("summary.loading.open")}</span> : null}
    </Button>
  );

  return (
    <>
      {!open ? (embedded ? triggerButton : <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] right-5 z-40 sm:bottom-7 sm:right-7">{triggerButton}</div>) : null}

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent
          className="flex !top-1/2 !bottom-auto !h-[66.67dvh] !max-h-[66.67dvh] max-w-4xl !-translate-y-1/2 flex-col p-0"
          onInteractOutside={(event) => event.preventDefault()}
          showCloseButton={false}
        >
          <DialogHeader className="shrink-0 border-b-0 px-5 py-4 pb-2 sm:px-6">
            <DialogTitle className="text-[1.65rem] leading-tight">{t("summary.loading.emptyRecentTitle")}</DialogTitle>
            <DialogDescription className="sr-only">
              AI-generated trend summary based on your latest included InBody records.
            </DialogDescription>
          </DialogHeader>

          <div className="shrink-0 border-b border-border/80 px-5 pt-2 pb-3 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              {requestDate ? <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-xs font-medium text-foreground">{formatCompactDate(requestDate, locale)}</span> : null}
              {usageBadge ? <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-xs font-medium text-foreground">{usageBadge}</span> : null}
              {sourceLabel ? <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-xs font-medium text-foreground">{sourceLabel}</span> : null}
              {modelLabel ? <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-xs font-medium text-foreground">{modelLabel}</span> : null}
              {refreshingSummary ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <LoaderCircle className="size-3 animate-spin" />
                  {t("summary.loading.refreshing")}
                </div>
              ) : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3.5 sm:px-6 sm:py-4">
            {loadingSummary ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                {t("summary.loading.fetching")}
              </div>
            ) : (
              <div className="space-y-3">
                {!structuredSummary ? <p className="text-sm text-muted-foreground">{summary || t("summary.errors.noContent")}</p> : null}

                {sections.map((section) => {
                  let content: string | string[] | null = null;

                  if (section.key === "overview") content = structuredSummary?.overview || null;
                  if (section.key === "keyChanges") content = structuredSummary?.keyChanges || null;
                  if (section.key === "actionPlan") content = structuredSummary?.actionPlan || null;
                  if (section.key === "watchouts") content = structuredSummary?.watchouts || null;

                  const hasContent = Array.isArray(content) ? content.length > 0 : Boolean(content);
                  if (!hasContent) return null;

                  const Icon = section.icon;

                  return (
                    <section key={section.key} className="surface-muted-gradient rounded-[1rem] border border-border/80 p-4">
                      <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => toggleSection(section.key)} type="button">
                        <span className="flex items-center gap-2">
                          <Icon className="size-4 text-muted-foreground" />
                          <span className="text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{section.title}</span>
                        </span>
                        <ChevronDown className={`size-4 text-muted-foreground transition-transform duration-200 ${openSections[section.key] ? "rotate-180" : ""}`} />
                      </button>

                      {openSections[section.key] ? (
                        <div className="mt-3 space-y-2">
                          {Array.isArray(content) ? (
                            <ul className="space-y-2 pl-1">
                              {content.map((item, index) => (
                                <li className="flex gap-2 text-sm leading-6 text-foreground" key={`${section.key}-${index}`}>
                                  <span className="mt-[0.35rem] inline-block size-1.5 shrink-0 rounded-full bg-foreground/55" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm leading-6 text-foreground">{content}</p>
                          )}
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-border/80 bg-card/96 px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] sm:px-6 sm:pt-2 sm:pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
            <div className="flex flex-wrap justify-end gap-2.5">
              <Button variant="outline" disabled={loadingSummary || generating} onClick={() => setOpen(false)} type="button" className="relative overflow-hidden">
                <span>{t("summary.loading.close")}</span>
              </Button>
              <Button disabled={loadingSummary || generating || !canGenerate} onClick={() => setConfirmOpen(true)} type="button" className="relative overflow-hidden">
                <span>{generating ? (summary ? t("summary.loading.regenerating") : t("summary.loading.generating")) : summary ? t("summary.loading.regenerate") : t("summary.loading.open")}</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
    </>
  );
}
