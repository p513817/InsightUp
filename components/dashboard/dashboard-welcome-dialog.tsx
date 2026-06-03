"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";

interface DashboardWelcomeDialogProps {
  open?: boolean;
}

export function DashboardWelcomeDialog({ open = false }: DashboardWelcomeDialogProps) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (open && !isDismissed) {
      setIsOpen(true);
    }
  }, [isDismissed, open]);

  useEffect(() => {
    if (!isOpen || !window.location.search.includes("welcome=1")) {
      return;
    }

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("welcome");
    window.history.replaceState(null, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(var(--overlay)/0.24)] px-4 py-6 backdrop-blur-[3px]">
      <div className="relative w-full max-w-[25rem] overflow-hidden rounded-[1.5rem] border border-border/70 bg-card shadow-panel">
        <button
          aria-label={t("common.close")}
          className="absolute right-3 top-3 inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent/18 hover:text-foreground"
          onClick={() => {
            setIsDismissed(true);
            setIsOpen(false);
          }}
          type="button"
        >
          <X className="size-4" />
        </button>

        <div className="border-b-0 px-5 pb-2 pt-5 sm:px-6 sm:pt-6">
          <h2 className="font-display text-[1.65rem] leading-tight text-foreground">{t("dashboard.welcomeTitle")}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{t("dashboard.welcomeBody")}</p>
        </div>

        <div className="px-5 pb-5 pt-2 sm:px-6 sm:pb-6">
          <Button asChild className="h-12 w-full rounded-[1rem]">
            <a href="/records/new">
              <Plus className="size-5" />
              {t("records.empty.action")}
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
