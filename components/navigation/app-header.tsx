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
  const showCompactLabel = !compact || active;

  return (
    <Button
      size="sm"
      variant={active ? "default" : "ghost"}
      className={cn(
        compact
          ? "relative isolate w-full justify-center overflow-hidden rounded-full px-2.5 text-sm sm:min-w-0"
          : "relative isolate w-full justify-center overflow-hidden rounded-full sm:min-w-36",
        showPendingBorder && "border border-transparent text-foreground",
      )}
      onClick={() => {
        if (!active && !isPending) startTransition(() => router.push(href));
      }}
      aria-label={label}
      aria-current={active ? "page" : undefined}
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
      <span className={cn(
        "relative z-10 transition-[max-width,opacity,margin] duration-150",
        showPendingBorder && "opacity-85",
        compact && !showCompactLabel && "sr-only",
        compact && showCompactLabel && "ml-1 max-w-16 opacity-100",
      )}>
        {label}
      </span>
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

  useEffect(() => {
    function handleScroll() {
      setIsCollapsed(window.scrollY > 72);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
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

    const resizeObserver = new ResizeObserver(() => {
      updateHeaderOffset();
    });

    resizeObserver.observe(headerElement);
    window.addEventListener("resize", updateHeaderOffset);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateHeaderOffset);
    };
  }, [isCollapsed]);

  return (
    <header className="sticky top-0 z-30 border-b border-border/55 bg-background/94 backdrop-blur-sm" ref={headerRef}>
      <div className={cn("mx-auto flex w-full max-w-6xl flex-col px-4 transition-[gap,padding] duration-200 sm:px-6 lg:px-10", isCollapsed ? "gap-2 py-3" : "gap-4 py-4")}>
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <Link className={cn("surface-pill flex min-w-0 max-w-full items-center rounded-full transition-[gap,padding] duration-200", isCollapsed ? "gap-0 px-2 py-2" : "gap-3 px-3 py-2")} href="/dashboard">
            <Image alt="InsightUp" className={cn("rounded-full transition-[width,height] duration-200", isCollapsed ? "size-9" : "size-10 sm:size-11")} height={44} src="/insightup-logo-rmbg.png" width={44} />
            <div className={cn("min-w-0 overflow-hidden transition-[max-width,opacity] duration-200", isCollapsed ? "max-w-0 opacity-0" : "max-w-48 opacity-100")}>
              <p className="truncate font-display text-xl text-foreground">InsightUp</p>
              <p className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground sm:block">InBody tracker</p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <AccountMenu compact={isCollapsed} user={user} />
          </div>
        </div>

        <div className={cn("surface-pill grid w-full grid-cols-3 rounded-full transition-[gap,padding,width] duration-200 sm:self-center", isCollapsed ? "gap-1 p-1 sm:w-auto sm:inline-flex" : "gap-2 p-1 sm:inline-flex sm:w-fit")}>
          <NavButton compact={isCollapsed} href="/dashboard" label="趨勢" icon={<LayoutDashboard className="size-4" />} active={isDashboard} />
          <NavButton compact={isCollapsed} href="/records" label="紀錄" icon={<Files className="size-4" />} active={isRecords} />
          <NavButton compact={isCollapsed} href="/friends" label="好友" icon={<UsersRound className="size-4" />} active={isFriends} />
        </div>
      </div>
    </header>
  );
}