"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale, useTranslations } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

interface FriendCodeCardProps {
  className?: string;
  description?: string;
  friendCode: string;
  title?: string;
}

export function FriendCodeCard({ className, description, friendCode, title }: FriendCodeCardProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(friendCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      toast.success(t("friends.copyCode"), {
        description: t("friends.copyCodeBody"),
      });
    } catch {
      toast.error(t("friends.copyCodeFailed"));
    }
  }

  return (
    <div className={cn("surface-soft-card rounded-[1rem] p-4", className)}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{title || t("friends.friendCode")}</p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="break-all font-display text-[1.45rem] leading-tight text-foreground sm:text-[1.6rem]">{friendCode}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description || t("friends.myFriendCodeHint")}</p>
        </div>

        <Button className="shrink-0" onClick={handleCopy} size="sm" type="button" variant={copied ? "secondary" : "outline"}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? (locale === "en" ? "Copied" : "\u5df2\u8907\u88fd") : locale === "en" ? "Copy" : "\u8907\u88fd"}
        </Button>
      </div>
    </div>
  );
}
