"use client";

import type { ReactNode } from "react";
import { useTransientScrollbar } from "@/lib/use-transient-scrollbar";

interface StatsScrollbarRowProps {
  children: ReactNode;
  className: string;
}

export function StatsScrollbarRow({ children, className }: StatsScrollbarRowProps) {
  const { isVisible, showScrollbar } = useTransientScrollbar();

  return (
    <div
      className={className}
      data-scrollbar-visible={isVisible ? "true" : undefined}
      onScroll={showScrollbar}
    >
      {children}
    </div>
  );
}