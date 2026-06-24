"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ROUTE_TRANSITION_START_EVENT } from "@/lib/route-transition-feedback";

const SHOW_DELAY_MS = 120;
const MIN_VISIBLE_MS = 260;

function isPlainInternalNavigation(event: MouseEvent, anchor: HTMLAnchorElement) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }

  if (anchor.target && anchor.target !== "_self") {
    return false;
  }

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) {
    return false;
  }

  const nextUrl = new URL(anchor.href, window.location.href);
  if (nextUrl.origin !== window.location.origin) {
    return false;
  }

  return nextUrl.pathname !== window.location.pathname || nextUrl.search !== window.location.search;
}

export function RouteTransitionIndicator() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const visibleStartedAtRef = useRef(0);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    function clearTimer(timerRef: MutableRefObject<number | null>) {
      if (timerRef.current == null) {
        return;
      }

      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    function start() {
      clearTimer(hideTimerRef);
      clearTimer(showTimerRef);
      setIsFinishing(false);
      showTimerRef.current = window.setTimeout(() => {
        visibleStartedAtRef.current = window.performance.now();
        setIsVisible(true);
        showTimerRef.current = null;
      }, SHOW_DELAY_MS);
    }

    function handleClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || !isPlainInternalNavigation(event, anchor)) {
        return;
      }

      start();
    }

    window.addEventListener(ROUTE_TRANSITION_START_EVENT, start);
    document.addEventListener("click", handleClick, true);

    return () => {
      clearTimer(showTimerRef);
      clearTimer(hideTimerRef);
      window.removeEventListener(ROUTE_TRANSITION_START_EVENT, start);
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  useEffect(() => {
    if (showTimerRef.current != null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }

    if (!isVisible) {
      return;
    }

    const elapsedMs = window.performance.now() - visibleStartedAtRef.current;
    const remainingMs = Math.max(0, MIN_VISIBLE_MS - elapsedMs);
    setIsFinishing(true);

    hideTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      setIsFinishing(false);
      hideTimerRef.current = null;
    }, remainingMs);
  }, [isVisible, pathname, searchParams]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-[linear-gradient(90deg,rgb(var(--accent))_0%,rgb(var(--primary-strong))_55%,rgb(var(--accent))_100%)] shadow-[0_0_18px_rgb(var(--accent)/0.38)] transition-[opacity,transform] duration-300 motion-reduce:hidden ${
        isVisible ? (isFinishing ? "scale-x-100 opacity-0" : "scale-x-[0.72] opacity-100") : "scale-x-0 opacity-0"
      }`}
    />
  );
}
