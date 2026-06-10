"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BottomActionDockItem = {
  ariaLabel: string;
  disabled?: boolean;
  href?: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  title?: string;
  variant?: "default" | "danger";
};

type BottomActionDockProps = {
  items: BottomActionDockItem[];
  className?: string;
};

const dockItemClassName = (disabled?: boolean, variant?: BottomActionDockItem["variant"]) =>
  cn(
    "flex h-9 min-w-[4.7rem] shrink-0 items-center justify-center gap-1.5 border px-3.5 text-primary-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/70",
    variant === "danger" ? "hover:bg-white/18" : "hover:bg-white/18",
    disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer",
  );

function getDockItemEdgeClassName(index: number, count: number) {
  if (count === 1) {
    return "rounded-[1rem]";
  }

  if (index === 0) {
    return "rounded-l-[1rem] rounded-r-[0.8rem]";
  }

  if (index === count - 1) {
    return "rounded-l-[0.8rem] rounded-r-[1rem]";
  }

  return "rounded-[0.9rem]";
}

export function BottomActionDock({ items, className }: BottomActionDockProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.95rem)] z-30 flex justify-center px-3 sm:bottom-4",
        className,
      )}
    >
      <div className="pointer-events-auto inline-flex items-center gap-0.5 rounded-[1.25rem] border border-primary/38 bg-[linear-gradient(135deg,rgb(var(--primary))_0%,rgb(var(--primary-strong))_100%)] px-0.5 py-0.5 text-primary-foreground shadow-[0_12px_24px_rgba(23,52,93,0.22)]">
        {items.map((item, index) => {
            const content = (
              <>
                <span className="grid size-4 shrink-0 place-items-center" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="truncate text-[0.74rem] font-semibold leading-none">{item.label}</span>
              </>
            );
            const itemClassName = cn(
              dockItemClassName(item.disabled, item.variant),
              getDockItemEdgeClassName(index, items.length),
              item.disabled
                ? "border-transparent bg-transparent text-primary-foreground/70"
                : "border-transparent bg-transparent text-primary-foreground/88 hover:text-primary-foreground",
            );

            if (item.href && !item.disabled) {
              return (
                <Link
                  aria-label={item.ariaLabel}
                  className={itemClassName}
                  href={item.href}
                  key={item.ariaLabel}
                  title={item.title}
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                aria-label={item.ariaLabel}
                className={itemClassName}
                disabled={item.disabled}
                key={item.ariaLabel}
                onClick={item.onClick}
                title={item.title}
                type="button"
              >
                {content}
              </button>
            );
        })}
      </div>
    </div>
  );
}
