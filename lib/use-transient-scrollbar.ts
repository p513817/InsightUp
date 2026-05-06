"use client";

import { useEffect, useRef, useState } from "react";

export function useTransientScrollbar(fadeDelay = 720) {
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  function showScrollbar() {
    setIsVisible(true);

    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, fadeDelay);
  }

  return {
    isVisible,
    showScrollbar,
  };
}