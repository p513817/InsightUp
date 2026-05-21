"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ClipboardList, Lightbulb, LoaderCircle, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  planCode?: string;
  canGenerate?: boolean;
  message?: string;
}

type SectionKey = "overview" | "keyChanges" | "actionPlan" | "watchouts";

interface SectionConfig {
  key: SectionKey;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SECTIONS: SectionConfig[] = [
  { key: "overview", title: "趨勢總結", icon: TrendingUp },
  { key: "keyChanges", title: "關鍵變化", icon: ClipboardList },
  { key: "actionPlan", title: "可執行建議", icon: Lightbulb },
  { key: "watchouts", title: "提醒事項", icon: AlertTriangle },
];

function getProviderLabel(provider: TrendSummaryResponse["provider"], reused: boolean, modelName?: string | null) {
  const baseLabel = provider === "gemini" ? "來源：Gemini" : reused ? "來源：今日快取摘要" : "來源：快取摘要";
  return modelName ? `${baseLabel} · ${modelName}` : baseLabel;
}

function renderSectionToggle(
  section: SectionConfig,
  isOpen: boolean,
  onToggle: () => void,
  hasContent: boolean,
) {
  if (!hasContent) {
    return null;
  }

  const Icon = section.icon;
  return (
    <button
      className="flex w-full items-center justify-between gap-3 text-left"
      onClick={onToggle}
      type="button"
      aria-expanded={isOpen}
    >
      <span className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <span className="text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{section.title}</span>
      </span>
      <ChevronDown
        className={`size-4 text-muted-foreground transition-transform duration-200 ${
          isOpen ? "rotate-180" : ""
        }`}
      />
    </button>
  );
}

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
  triggerLabel = "摘要",
  triggerVariant = "default",
}: TrendSummaryFabProps) {
  const [open, setOpen] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [refreshingSummary, setRefreshingSummary] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [structuredSummary, setStructuredSummary] = useState<TrendSummaryResponse["structuredSummary"]>(null);
  const [requestDate, setRequestDate] = useState<string | null>(null);
  const [isReused, setIsReused] = useState(false);
  const [canGenerate, setCanGenerate] = useState(true);
  const [usageBadge, setUsageBadge] = useState<string | null>(null);
  const [providerLabel, setProviderLabel] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    overview: true,
    keyChanges: false,
    actionPlan: false,
    watchouts: false,
  });

  function toggleSection(section: SectionKey) {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setOpen(true);
    }
  }

  const shouldDisableOverlayBlur = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const hasLowCpu = typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4;
    const memoryValue = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const hasLowMemory = typeof memoryValue === "number" && memoryValue > 0 && memoryValue <= 4;

    return hasLowCpu || hasLowMemory;
  }, []);

  useEffect(() => {
    if (open && shouldDisableOverlayBlur) {
      document.body.classList.add("dialog-overlay-no-blur");
    } else {
      document.body.classList.remove("dialog-overlay-no-blur");
    }

    return () => {
      document.body.classList.remove("dialog-overlay-no-blur");
    };
  }, [open, shouldDisableOverlayBlur]);

  useEffect(() => {
    if (!open) {
      setOpenSections({
        overview: true,
        keyChanges: false,
        actionPlan: false,
        watchouts: false,
      });
    }
  }, [open]);

  function applySummaryResponse(data: TrendSummaryResponse) {
    setSummary(data.summary);
    setStructuredSummary(data.structuredSummary ?? null);
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

    const hasExistingSummary = Boolean(summary || structuredSummary);

    setLoadingSummary(!hasExistingSummary);
    setRefreshingSummary(hasExistingSummary);
    setOpen(true);
    onOpenSummary?.();

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

  const triggerButton = (
    <Button
      aria-label="Open AI trend summary"
      className={triggerClassName || "h-10 rounded-full px-3.5 shadow-panel sm:h-11 sm:px-4"}
      disabled={loadingSummary || generating}
      onClick={openSummary}
      type="button"
      variant={triggerVariant}
    >
      {loadingSummary ? (
        <LoaderCircle className={`${embedded ? "size-4" : "size-3.5"} animate-spin`} />
      ) : (
        <Sparkles className={embedded ? "size-4" : "size-3.5"} />
      )}
      <span className={embedded ? "text-sm font-semibold" : "text-sm font-medium"}>{triggerLabel}</span>
    </Button>
  );

  return (
    <>
      {!open ? embedded ? triggerButton : <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-40 sm:bottom-7 sm:right-7">{triggerButton}</div> : null}

      <Dialog onOpenChange={handleDialogOpenChange} open={open}>
        <DialogContent
          className="flex h-[min(88vh,46rem)] max-w-4xl flex-col p-0 sm:h-[min(88vh,52rem)]"
          onInteractOutside={(event) => event.preventDefault()}
          showCloseButton={false}
        >
          <DialogHeader className="shrink-0 border-b-0 px-5 py-4 pb-2 sm:px-6">
            <DialogTitle className="text-[1.65rem] leading-tight">近期 5 筆趨勢摘要</DialogTitle>
            <DialogDescription className="sr-only">
              AI-generated trend summary based on your latest included InBody records.
            </DialogDescription>
          </DialogHeader>

          <div className="shrink-0 border-b border-border/80 px-5 pt-2 pb-3 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              {requestDate ? (
                <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-xs font-medium text-foreground">{requestDate}</span>
              ) : null}
              {usageBadge ? (
                <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-xs font-medium text-foreground">{usageBadge}</span>
              ) : null}
              {providerLabel ? (
                <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-xs font-medium text-foreground">{providerLabel}</span>
              ) : null}
              {refreshingSummary ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <LoaderCircle className="size-3 animate-spin" />
                  背景更新中
                </div>
              ) : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3.5 sm:px-6 sm:py-4">
            {loadingSummary ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                讀取最新摘要中...
              </div>
            ) : (
              <div className="space-y-3">
                {!structuredSummary ? (
                  <p className="text-sm text-muted-foreground">{summary || "目前尚無摘要內容，點擊下方按鈕即可生成最新摘要。"}</p>
                ) : null}

                {SECTIONS.map((section) => {
                  let content: string | string[] | null = null;

                  if (section.key === "overview") {
                    content = structuredSummary?.overview || null;
                  } else if (section.key === "keyChanges") {
                    content = structuredSummary?.keyChanges || null;
                  } else if (section.key === "actionPlan") {
                    content = structuredSummary?.actionPlan || null;
                  } else if (section.key === "watchouts") {
                    content = structuredSummary?.watchouts || null;
                  }

                  const hasContent = Array.isArray(content) ? content.length > 0 : Boolean(content);

                  if (!hasContent) {
                    return null;
                  }

                  return (
                    <section key={section.key} className="surface-muted-gradient rounded-[1rem] border border-border/80 p-4">
                      {renderSectionToggle(section, openSections[section.key], () => toggleSection(section.key), hasContent)}

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
              <Button
                variant="outline"
                disabled={loadingSummary || generating}
                onClick={() => setOpen(false)}
                type="button"
                className="relative overflow-hidden"
              >
                <span>關閉</span>
              </Button>
              <Button
                disabled={loadingSummary || generating || !canGenerate}
                onClick={regenerateSummary}
                type="button"
                className="relative overflow-hidden"
              >
                <span>{generating ? (summary ? "重新生成中..." : "生成中...") : summary ? "重新生成" : "生成摘要"}</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
