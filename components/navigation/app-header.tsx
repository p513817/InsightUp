"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Files, LayoutDashboard, UsersRound } from "lucide-react";
import { AccountMenu } from "@/components/navigation/account-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AppUserSummary } from "@/lib/presentation";

interface AppHeaderProps {
  user: AppUserSummary;
}

const COLLAPSE_SCROLL_Y = 112;
const EXPAND_SCROLL_Y = 8;

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  compact?: boolean;
};

function NavButton({ href, label, icon, active, compact = false }: NavItem) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const showPendingBorder = isPending && !active;

  return (
    <Button
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={cn(
        compact
          ? "relative isolate size-9 shrink-0 overflow-hidden rounded-full px-0 sm:size-10"
          : "relative isolate w-full justify-center overflow-hidden rounded-full sm:min-w-36",
        showPendingBorder && "border border-transparent text-foreground",
      )}
      onClick={() => {
        if (!active && !isPending) startTransition(() => router.push(href));
      }}
      size="sm"
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

      <span className={cn("relative z-10 size-4", showPendingBorder && "opacity-90")}>{icon}</span>
      {!compact ? (
        <span className={cn("relative z-10", showPendingBorder && "opacity-85")}>
          {label}
        </span>
      ) : null}
    </Button>
  );
}

export function AppHeader({ user }: AppHeaderProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const isDashboard = pathname === "/dashboard";
  const isRecords = pathname === "/records" || pathname === "/profile";
  const isFriends = pathname === "/friends";
  const navCluster = (
    <div
      className={cn(
        "surface-pill rounded-full transition-[gap,padding,width] duration-1000 ease-out",
        isCollapsed ? "inline-flex h-11 items-center gap-1 p-1" : "grid h-11 w-full grid-cols-3 gap-2 p-1 sm:inline-flex sm:w-fit",
      )}
    >
      <NavButton compact={isCollapsed} href="/dashboard" label="趨勢" icon={<LayoutDashboard className="size-4" />} active={isDashboard} />
      <NavButton compact={isCollapsed} href="/records" label="紀錄" icon={<Files className="size-4" />} active={isRecords} />
      <NavButton compact={isCollapsed} href="/friends" label="好友" icon={<UsersRound className="size-4" />} active={isFriends} />
    </div>
  );

  useEffect(() => {
    let animationFrame = 0;

    function handleScroll() {
      if (animationFrame) {
        return;
      }

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        setIsCollapsed((current) => {
          if (current) {
            return window.scrollY > EXPAND_SCROLL_Y;
          }

          return window.scrollY > COLLAPSE_SCROLL_Y;
        });
      });
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
  }, [isCollapsed]);

  return (
    <header className="sticky top-0 z-30 border-b border-border/55 bg-background/94 backdrop-blur-sm" ref={headerRef}>
      <div className={cn("mx-auto w-full max-w-6xl px-4 transition-[padding] duration-500 ease-out sm:px-6 lg:px-10", isCollapsed ? "py-2.5" : "py-4")}>
        {isCollapsed ? (
          <div className="flex min-h-[3.25rem] items-center justify-between gap-2.5">
            <Link aria-label="InsightUp" className="surface-pill flex shrink-0 items-center rounded-full p-1.5" href="/dashboard">
              <Image alt="InsightUp" className="size-8 rounded-full" height={32} src="/insightup-logo-rmbg.png" width={32} />
            </Link>

            <div className="flex min-w-0 flex-1 justify-center overflow-hidden">{navCluster}</div>

            <div className="flex shrink-0 items-center">
              <AccountMenu compact user={user} />
            </div>
          </div>
        ) : (
          <div className="flex min-h-[5.5rem] flex-col gap-4">
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <Link className="surface-pill flex min-w-0 max-w-full items-center gap-3 rounded-full px-3 py-2" href="/dashboard">
                <Image alt="InsightUp" className="size-10 rounded-full sm:size-11" height={44} src="/insightup-logo-rmbg.png" width={44} />
                <div className="min-w-0 max-w-48 overflow-hidden opacity-100">
                  <p className="truncate font-display text-xl text-foreground">InsightUp</p>
                  <p className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground sm:block">InBody tracker</p>
                </div>
              </Link>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <AccountMenu user={user} />
              </div>
            </div>

            <div className="sm:self-center">{navCluster}</div>
          </div>
        )}
      </div>
    </header>
  );
}
