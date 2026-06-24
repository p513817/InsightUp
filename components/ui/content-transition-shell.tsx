"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
  overlayMode = "absolute",
  waitForPathnameChange = false,
}: ContentTransitionShellProps) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [fixedOverlayTop, setFixedOverlayTop] = useState<number | null>(null);
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingStartedAtRef = useRef(0);
  const loadingPathnameRef = useRef<string | null>(null);
  const finishTimerRef = useRef<number | null>(null);

  function clearFinishTimer() {
    if (finishTimerRef.current == null) {
      return;
    }

    window.clearTimeout(finishTimerRef.current);
    finishTimerRef.current = null;
  }

  function startLoading() {
    if (isLoading && !isFinishing) {
      return;
    }

    clearFinishTimer();
    setLockedHeight(containerRef.current?.getBoundingClientRect().height ?? null);
    const headerOffset = Number.parseFloat(
      window.getComputedStyle(document.documentElement).getPropertyValue("--app-header-offset"),
    );
    setFixedOverlayTop(Number.isFinite(headerOffset) ? headerOffset + 16 : 16);
    loadingStartedAtRef.current = window.performance.now();
    loadingPathnameRef.current = window.location.pathname;
    setIsFinishing(false);
    setIsLoading(true);
  }

  useEffect(() => {
    if (mode === "controlled") {
      return;
    }

    window.addEventListener(eventName, startLoading);

    return () => {
      clearFinishTimer();
      window.removeEventListener(eventName, startLoading);
    };
  }, [eventName, mode]);

  useEffect(() => {
    if (mode === "event") {
      return;
    }

    if (active) {
      startLoading();
    }
  }, [active, mode]);

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
      setFixedOverlayTop(null);
      setLockedHeight(null);
      loadingPathnameRef.current = null;
      finishTimerRef.current = null;
    }, remainingMs);
  }, [complete, isLoading, minVisibleMs, pathname, waitForPathnameChange]);

  return (
    <div className={cn("relative", className)} ref={containerRef} style={lockedHeight != null ? { minHeight: lockedHeight } : undefined}>
      <div
        className={cn(
          "transition-opacity duration-150 motion-reduce:transition-none",
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
              ? "fixed left-1/2 top-4 z-30 min-h-[52vh] w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 rounded-[1.75rem] bg-background/92 backdrop-blur-sm transition-opacity duration-180 motion-reduce:transition-none"
              : "absolute inset-x-0 top-0 z-20 min-h-[52vh] rounded-[1.75rem] bg-background/92 backdrop-blur-sm transition-opacity duration-180 motion-reduce:transition-none",
            isFinishing ? "opacity-0" : "opacity-100",
            overlayClassName,
          )}
          style={overlayMode === "fixed" && fixedOverlayTop != null ? { top: fixedOverlayTop } : undefined}
        >
          <PageLoading className="min-h-[52vh]" />
        </div>
      ) : null}
    </div>
  );
}
