"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FriendCodeCardProps {
  className?: string;
  description?: string;
  friendCode: string;
  title?: string;
}

export function FriendCodeCard({ className, description, friendCode, title = "Friend ID" }: FriendCodeCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(friendCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      toast.success("好友 ID 已複製。", {
        description: "把這組 ID 傳給對方即可讓他加入你。",
      });
    } catch {
      toast.error("目前無法複製好友 ID。");
    }
  }

  return (
    <div className={cn("rounded-[1rem] border border-white/45 bg-[rgba(255,255,255,0.32)] p-4 backdrop-blur-[4px]", className)}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="break-all font-display text-[1.45rem] leading-tight text-foreground sm:text-[1.6rem]">{friendCode}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description || "在 Friends 頁面輸入這組 ID，對方就能把你加入好友清單。"}</p>
        </div>

        <Button className="shrink-0" onClick={handleCopy} size="sm" type="button" variant={copied ? "secondary" : "outline"}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}