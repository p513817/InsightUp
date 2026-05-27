"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "@/components/i18n-provider";

interface PageLoadingProps {
  className?: string;
}

export function PageLoading({ className }: PageLoadingProps) {
  const t = useTranslations();

  return (
    <div className={cn("flex min-h-[60vh] flex-col items-center justify-center gap-8", className)}>
      <div className="relative h-20 w-20">
        <span
          className="absolute inset-0 animate-ping rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, rgb(var(--brand-mint-500)), transparent 70%)",
            animationDuration: "2s",
          }}
        />
        <span className="absolute inset-0 rounded-full border-[2px]" style={{ borderColor: "rgb(var(--brand-sky-400) / 0.5)" }} />
        <span
          className="absolute inset-0 animate-spin rounded-full border-[2px] border-transparent"
          style={{
            borderTopColor: "rgb(var(--brand-mint-500))",
            borderRightColor: "rgb(var(--brand-mint-500))",
            animationDuration: "1.2s",
            animationTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
        <span className="absolute inset-[10px] rounded-full border-[2px]" style={{ borderColor: "rgb(var(--brand-sky-400) / 0.35)" }} />
        <span
          className="absolute inset-[10px] rounded-full border-[2px] border-transparent"
          style={{
            borderTopColor: "rgb(var(--brand-navy-700))",
            borderLeftColor: "rgb(var(--brand-navy-700))",
            animation: "spin 1.8s linear infinite reverse",
          }}
        />
        <span
          className="absolute inset-[22px] animate-pulse rounded-full"
          style={{
            background: "rgb(var(--brand-mint-600))",
            boxShadow: "0 0 12px 4px rgb(var(--brand-mint-500) / 0.5)",
            animationDuration: "1.4s",
          }}
        />
      </div>

      <p className="flex gap-[2px] text-xs font-semibold tracking-[0.3em] uppercase" style={{ color: "rgb(var(--brand-slate-500))" }}>
        {t("loading.label").split("").map((char, i) => (
          <span key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.18}s`, animationDuration: "1.4s" }}>
            {char}
          </span>
        ))}
      </p>
    </div>
  );
}
