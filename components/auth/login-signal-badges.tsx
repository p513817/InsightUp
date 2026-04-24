"use client";

import { useEffect, useState } from "react";
import { Eye, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const signalItems = [
  {
    title: "Insight",
    description: "一眼判讀變化。",
    icon: Eye,
  },
  {
    title: "Control",
    description: "掌握分析範圍。",
    icon: SlidersHorizontal,
  },
  {
    title: "Evidence",
    description: "保存歷史脈絡。",
    icon: ShieldCheck,
  },
] as const;

export function LoginSignalBadges() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeItem = signalItems[activeIndex];

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % signalItems.length);
    }, 2400);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="animate-fade-up-delay-3 mt-5 space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-2.5">
        {signalItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = index === activeIndex;

          return (
            <button
              key={item.title}
              aria-pressed={isActive}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-[1.1rem] border px-2 py-2.5 text-center shadow-[0_8px_18px_rgba(16,35,63,0.04)] transition-all duration-200 ease-out sm:inline-flex sm:min-w-[9.2rem] sm:flex-row sm:items-center sm:justify-start sm:gap-2 sm:rounded-full sm:px-3 sm:py-2.5 sm:text-left",
                isActive
                  ? "border-[rgba(121,215,195,0.42)] bg-[rgba(255,255,255,0.96)] shadow-[0_12px_24px_rgba(16,35,63,0.07)]"
                  : "border-white/75 bg-[rgba(255,255,255,0.84)]",
              )}
              onClick={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onMouseEnter={() => setActiveIndex(index)}
              type="button"
            >
              <div
                className={cn(
                  "rounded-full border p-1.5 transition-colors duration-200",
                  isActive
                    ? "border-[rgba(121,215,195,0.40)] bg-[rgba(121,215,195,0.18)] text-[#17345d]"
                    : "border-[rgba(121,215,195,0.28)] bg-[rgba(121,215,195,0.12)] text-[#1c365f]",
                )}
              >
                <Icon className="size-3.5" />
              </div>
              <p className="font-display text-[0.8rem] leading-none text-foreground sm:text-[0.9rem]">{item.title}</p>
            </button>
          );
        })}
      </div>

      <div className="mx-auto w-full max-w-md rounded-full border border-white/75 bg-[rgba(255,255,255,0.74)] px-4 py-2.5 text-center shadow-[0_8px_18px_rgba(16,35,63,0.04)]">
        <div key={activeItem.title} className="animate-fade-up">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{activeItem.title}</p>
          <p className="mt-1 text-sm leading-6 text-foreground/78">{activeItem.description}</p>
        </div>
      </div>
    </div>
  );
}