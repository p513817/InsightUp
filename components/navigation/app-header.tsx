"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useRef, useState, useTransition } from "react";
import { Files, LayoutDashboard, UsersRound } from "lucide-react";
import { AccountMenu } from "@/components/navigation/account-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AppUserSummary } from "@/lib/presentation";

interface AppHeaderProps {
  user: AppUserSummary;
}

const COLLAPSE_DISTANCE = 140;

type HeaderStyle = CSSProperties & {
  "--account-zone-width": string;
  "--brand-gap": string;
  "--brand-padding": string;
  "--brand-text-width": string;
  "--collapsed-nav-width": string;
  "--collapsed-nav-opacity": number;
  "--expanded-nav-height": string;
  "--expanded-nav-opacity": number;
  "--header-expanded-opacity": number;
  "--header-py": string;
  "--header-row-gap": string;
  "--header-row-height": string;
  "--logo-size": string;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  compact?: boolean;
  tabIndex?: number;
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function NavButton({ href, label, icon, active, compact = false, tabIndex }: NavItem) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const showPendingBorder = isPending && !active;

  return (
    <Button
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={cn(
        "relative isolate shrink-0 justify-center overflow-hidden rounded-full",
        compact ? "size-9 gap-0 px-0 sm:size-10" : "h-9 w-full sm:h-10 sm:min-w-36",
        showPendingBorder && "border border-transparent text-foreground",
      )}
      onClick={() => {
        if (!active && !isPending) startTransition(() => router.push(href));
      }}
      size="sm"
      tabIndex={tabIndex}
      variant={active ? "default" : "ghost"}
    >
      {showPendingBorder ? (
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full">
          <span
            className="absolute inset-0 rounded-full"
            style={{
              animation: "rotate-gradient 2s linear infinite",
              background:
                "repeating-conic-gradient(from var(--gradient-rotation), rgb(var(--brand-sky-50) / 0) 0deg, rgb(var(--brand-sky-50) / 0) 145deg, rgb(var(--brand-mint-500) / 0.4) 155deg, rgb(var(--brand-navy-700) / 1) 160deg, rgb(var(--brand-navy-700) / 1) 195deg, rgb(var(--brand-mint-500) / 0.4) 205deg, rgb(var(--brand-sky-50) / 0) 215deg, rgb(var(--brand-sky-50) / 0) 360deg)",
            }}
          />
          <span className="absolute inset-[1.5px] rounded-full" style={{ background: "rgb(var(--background))" }} />
        </span>
      ) : null}

      <span className={cn("relative z-10 size-4 shrink-0", showPendingBorder && "opacity-90")}>{icon}</span>
      {!compact ? <span className={cn("relative z-10", showPendingBorder && "opacity-85")}>{label}</span> : null}
    </Button>
  );
}

function NavCluster({
  activeTabIndex,
  compact,
  isDashboard,
  isFriends,
  isRecords,
}: {
  activeTabIndex: number;
  compact?: boolean;
  isDashboard: boolean;
  isFriends: boolean;
  isRecords: boolean;
}) {
  return (
    <div className={cn("surface-pill rounded-full p-1", compact ? "inline-flex h-11 items-center gap-1" : "grid h-11 w-full grid-cols-3 gap-2 sm:inline-flex sm:w-fit")}>
      <NavButton compact={compact} href="/dashboard" label="趨勢" icon={<LayoutDashboard className="size-4" />} active={isDashboard} tabIndex={activeTabIndex} />
      <NavButton compact={compact} href="/records" label="紀錄" icon={<Files className="size-4" />} active={isRecords} tabIndex={activeTabIndex} />
      <NavButton compact={compact} href="/friends" label="好友" icon={<UsersRound className="size-4" />} active={isFriends} tabIndex={activeTabIndex} />
    </div>
  );
}

export function AppHeader({ user }: AppHeaderProps) {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const headerRef = useRef<HTMLElement>(null);
  const isDashboard = pathname === "/dashboard";
  const isRecords = pathname === "/records" || pathname === "/profile";
  const isFriends = pathname === "/friends";
  const expandedProgress = 1 - progress;
  const collapsedNavOpacity = clamp((progress - 0.28) / 0.52);
  const expandedNavOpacity = clamp((0.82 - progress) / 0.52);
  const useCollapsedNav = progress >= 0.56;
  const headerStyle = {
    "--account-zone-width": `${3.25 + expandedProgress * 10.5}rem`,
    "--brand-gap": `${0.75 * expandedProgress}rem`,
    "--brand-padding": `${0.375 + expandedProgress * 0.125}rem`,
    "--brand-text-width": `${12 * expandedProgress}rem`,
    "--collapsed-nav-width": `${9 * collapsedNavOpacity}rem`,
    "--collapsed-nav-opacity": collapsedNavOpacity,
    "--expanded-nav-height": `${2.75 * expandedProgress}rem`,
    "--expanded-nav-opacity": expandedNavOpacity,
    "--header-expanded-opacity": expandedProgress,
    "--header-py": `${0.625 + expandedProgress * 0.375}rem`,
    "--header-row-gap": `${1 * expandedProgress}rem`,
    "--header-row-height": `${3.25 + expandedProgress * 0.5}rem`,
    "--logo-size": `${2 + expandedProgress * 0.75}rem`,
  } satisfies HeaderStyle;

  useEffect(() => {
    let animationFrame = 0;

    function updateProgress() {
      animationFrame = 0;
      const nextProgress = clamp(window.scrollY / COLLAPSE_DISTANCE);
      setProgress((current) => (Math.abs(current - nextProgress) < 0.01 ? current : nextProgress));
    }

    function handleScroll() {
      if (animationFrame) {
        return;
      }

      animationFrame = window.requestAnimationFrame(updateProgress);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }

      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    function updateHeaderOffset() {
      const headerElement = headerRef.current;

      if (!headerElement) {
        return;
      }

      document.documentElement.style.setProperty("--app-header-offset", `${headerElement.offsetHeight}px`);
    }

    updateHeaderOffset();

    const headerElement = headerRef.current;

    if (!headerElement) {
      return;
    }

    const resizeObserver = new ResizeObserver(updateHeaderOffset);

    resizeObserver.observe(headerElement);
    window.addEventListener("resize", updateHeaderOffset);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateHeaderOffset);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-border/55 bg-background/94 backdrop-blur-sm" ref={headerRef} style={headerStyle}>
      <div className="mx-auto w-full max-w-6xl px-4 py-[var(--header-py)] sm:px-6 lg:px-10">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-y-[var(--header-row-gap)]">
          <div className="flex h-[var(--header-row-height)] min-w-0 items-center justify-start">
            <Link className="surface-pill flex min-w-0 max-w-full items-center gap-[var(--brand-gap)] rounded-full p-[var(--brand-padding)]" href="/dashboard">
              <Image alt="InsightUp" className="size-[var(--logo-size)] rounded-full" height={44} src="/insightup-logo-rmbg.png" width={44} />
              <div className="min-w-0 max-w-[var(--brand-text-width)] overflow-hidden opacity-[var(--header-expanded-opacity)]">
                <p className="truncate font-display text-xl text-foreground">InsightUp</p>
                <p className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground sm:block">InBody tracker</p>
              </div>
            </Link>
          </div>

          <div
            aria-hidden={!useCollapsedNav}
            className={cn(
              "flex h-[var(--header-row-height)] w-[var(--collapsed-nav-width)] items-center justify-center overflow-hidden opacity-[var(--collapsed-nav-opacity)] transition-opacity duration-150",
              useCollapsedNav ? "pointer-events-auto" : "pointer-events-none",
            )}
          >
            <NavCluster activeTabIndex={useCollapsedNav ? 0 : -1} compact isDashboard={isDashboard} isFriends={isFriends} isRecords={isRecords} />
          </div>

          <div className="flex h-[var(--header-row-height)] min-w-0 items-center justify-end">
            <div className="flex w-[var(--account-zone-width)] justify-end">
              <AccountMenu collapseProgress={progress} user={user} />
            </div>
          </div>

          <div
            aria-hidden={useCollapsedNav}
            className={cn(
              "col-span-3 flex h-[var(--expanded-nav-height)] min-w-0 justify-center overflow-hidden opacity-[var(--expanded-nav-opacity)] transition-opacity duration-150",
              useCollapsedNav ? "pointer-events-none" : "pointer-events-auto",
            )}
          >
            <NavCluster activeTabIndex={useCollapsedNav ? -1 : 0} isDashboard={isDashboard} isFriends={isFriends} isRecords={isRecords} />
          </div>
        </div>
      </div>
    </header>
  );
}
