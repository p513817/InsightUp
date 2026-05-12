"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface LogoAnimatedProps {
  className?: string;
  size?: number;
}

export function LogoAnimated({ className, size = 56 }: LogoAnimatedProps) {
  const [done, setDone] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 每次掛載自動播放動畫
  useEffect(() => {
    setDone(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      // 捕捉 play() Promise，忽略省電策略導致的錯誤
      videoRef.current.play().catch(() => {});
    }
  }, []);

  return (
    <span className={cn("relative inline-flex overflow-hidden", className)}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        className={cn(
          "h-full w-full object-contain transition-opacity duration-500",
          done && "opacity-0",
        )}
        onEnded={(event) => {
          event.currentTarget.pause();
          setDone(true);
        }}
      >
        <source src="/insightup-logo-anim.webm" type="video/webm" />
      </video>

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
