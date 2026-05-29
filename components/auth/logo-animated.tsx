"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

const LOGO_ANIMATION_PLAYED_KEY = "insightup.logoAnimationPlayed";
const LOGO_PLAYBACK_RATE = 1.5;
let logoAnimationPlayedInRuntime = false;

interface LogoAnimatedProps {
  className?: string;
  playOnce?: boolean;
  size?: number;
  playSignal?: number;
}

export function LogoAnimated({ className, playOnce = false, size = 56, playSignal }: LogoAnimatedProps) {
  const [done, setDone] = useState(false);
  const [shouldRenderVideo, setShouldRenderVideo] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDone(true);
      setShouldRenderVideo(false);
      return;
    }

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
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (playSignal == null || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    setDone(false);
    setShouldRenderVideo(true);

    if (videoRef.current) {
      videoRef.current.playbackRate = LOGO_PLAYBACK_RATE;
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        setDone(true);
        setShouldRenderVideo(false);
      });
    }
  }, [playSignal]);

  useEffect(() => {
    if (!shouldRenderVideo || !videoRef.current) {
      return;
    }

    videoRef.current.playbackRate = LOGO_PLAYBACK_RATE;
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
