"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { PageLoading } from "@/components/ui/page-loading";
import { ROUTE_TRANSITION_START_EVENT } from "@/lib/route-transition-feedback";
import { cn } from "@/lib/utils";

type ContentTransitionShellProps = {
  active?: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  complete?: boolean;
  eventName?: string;
  loadingContentClassName?: string;
  minVisibleMs?: number;
  mode?: "event" | "controlled" | "event-or-controlled";
  overlayClassName?: string;
  overlayMode?: "absolute" | "fixed";
  waitForPathnameChange?: boolean;
};

const DEFAULT_MIN_VISIBLE_MS = 300;

export function ContentTransitionShell({
  active = false,
  children,
  className,
  contentClassName,
  complete = true,
  eventName = ROUTE_TRANSITION_START_EVENT,
  loadingContentClassName = "pointer-events-none opacity-35",
  minVisibleMs = DEFAULT_MIN_VISIBLE_MS,
  mode = "event",
  overlayClassName,
  overlayMode = "fixed",
  waitForPathnameChange = false,
}: ContentTransitionShellProps) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingStartedAtRef = useRef(0);
  const loadingPathnameRef = useRef<string | null>(null);
  const finishTimerRef = useRef<number | null>(null);

  const clearFinishTimer = useCallback(() => {
    if (finishTimerRef.current == null) {
      return;
    }

    window.clearTimeout(finishTimerRef.current);
    finishTimerRef.current = null;
  }, []);

  const startLoading = useCallback(() => {
    if (isLoading && !isFinishing) {
      return;
    }

    clearFinishTimer();
    setLockedHeight(containerRef.current?.getBoundingClientRect().height ?? null);
    loadingStartedAtRef.current = window.performance.now();
    loadingPathnameRef.current = window.location.pathname;
    setIsFinishing(false);
    setIsLoading(true);
  }, [clearFinishTimer, isFinishing, isLoading]);

  useEffect(() => {
    if (mode === "controlled") {
      return;
    }

    window.addEventListener(eventName, startLoading);

    return () => {
      clearFinishTimer();
      window.removeEventListener(eventName, startLoading);
    };
  }, [clearFinishTimer, eventName, mode, startLoading]);

  useEffect(() => {
    if (mode === "event") {
      return;
    }

    if (active) {
      startLoading();
    }
  }, [active, mode, startLoading]);

  useEffect(() => {
    if (!isLoading || !complete) {
      return;
    }

    if (waitForPathnameChange && pathname === loadingPathnameRef.current) {
      return;
    }

    const elapsedMs = window.performance.now() - loadingStartedAtRef.current;
    const remainingMs = Math.max(0, minVisibleMs - elapsedMs);

    setIsFinishing(true);
    finishTimerRef.current = window.setTimeout(() => {
      setIsLoading(false);
      setIsFinishing(false);
      setLockedHeight(null);
      loadingPathnameRef.current = null;
      finishTimerRef.current = null;
    }, remainingMs);
  }, [complete, isLoading, minVisibleMs, pathname, waitForPathnameChange]);

  return (
    <div className={cn("relative", className)} ref={containerRef} style={lockedHeight != null ? { minHeight: lockedHeight } : undefined}>
      <div
        className={cn(
          "transition-[opacity,transform,filter] duration-200 motion-reduce:transition-none",
          isLoading && !isFinishing ? loadingContentClassName : "opacity-100",
          contentClassName,
        )}
      >
        {children}
      </div>

      {isLoading ? (
        <div
          className={cn(
            overlayMode === "fixed"
              ? "pointer-events-none fixed inset-0 z-30 transition-opacity duration-200 motion-reduce:transition-none"
              : "absolute inset-x-0 top-0 z-20 min-h-[52vh] rounded-[1.75rem] bg-background/92 backdrop-blur-sm transition-opacity duration-180 motion-reduce:transition-none",
            isFinishing ? "opacity-0" : "opacity-100",
            overlayClassName,
          )}
        >
          <PageLoading
            center={overlayMode === "fixed" ? "viewport" : "content"}
            className={overlayMode === "fixed" ? "" : "min-h-[52vh]"}
          />
        </div>
      ) : null}
    </div>
  );
}
