"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type BusyCardShellProps = {
  busy?: boolean;
  children: ReactNode;
  className?: string;
};

type ActionFeedbackOptions = {
  minPendingMs?: number;
  pendingDelayMs?: number;
  pulseMs?: number;
};

const DEFAULT_MIN_PENDING_MS = 250;
const DEFAULT_PENDING_DELAY_MS = 300;
const DEFAULT_PULSE_MS = 220;

export function BusyCardShell({ busy = false, children, className }: BusyCardShellProps) {
  return (
    <div className={cn("relative isolate overflow-hidden rounded-[1.15rem]", className)}>
      {busy ? (
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[1.15rem]">
          <span
            className="absolute inset-0 rounded-[1.15rem]"
            style={{
              animation: "rotate-gradient 2s linear infinite",
              background:
                "repeating-conic-gradient(from var(--gradient-rotation), rgb(var(--brand-sky-50) / 0) 0deg, rgb(var(--brand-sky-50) / 0) 145deg, rgb(var(--brand-mint-500) / 0.4) 155deg, rgb(var(--brand-navy-700) / 1) 160deg, rgb(var(--brand-navy-700) / 1) 195deg, rgb(var(--brand-mint-500) / 0.4) 205deg, rgb(var(--brand-sky-50) / 0) 215deg, rgb(var(--brand-sky-50) / 0) 360deg)",
            }}
          />
          <span className="absolute inset-[1.5px] rounded-[calc(1.15rem-1.5px)]" style={{ background: "rgb(var(--background))" }} />
        </span>
      ) : null}

      {children}
    </div>
  );
}

export function useActionFeedback(options: ActionFeedbackOptions = {}) {
  const pendingDelayMs = options.pendingDelayMs ?? DEFAULT_PENDING_DELAY_MS;
  const minPendingMs = options.minPendingMs ?? DEFAULT_MIN_PENDING_MS;
  const pulseMs = options.pulseMs ?? DEFAULT_PULSE_MS;
  const [isPending, setIsPending] = useState(false);
  const [isPulseVisible, setIsPulseVisible] = useState(false);
  const isPendingRef = useRef(false);
  const pendingStartedAtRef = useRef(0);
  const pendingDelayRef = useRef<number | null>(null);
  const pulseTimeoutRef = useRef<number | null>(null);
  const finishPendingTimeoutRef = useRef<number | null>(null);

  const clearTimer = useCallback((timerRef: MutableRefObject<number | null>) => {
    if (timerRef.current == null) {
      return;
    }

    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const pulse = useCallback(() => {
    clearTimer(pulseTimeoutRef);
    setIsPulseVisible(true);
    pulseTimeoutRef.current = window.setTimeout(() => {
      setIsPulseVisible(false);
      pulseTimeoutRef.current = null;
    }, pulseMs);
  }, [clearTimer, pulseMs]);

  const startPending = useCallback(() => {
    clearTimer(finishPendingTimeoutRef);
    clearTimer(pendingDelayRef);
    pendingDelayRef.current = window.setTimeout(() => {
      pendingStartedAtRef.current = window.performance.now();
      isPendingRef.current = true;
      setIsPending(true);
      pendingDelayRef.current = null;
    }, pendingDelayMs);
  }, [clearTimer, pendingDelayMs]);

  const finishPending = useCallback(() => {
    clearTimer(pendingDelayRef);

    if (!isPendingRef.current) {
      return;
    }

    const elapsedMs = window.performance.now() - pendingStartedAtRef.current;
    const remainingMs = Math.max(0, minPendingMs - elapsedMs);

    clearTimer(finishPendingTimeoutRef);
    finishPendingTimeoutRef.current = window.setTimeout(() => {
      isPendingRef.current = false;
      setIsPending(false);
      finishPendingTimeoutRef.current = null;
    }, remainingMs);
  }, [clearTimer, minPendingMs]);

  const run = useCallback(
    async <T,>(action: () => Promise<T>) => {
      pulse();
      startPending();

      try {
        return await action();
      } finally {
        finishPending();
      }
    },
    [finishPending, pulse, startPending],
  );

  useEffect(
    () => () => {
      clearTimer(pendingDelayRef);
      clearTimer(pulseTimeoutRef);
      clearTimer(finishPendingTimeoutRef);
    },
    [clearTimer],
  );

  return {
    finishPending,
    isPending,
    isPulseVisible,
    pulse,
    run,
    startPending,
  };
}
