"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BottomActionDockItem = {
  active?: boolean;
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

const dockItemClassName = (item: BottomActionDockItem) =>
  cn(
    "flex size-12 shrink-0 items-center justify-center border text-muted-foreground transition-[background-color,color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
    item.disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer",
    item.active
      ? "border-border/45 bg-primary/8 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_6px_14px_rgba(16,35,63,0.06)]"
      : item.variant === "danger"
        ? "border-transparent bg-transparent hover:bg-danger/8 hover:text-danger"
        : "border-transparent bg-transparent hover:bg-primary/5 hover:text-foreground",
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
        "scroll-reactive-dock pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.95rem)] z-30 flex justify-center px-3 sm:bottom-4",
        className,
      )}
    >
      <div className="bottom-action-dock-surface pointer-events-auto inline-flex w-fit max-w-[calc(100vw-2rem)] items-center gap-1.5 rounded-[1.75rem] px-1.5 py-2">
        {items.map((item, index) => {
            const content = (
                <span className="grid size-6 shrink-0 place-items-center [&_svg]:size-6" aria-hidden="true">
                  {item.icon}
                </span>
            );
            const itemClassName = cn(
              dockItemClassName(item),
              getDockItemEdgeClassName(index, items.length),
            );

            if (item.href && !item.disabled) {
              return (
                <Link
                  aria-label={item.ariaLabel}
                  aria-pressed={item.active}
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
                aria-pressed={item.active}
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
