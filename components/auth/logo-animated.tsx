"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

const LOGO_ANIMATION_PLAYED_KEY = "insightup.logoAnimationPlayed";
let logoAnimationPlayedInRuntime = false;

interface LogoAnimatedProps {
  className?: string;
  playOnce?: boolean;
  size?: number;
}

export function LogoAnimated({ className, playOnce = false, size = 56 }: LogoAnimatedProps) {
  const [done, setDone] = useState(false);
  const [shouldRenderVideo, setShouldRenderVideo] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const hasPlayed =
      playOnce &&
      (logoAnimationPlayedInRuntime ||
        window.sessionStorage.getItem(LOGO_ANIMATION_PLAYED_KEY) === "true");

    if (hasPlayed) {
      setDone(true);
      setShouldRenderVideo(false);
      return;
    }

    setDone(false);
    setShouldRenderVideo(true);
  }, [playOnce]);

  useEffect(() => {
    if (!shouldRenderVideo || !videoRef.current) {
      return;
    }

    videoRef.current.currentTime = 0;
    videoRef.current.play().catch(() => {
      setDone(true);
      setShouldRenderVideo(false);
    });
  }, [shouldRenderVideo]);

  function markAnimationDone() {
    if (playOnce) {
      logoAnimationPlayedInRuntime = true;
      window.sessionStorage.setItem(LOGO_ANIMATION_PLAYED_KEY, "true");
    }

    setDone(true);
  }

  return (
    <span className={cn("relative inline-flex overflow-hidden", className)}>
      {shouldRenderVideo ? (
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          className={cn(
            "h-full w-full object-contain transition-opacity duration-500",
            done && "opacity-0",
          )}
          onEnded={(event) => {
            event.currentTarget.pause();
            markAnimationDone();
          }}
          onError={markAnimationDone}
        >
          <source src="/insightup-logo-anim.webm" type="video/webm" />
        </video>
      ) : null}

      <Image
        alt="InsightUp"
        className={cn(
          "pointer-events-none absolute inset-0 h-full w-full object-contain transition-opacity duration-500",
          done ? "opacity-100" : "opacity-0",
        )}
        height={size}
        src="/insightup-logo-rmbg.png"
        width={size}
        priority
      />
    </span>
  );
}
