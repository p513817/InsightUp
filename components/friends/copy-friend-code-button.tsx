"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";

interface CopyFriendCodeButtonProps {
  displayName: string;
  friendCode: string;
}

async function copyText(text: string) {
  if (typeof window !== "undefined" && window.isSecureContext && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
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

export function CopyFriendCodeButton({ displayName, friendCode }: CopyFriendCodeButtonProps) {
  const t = useTranslations();

  async function handleCopy() {
    try {
      await copyText(friendCode);
      toast.success(t("friends.copyCode"), {
        description: t("friends.copyCodeBody"),
      });
    } catch {
      toast.error(t("friends.copyCodeFailed"));
    }
  }

  return (
    <Button
      aria-label={`${t("common.copy")} ${displayName} ${t("friends.friendCode")}`}
      className="size-6 shrink-0 px-0 text-primary hover:bg-primary/10"
      onClick={handleCopy}
      size="icon"
      title={t("common.copy")}
      type="button"
      variant="ghost"
    >
      <Copy className="size-3.5" />
    </Button>
  );
}
