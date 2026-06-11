"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CompactInfoCard } from "@/components/ui/compact-info-card";
import { useTranslations } from "@/components/i18n-provider";

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
    <CompactInfoCard className={className} label={title || t("friends.friendCode")} minWidthClassName="">
      <div className="mt-2 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="break-all font-display text-[1.12rem] leading-tight text-foreground">{friendCode}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description || t("friends.myFriendCodeHint")}</p>
        </div>

        <Button className="shrink-0" onClick={handleCopy} size="sm" type="button" variant={copied ? "secondary" : "outline"}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? t("common.copied") : t("common.copy")}
        </Button>
      </div>
    </CompactInfoCard>
  );
}
