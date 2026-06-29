"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTranslations } from "@/components/i18n-provider";

interface LoginProductIntroModalProps {
  triggerClassName?: string;
}

export function LoginProductIntroModal({ triggerClassName }: LoginProductIntroModalProps) {
  const t = useTranslations();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className={triggerClassName} size="lg" variant="outline">
          {t("home.productIntro")}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-4xl rounded-[1.75rem] p-0 sm:rounded-[2rem]">
        <DialogHeader className="surface-subtle-gradient border-b border-border/70 px-5 py-5 sm:px-8 sm:py-6">
          <DialogTitle>{t("auth.intro.title")}</DialogTitle>
          <DialogDescription>{t("auth.intro.description")}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-7">
          <div className="space-y-6 pr-1">
            <section className="surface-subtle-gradient overflow-hidden rounded-[1.5rem] border border-border/70">
              <div className="grid gap-5 p-4 sm:p-5 md:grid-cols-[0.9fr_1.1fr] md:items-center md:p-6">
                <div className="space-y-3">
                  <h3 className="font-display text-2xl font-semibold leading-tight text-foreground sm:text-3xl">{t("auth.intro.sections.problemTitle")}</h3>
                  <p className="text-sm leading-7 text-muted-foreground">{t("auth.intro.sections.problemBody")}</p>
                  <div className="grid gap-2 pt-1">
                    <p className="rounded-full border border-border/70 bg-card/88 px-4 py-2 text-sm font-semibold text-foreground">{t("auth.intro.sections.problemPoint1")}</p>
                    <p className="rounded-full border border-border/70 bg-card/88 px-4 py-2 text-sm font-semibold text-foreground">{t("auth.intro.sections.problemPoint2")}</p>
                    <p className="rounded-full border border-border/70 bg-card/88 px-4 py-2 text-sm font-semibold text-foreground">{t("auth.intro.sections.problemPoint3")}</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-card/90 shadow-[0_14px_34px_rgba(16,35,63,0.08)]">
                  <Image
                    src="/landing-user-problem.png"
                    alt={t("auth.intro.sections.problemImageAlt")}
                    width={810}
                    height={456}
                    className="h-auto w-full"
                    sizes="(min-width: 768px) 480px, calc(100vw - 72px)"
                  />
                </div>
              </div>
            </section>

            <section className="grid gap-3 md:grid-cols-3">
              <div className="surface-subtle-gradient rounded-[1.35rem] border border-border/70 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Insight</p>
                <p className="mt-3 font-display text-2xl text-foreground">{t("auth.intro.sections.insightTitle")}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("auth.intro.sections.insightBody")}</p>
              </div>
              <div className="surface-subtle-gradient rounded-[1.35rem] border border-border/70 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Control</p>
                <p className="mt-3 font-display text-2xl text-foreground">{t("auth.intro.sections.controlTitle")}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("auth.intro.sections.controlBody")}</p>
              </div>
              <div className="surface-subtle-gradient rounded-[1.35rem] border border-border/70 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Evidence</p>
                <p className="mt-3 font-display text-2xl text-foreground">{t("auth.intro.sections.evidenceTitle")}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("auth.intro.sections.evidenceBody")}</p>
              </div>
            </section>

            <section className="surface-subtle-gradient grid gap-4 rounded-[1.5rem] border border-border/70 p-5 md:grid-cols-[0.95fr_1.05fr] md:p-6">
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">How It Works</p>
                <h3 className="font-display text-3xl text-foreground">{t("auth.intro.sections.workflowTitle")}</h3>
                <p className="text-sm leading-7 text-muted-foreground">{t("auth.intro.sections.workflowBody")}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
                <div className="rounded-[1.1rem] border border-border/70 bg-card/88 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Step 1</p>
                  <p className="mt-1 font-medium text-foreground">{t("auth.intro.sections.step1")}</p>
                </div>
                <div className="rounded-[1.1rem] border border-border/70 bg-card/88 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Step 2</p>
                  <p className="mt-1 font-medium text-foreground">{t("auth.intro.sections.step2")}</p>
                </div>
                <div className="rounded-[1.1rem] border border-border/70 bg-card/88 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Step 3</p>
                  <p className="mt-1 font-medium text-foreground">{t("auth.intro.sections.step3")}</p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="surface-subtle-gradient rounded-[1.35rem] border border-border/70 p-4 sm:p-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Who It&apos;s For</p>
                <h3 className="mt-3 font-display text-2xl text-foreground">{t("auth.intro.sections.audienceTitle")}</h3>
                <div className="mt-4 space-y-2.5 text-sm leading-6 text-muted-foreground">
                  <p>{t("auth.intro.sections.audienceBody1")}</p>
                  <p>{t("auth.intro.sections.audienceBody2")}</p>
                  <p>{t("auth.intro.sections.audienceBody3")}</p>
                </div>
              </div>

              <div className="surface-subtle-gradient rounded-[1.35rem] border border-border/70 p-4 sm:p-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Product Principles</p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-[1rem] border border-border/70 bg-card/88 px-4 py-3">
                    <p className="font-medium text-foreground">{t("auth.intro.sections.principle1Title")}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("auth.intro.sections.principle1Body")}</p>
                  </div>
                  <div className="rounded-[1rem] border border-border/70 bg-card/88 px-4 py-3">
                    <p className="font-medium text-foreground">{t("auth.intro.sections.principle2Title")}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("auth.intro.sections.principle2Body")}</p>
                  </div>
                  <div className="rounded-[1rem] border border-border/70 bg-card/88 px-4 py-3">
                    <p className="font-medium text-foreground">{t("auth.intro.sections.principle3Title")}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("auth.intro.sections.principle3Body")}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="surface-subtle-gradient rounded-[1.5rem] border border-border/70 p-5 md:p-6">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("auth.intro.sections.rulesTitle")}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-[1rem] border border-border/70 bg-card/88 px-4 py-3">
                  <p className="font-medium text-foreground">{t("auth.intro.sections.rule1Title")}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("auth.intro.sections.rule1Body")}</p>
                </div>
                <div className="rounded-[1rem] border border-border/70 bg-card/88 px-4 py-3">
                  <p className="font-medium text-foreground">{t("auth.intro.sections.rule2Title")}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("auth.intro.sections.rule2Body")}</p>
                </div>
                <div className="rounded-[1rem] border border-border/70 bg-card/88 px-4 py-3">
                  <p className="font-medium text-foreground">{t("auth.intro.sections.rule3Title")}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("auth.intro.sections.rule3Body")}</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
