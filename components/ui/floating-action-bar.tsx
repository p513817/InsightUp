"use client";

import { type ReactNode } from "react";
import { FLOATING_ACTION_BAR_CLASS, FLOATING_ACTION_BAR_INNER_CLASS } from "@/components/ui/floating-action-styles";
import { cn } from "@/lib/utils";

interface FloatingActionBarProps {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}

export function FloatingActionBar({ children, className, innerClassName }: FloatingActionBarProps) {
  return (
    <div className={cn(FLOATING_ACTION_BAR_CLASS, className)}>
      <div className={cn(FLOATING_ACTION_BAR_INNER_CLASS, innerClassName)}>
        {children}
      </div>
    </div>
  );
}
