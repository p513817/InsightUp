"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslations } from "@/components/i18n-provider";

const WELCOME_DIALOG_SESSION_KEY = "insightup.dashboardWelcomeShown";

export function DashboardWelcomeDialog() {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const shouldShowWelcome = url.searchParams.get("welcome") === "1";

    if (!shouldShowWelcome || window.sessionStorage.getItem(WELCOME_DIALOG_SESSION_KEY) === "true") {
      return;
    }

    window.sessionStorage.setItem(WELCOME_DIALOG_SESSION_KEY, "true");
    url.searchParams.delete("welcome");
    router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
    setOpen(true);
  }, [router]);

  function goToNewRecord() {
    setOpen(false);
    router.push("/records/new");
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent className="max-w-[25rem] p-0" showCloseButton>
        <DialogHeader className="border-b-0 px-5 pb-2 pt-5 sm:px-6 sm:pt-6">
          <DialogTitle className="text-[1.65rem] leading-tight">{t("dashboard.welcomeTitle")}</DialogTitle>
          <DialogDescription className="text-sm leading-6">{t("dashboard.welcomeBody")}</DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5 pt-2 sm:px-6 sm:pb-6">
          <Button className="h-12 w-full rounded-[1rem]" onClick={goToNewRecord} type="button">
            <Plus className="size-5" />
            {t("records.empty.action")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
