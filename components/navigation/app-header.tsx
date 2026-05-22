"use client";

import { LogoAnimated } from "@/components/auth/logo-animated";
import { AccountMenu } from "@/components/navigation/account-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AppUserSummary } from "@/lib/presentation";
import { Files, LayoutDashboard, Menu, Sparkles, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";

interface AppHeaderProps {
  user: AppUserSummary;
}

type HeaderStyle = CSSProperties & {
  "--app-header-translate": string;
  "--brand-gap": string;
  "--logo-size": string;
};

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: ReactNode;
  active: boolean;
};

const sidebarNavClassName = (active: boolean) =>
  cn(
    "group flex items-center gap-2.5 rounded-[1.1rem] border px-3 py-3 transition",
    active
      ? "border-accent/30 bg-accent/14 text-foreground shadow-[0_8px_18px_rgba(43,194,172,0.1)]"
      : "border-transparent bg-transparent text-foreground hover:border-border/60 hover:bg-white/62",
  );

function SidebarNavContent({ active, description, icon, label }: Pick<NavItem, "active" | "description" | "icon" | "label">) {
  return (
    <>
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full transition",
          active ? "bg-white/78 text-accent-strong shadow-[inset_0_0_0_1px_rgb(var(--accent)/0.2)]" : "bg-white/62 text-muted-foreground group-hover:bg-white group-hover:text-primary",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">{label}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{description}</span>
      </span>
    </>
  );
}

function SidebarNavLink({ active, description, href, icon, label, onNavigate }: NavItem & { onNavigate: () => void }) {
  return (
    <Link aria-current={active ? "page" : undefined} className={sidebarNavClassName(active)} href={href} onClick={onNavigate}>
      <SidebarNavContent active={active} description={description} icon={icon} label={label} />
    </Link>
  );
}

export function AppHeader({ user }: AppHeaderProps) {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const isDashboard = pathname === "/dashboard";
  const isRecords = pathname === "/records" || pathname === "/profile";
  const isFriends = pathname === "/friends";
  const isAccount = pathname === "/account";
  const isSummary = pathname === "/summary";
  const currentPageLabel = isDashboard ? "趨勢" : isFriends ? "朋友" : isAccount ? "帳號資訊" : isSummary ? "AI 摘要" : "紀錄";
  const headerStyle: HeaderStyle = {
    "--app-header-translate": isHeaderVisible ? "0%" : "-110%",
    "--brand-gap": "0rem",
    "--logo-size": "2.625rem",
    transform: "translateY(var(--app-header-translate))",
  };
  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "趨勢",
      description: "查看圖表與近期變化",
      icon: <LayoutDashboard className="size-4" />,
      active: isDashboard,
    },
    {
      href: "/records",
      label: "紀錄",
      description: "新增、編輯與管理分析資料",
      icon: <Files className="size-4" />,
      active: isRecords,
    },
    {
      href: "/friends",
      label: "朋友",
      description: "管理好友與查看快照",
      icon: <UsersRound className="size-4" />,
      active: isFriends,
    },
    {
      href: "/summary",
      label: "AI 摘要",
      description: "查看近期趨勢分析",
      icon: <Sparkles className="size-4" />,
      active: isSummary,
    },
  ];

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let animationFrame = 0;

    function updateHeaderVisibility() {
      animationFrame = 0;
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;

      if (currentScrollY < 12 || delta < -6) {
        setIsHeaderVisible(true);
      } else if (delta > 6 && currentScrollY > 80 && !isSidebarOpen) {
        setIsHeaderVisible(false);
      }

      lastScrollY = Math.max(currentScrollY, 0);
    }

    function handleScroll() {
      if (animationFrame) {
        return;
      }

      animationFrame = window.requestAnimationFrame(updateHeaderVisibility);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }

      window.removeEventListener("scroll", handleScroll);
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    if (!isSidebarOpen) {
      return;
    }

    setIsHeaderVisible(true);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.paddingRight = previousBodyPaddingRight;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSidebarOpen]);

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
    <>
      <header
        className="sticky top-0 z-40 border-b border-border/55 bg-background/94 shadow-[0_8px_22px_rgba(16,35,63,0.08)] backdrop-blur-sm transition-transform duration-300 ease-out"
        ref={headerRef}
        style={headerStyle}
      >
        <div className="relative mx-auto flex h-[4.25rem] w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="surface-pill flex min-w-0 items-center gap-2 rounded-full bg-card/78 px-2 py-1.5 pr-4 shadow-none">
            <button
              aria-label="開啟側邊選單"
              className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-primary transition hover:bg-primary/7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              onClick={() => setIsSidebarOpen(true)}
              type="button"
            >
              <Menu className="size-5" />
            </button>
            <div className="h-5 w-px bg-border/70" />
            <p className="truncate font-display text-lg leading-5 text-foreground">{currentPageLabel}</p>
          </div>

          <p className="pointer-events-none absolute left-1/2 max-w-[44vw] -translate-x-1/2 truncate text-center font-display text-xl leading-none text-foreground sm:text-2xl">
            Insight Up
          </p>

          <div className="flex shrink-0 justify-end">
            <AccountMenu compact user={user} />
          </div>
        </div>
      </header>

      <div
        aria-hidden={!isSidebarOpen}
        className={cn(
          "fixed inset-0 z-50 bg-[rgb(var(--overlay)/0.16)] transition-opacity duration-150 ease-out",
          isSidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside
        aria-label="主要導覽"
        className={cn(
          "fixed left-0 top-0 z-50 flex h-dvh w-[min(16.5rem,calc(100vw-2rem))] flex-col overflow-hidden border-r border-border/55 bg-[rgb(var(--card)/0.98)] shadow-[12px_0_30px_rgba(16,35,63,0.1)] transition-transform duration-[180ms] ease-out will-change-transform",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/36 px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <LogoAnimated className="size-9 rounded-full" playOnce size={40} />
            <div className="min-w-0">
              <p className="truncate font-display text-lg text-foreground">InsightUp</p>
              <p className="text-xs text-muted-foreground">InBody tracker</p>
            </div>
          </div>
          <Button aria-label="關閉側邊選單" className="size-10 px-0" onClick={() => setIsSidebarOpen(false)} size="icon" type="button" variant="ghost">
            <X className="size-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
          {navItems.map((item) => (
            <SidebarNavLink key={item.href} {...item} onNavigate={() => setIsSidebarOpen(false)} />
          ))}
        </nav>
      </aside>
    </>
  );
}
