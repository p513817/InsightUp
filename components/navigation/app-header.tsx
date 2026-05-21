"use client";

import { LogoAnimated } from "@/components/auth/logo-animated";
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

const COLLAPSE_AT = 72;
const EXPAND_AT = 4;

type HeaderStyle = CSSProperties & {
  "--account-zone-width": string;
  "--brand-gap": string;
  "--brand-padding": string;
  "--brand-text-width": string;
  "--collapsed-nav-opacity": number;
  "--collapsed-nav-width": string;
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

function NavButton({ href, label, icon, active, compact = false, tabIndex }: NavItem) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const showPendingBorder = isPending && !active;

  return (
    <Button
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={cn(
        "relative isolate shrink-0 justify-center overflow-hidden rounded-full shadow-none hover:translate-y-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-[inset_0_0_0_2px_rgb(var(--brand-sky-50)/0.78)]",
        compact ? "size-9 gap-0 px-0" : "h-9 w-full",
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
    <div className={cn("surface-pill rounded-full p-1", compact ? "inline-flex h-11 items-center gap-1" : "grid h-11 w-full grid-cols-3 gap-2")}>
      <NavButton compact={compact} href="/dashboard" label="趨勢" icon={<LayoutDashboard className="size-4" />} active={isDashboard} tabIndex={activeTabIndex} />
      <NavButton compact={compact} href="/records" label="紀錄" icon={<Files className="size-4" />} active={isRecords} tabIndex={activeTabIndex} />
      <NavButton compact={compact} href="/friends" label="好友" icon={<UsersRound className="size-4" />} active={isFriends} tabIndex={activeTabIndex} />
    </div>
  );
}

export function AppHeader({ user }: AppHeaderProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const collapsedNavRef = useRef<HTMLDivElement>(null);
  const expandedNavRef = useRef<HTMLDivElement>(null);
  const isDashboard = pathname === "/dashboard";
  const isRecords = pathname === "/records" || pathname === "/profile";
  const isFriends = pathname === "/friends";
  const expandedProgress = isCollapsed ? 0 : 1;
  const useCollapsedNav = isCollapsed;
  const headerStyle: HeaderStyle = {
    "--account-zone-width": `${3 + expandedProgress * 1.25}rem`,
    "--brand-gap": `${0.625 * expandedProgress}rem`,
    "--brand-padding": `${0.3125 + expandedProgress * 0.0625}rem`,
    "--brand-text-width": `${10.5 * expandedProgress}rem`,
    "--collapsed-nav-opacity": isCollapsed ? 1 : 0,
    "--collapsed-nav-width": isCollapsed ? "9rem" : "0rem",
    "--expanded-nav-height": `${2.75 * expandedProgress}rem`,
    "--expanded-nav-opacity": isCollapsed ? 0 : 1,
    "--header-expanded-opacity": expandedProgress,
    "--header-py": `${0.5 + expandedProgress * 0.25}rem`,
    "--header-row-gap": `${0.75 * expandedProgress}rem`,
    "--header-row-height": `${3 + expandedProgress * 0.375}rem`,
    "--logo-size": `${1.875 + expandedProgress * 0.5}rem`,
    boxShadow: isCollapsed ? "0 8px 22px rgba(16, 35, 63, 0.09)" : "0 0 0 rgba(16, 35, 63, 0)",
  };

  useEffect(() => {
    let animationFrame = 0;

    function updateCollapsedState() {
      animationFrame = 0;
      setIsCollapsed((current) => {
        if (current) {
          return window.scrollY > EXPAND_AT;
        }

        return window.scrollY >= COLLAPSE_AT;
      });
    }

    function handleScroll() {
      if (animationFrame) {
        return;
      }

      animationFrame = window.requestAnimationFrame(updateCollapsedState);
    }

    updateCollapsedState();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateCollapsedState);

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }

      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateCollapsedState);
    };
  }, []);

  useEffect(() => {
    const activeElement = document.activeElement;

    if (!(activeElement instanceof HTMLElement)) {
      return;
    }

    if (isCollapsed && expandedNavRef.current?.contains(activeElement)) {
      activeElement.blur();
    }

    if (!isCollapsed && collapsedNavRef.current?.contains(activeElement)) {
      activeElement.blur();
    }
  }, [isCollapsed]);

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
    <header className="sticky top-0 z-30 border-b border-border/55 bg-background/94 backdrop-blur-sm transition-[box-shadow] duration-500 ease-out" ref={headerRef} style={headerStyle}>
      <div className="mx-auto w-full max-w-6xl px-4 py-[var(--header-py)] transition-[padding] duration-500 ease-out sm:px-6 lg:px-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-y-[var(--header-row-gap)] transition-[gap] duration-500 ease-out">
          <div className="flex h-[var(--header-row-height)] min-w-0 items-center justify-start transition-[height] duration-500 ease-out">
            <Link className="surface-pill flex min-w-0 max-w-full items-center gap-[var(--brand-gap)] rounded-full p-[var(--brand-padding)] transition-[gap,padding] duration-500 ease-out" href="/dashboard">
              <LogoAnimated className="size-[var(--logo-size)] rounded-full transition-[height,width] duration-500 ease-out" playOnce size={44} />
              <div className="min-w-0 max-w-[var(--brand-text-width)] overflow-hidden opacity-[var(--header-expanded-opacity)] transition-[max-width,opacity] duration-500 ease-out">
                <p className="truncate font-display text-lg text-foreground">InsightUp</p>
                <p className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground">InBody tracker</p>
              </div>
            </Link>
          </div>

          <div
            className={cn(
              "flex h-[var(--header-row-height)] w-[var(--collapsed-nav-width)] items-center justify-center overflow-hidden opacity-[var(--collapsed-nav-opacity)] transition-[height,width,opacity] duration-500 ease-out",
              useCollapsedNav ? "pointer-events-auto" : "pointer-events-none",
            )}
            inert={!useCollapsedNav}
            ref={collapsedNavRef}
          >
            <NavCluster activeTabIndex={useCollapsedNav ? 0 : -1} compact isDashboard={isDashboard} isFriends={isFriends} isRecords={isRecords} />
          </div>

          <div className="flex h-[var(--header-row-height)] min-w-0 items-center justify-end transition-[height] duration-500 ease-out">
            <div className="flex w-[var(--account-zone-width)] justify-end transition-[width] duration-500 ease-out">
              <AccountMenu collapseProgress={isCollapsed ? 1 : 0} user={user} />
            </div>
          </div>

          <div
            className={cn(
              "col-span-3 flex h-[var(--expanded-nav-height)] min-w-0 justify-center overflow-hidden opacity-[var(--expanded-nav-opacity)] transition-[height,opacity] duration-500 ease-out",
              useCollapsedNav ? "pointer-events-none" : "pointer-events-auto",
            )}
            inert={useCollapsedNav}
            ref={expandedNavRef}
          >
            <NavCluster activeTabIndex={useCollapsedNav ? -1 : 0} isDashboard={isDashboard} isFriends={isFriends} isRecords={isRecords} />
          </div>
        </div>
      </div>
    </header>
  );
}
