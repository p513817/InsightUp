"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type SegmentedSwitchItem = {
  icon: ReactNode;
  label: string;
  value: string;
};

type SegmentedSwitchProps = {
  ariaLabel: string;
  className?: string;
  feedbackDelayMs?: number;
  feedbackHoldMs?: number;
  items: [SegmentedSwitchItem, SegmentedSwitchItem];
  onValueChange: (value: string) => void;
  value: string;
};

const DEFAULT_FEEDBACK_DELAY_MS = 120;
const DEFAULT_FEEDBACK_HOLD_MS = 180;

export function SegmentedSwitch({
  ariaLabel,
  className,
  feedbackDelayMs = DEFAULT_FEEDBACK_DELAY_MS,
  feedbackHoldMs = DEFAULT_FEEDBACK_HOLD_MS,
  items,
  onValueChange,
  value,
}: SegmentedSwitchProps) {
  const [pendingValue, setPendingValue] = useState<string | null>(null);
  const changeTimeoutRef = useRef<number | null>(null);
  const clearPendingTimeoutRef = useRef<number | null>(null);
  const visualValue = pendingValue ?? value;
  const selectedIndex = items.findIndex((item) => item.value === visualValue);
  const indicatorIndex = selectedIndex === 1 ? 1 : 0;

  useEffect(
    () => () => {
      if (changeTimeoutRef.current != null) {
        window.clearTimeout(changeTimeoutRef.current);
      }

      if (clearPendingTimeoutRef.current != null) {
        window.clearTimeout(clearPendingTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (pendingValue == null || pendingValue !== value) {
      return;
    }

    if (clearPendingTimeoutRef.current != null) {
      window.clearTimeout(clearPendingTimeoutRef.current);
    }

    clearPendingTimeoutRef.current = window.setTimeout(() => {
      setPendingValue(null);
      clearPendingTimeoutRef.current = null;
    }, feedbackHoldMs);
  }, [feedbackHoldMs, pendingValue, value]);

  function handleSelect(nextValue: string) {
    if (changeTimeoutRef.current != null) {
      window.clearTimeout(changeTimeoutRef.current);
    }

    if (clearPendingTimeoutRef.current != null) {
      window.clearTimeout(clearPendingTimeoutRef.current);
    }

    setPendingValue(nextValue);

    if (nextValue === value) {
      clearPendingTimeoutRef.current = window.setTimeout(() => {
        setPendingValue(null);
        clearPendingTimeoutRef.current = null;
      }, feedbackHoldMs);
      return;
    }

    changeTimeoutRef.current = window.setTimeout(() => {
      onValueChange(nextValue);
      changeTimeoutRef.current = null;
    }, feedbackDelayMs);
  }

  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        "surface-pill absolute left-1/2 grid h-[2.625rem] -translate-x-1/2 grid-cols-2 gap-1 overflow-hidden rounded-full bg-card/78 p-[0.3125rem] shadow-none",
        className,
      )}
      role="tablist"
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute bottom-[0.3125rem] left-[0.3125rem] top-[0.3125rem] z-0 w-[calc((100%-0.875rem)/2)] rounded-full bg-[linear-gradient(135deg,rgb(var(--primary))_0%,rgb(var(--primary-strong))_100%)] shadow-[0_8px_16px_rgba(23,52,93,0.14)] transition-[transform,box-shadow,filter] duration-[520ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
          indicatorIndex === 1 ? "translate-x-[calc(100%+0.25rem)]" : "translate-x-0",
          pendingValue ? "shadow-[0_10px_20px_rgba(23,52,93,0.2)] brightness-105" : "",
        )}
      />

      {items.map((item) => {
        const isSelected = visualValue === item.value;
        const isPressed = pendingValue === item.value;

        return (
          <button
            aria-selected={value === item.value}
            className={cn(
              "relative z-10 inline-flex h-full items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-[color,transform,filter] duration-[320ms] ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] [&_svg]:transition-transform [&_svg]:duration-[320ms]",
              isSelected ? "text-primary-foreground [&_svg]:scale-110" : "text-muted-foreground hover:text-foreground [&_svg]:scale-95",
              isPressed ? "scale-[0.985] brightness-110" : "",
            )}
            key={item.value}
            onClick={() => handleSelect(item.value)}
            role="tab"
            type="button"
          >
            {item.icon}
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
