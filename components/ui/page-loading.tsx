"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "@/components/i18n-provider";

interface PageLoadingProps {
  center?: "content" | "viewport";
  className?: string;
}

export function PageLoading({ center = "content", className }: PageLoadingProps) {
  const t = useTranslations();
  const label = t("loading.label");
  const isViewportCentered = center === "viewport";

  return (
    <div
      aria-label={label}
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-8",
        isViewportCentered ? "fixed inset-0 z-30 min-h-dvh px-4" : "min-h-[60vh]",
        isViewportCentered ? "bg-background/92 backdrop-blur-sm" : "",
        className,
      )}
      role="status"
    >
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
        {label.split("").map((char, i) => (
          <span key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.18}s`, animationDuration: "1.4s" }}>
            {char}
          </span>
        ))}
      </p>
    </div>
  );
}
