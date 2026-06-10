"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

interface FriendCodeCardProps {
  className?: string;
  description?: string;
  friendCode: string;
  title?: string;
}

export function FriendCodeCard({ className, description, friendCode, title }: FriendCodeCardProps) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);
  const resetCopiedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetCopiedTimerRef.current !== null) {
        window.clearTimeout(resetCopiedTimerRef.current);
      }
    };
  }, []);

  async function copyWithFallback(text: string) {
    if (typeof window !== "undefined" && window.isSecureContext && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    if (typeof document === "undefined") {
      throw new Error("Clipboard unavailable");
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (!copied) {
      throw new Error("Clipboard fallback failed");
    }
  }

  async function handleCopy() {
    try {
      await copyWithFallback(friendCode);
      setCopied(true);
      if (resetCopiedTimerRef.current !== null) {
        window.clearTimeout(resetCopiedTimerRef.current);
      }
      resetCopiedTimerRef.current = window.setTimeout(() => {
        setCopied(false);
        resetCopiedTimerRef.current = null;
      }, 1600);
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
          {copied ? t("common.copied") : t("common.copy")}
        </Button>
      </div>
    </div>
  );
}
