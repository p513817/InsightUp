"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

const LOGO_ANIMATION_PLAYED_KEY = "insightup.logoAnimationPlayed";
const LOGO_ANIMATION_SRC = "/insightup-logo-anim-384.webm";
const LOGO_STATIC_SRC = "/insightup-logo-rmbg-192.png";
const LOGO_PLAYBACK_RATE = 2;
let logoAnimationPlayedInRuntime = false;

interface LogoAnimatedProps {
  className?: string;
  playOnce?: boolean;
  size?: number;
  playSignal?: number;
}

export function LogoAnimated({ className, playOnce = false, size = 56, playSignal }: LogoAnimatedProps) {
  const [done, setDone] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [shouldRenderVideo, setShouldRenderVideo] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasMountedRef = useRef(false);

  const playLogoVideo = useCallback((video: HTMLVideoElement, reset = true) => {
    video.playbackRate = LOGO_PLAYBACK_RATE;

    if (reset) {
      video.currentTime = 0;
    }

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      setVideoReady(true);
    }

    video.play().catch(() => {
      setDone(true);
      setShouldRenderVideo(false);
    });
  }, []);

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
      setVideoReady(false);
      setShouldRenderVideo(false);
      return;
    }

    setDone(false);
    setVideoReady(false);
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
    setVideoReady(false);
    setShouldRenderVideo(true);

    if (videoRef.current) {
      playLogoVideo(videoRef.current);
    }
  }, [playSignal, playLogoVideo]);

  useEffect(() => {
    if (!shouldRenderVideo || !videoRef.current) {
      return;
    }

    playLogoVideo(videoRef.current);
  }, [shouldRenderVideo, playLogoVideo]);

  function markAnimationDone() {
    if (playOnce) {
      logoAnimationPlayedInRuntime = true;
      window.sessionStorage.setItem(LOGO_ANIMATION_PLAYED_KEY, "true");
    }

    setDone(true);
  }

  function markAnimationPlayed() {
    if (!playOnce) {
      return;
    }

    logoAnimationPlayedInRuntime = true;
    window.sessionStorage.setItem(LOGO_ANIMATION_PLAYED_KEY, "true");
  }

  return (
    <span className={cn("relative inline-flex overflow-hidden", className)}>
      <Image
        alt="InsightUp"
        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        height={size}
        src={LOGO_STATIC_SRC}
        width={size}
        priority
      />

      {shouldRenderVideo ? (
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          poster={LOGO_STATIC_SRC}
          className={cn(
            "absolute inset-0 h-full w-full object-contain transition-opacity duration-200",
            videoReady && !done ? "opacity-100" : "opacity-0",
          )}
          onCanPlay={(event) => {
            playLogoVideo(event.currentTarget, false);
          }}
          onEnded={(event) => {
            event.currentTarget.pause();
            markAnimationPlayed();
          }}
          onError={markAnimationDone}
        >
          <source src={LOGO_ANIMATION_SRC} type="video/webm" />
        </video>
      ) : null}
    </span>
  );
}
