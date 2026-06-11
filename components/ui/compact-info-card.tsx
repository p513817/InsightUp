import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CompactInfoCardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  label: ReactNode;
  minWidthClassName?: string;
  value?: ReactNode;
  valueClassName?: string;
  variant?: "soft" | "glass";
}

export function CompactInfoCard({
  children,
  className,
  label,
  minWidthClassName = "min-w-[7.25rem]",
  value,
  valueClassName,
  variant = "soft",
  ...props
}: CompactInfoCardProps) {
  return (
    <div
      className={cn(
        variant === "glass" ? "surface-glass-card" : "surface-soft-card",
        "shrink-0 rounded-[0.8rem] px-2.5 py-2.5 sm:px-3",
        minWidthClassName,
        className,
      )}
      {...props}
    >
      <p className="truncate text-[10px] font-semibold uppercase leading-none tracking-[0.12em] text-muted-foreground">{label}</p>
      {value !== undefined ? <p className={cn("mt-1 font-display text-[1.12rem] leading-none text-foreground", valueClassName)}>{value}</p> : null}
      {children}
    </div>
  );
}
