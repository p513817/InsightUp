"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Files, LayoutDashboard, Menu, Sparkles, UsersRound, X } from "lucide-react";
import { LogoAnimated } from "@/components/auth/logo-animated";
import { AccountMenu } from "@/components/navigation/account-menu";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";
import type { AppUserSummary } from "@/lib/presentation";

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
  const t = useTranslations();
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const isDashboard = pathname === "/dashboard";
  const isRecords = pathname.startsWith("/records") || pathname === "/profile";
  const isFriends = pathname === "/friends";
  const isSummary = pathname === "/summary";
  const headerStyle: HeaderStyle = {
    "--app-header-translate": isHeaderVisible ? "0%" : "-110%",
    "--brand-gap": "0rem",
    "--logo-size": "2.625rem",
    transitionTimingFunction: isHeaderVisible ? "cubic-bezier(0.16, 1, 0.3, 1)" : "cubic-bezier(0.55, 0, 0.45, 1)",
    transform: "translateY(var(--app-header-translate))",
  };
  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: t("navigation.dashboard.label"),
      description: t("navigation.dashboard.description"),
      icon: <LayoutDashboard className="size-4" />,
      active: isDashboard,
    },
    {
      href: "/records",
      label: t("navigation.records.label"),
      description: t("navigation.records.description"),
      icon: <Files className="size-4" />,
      active: isRecords,
    },
    {
      href: "/friends",
      label: t("navigation.friends.label"),
      description: t("navigation.friends.description"),
      icon: <UsersRound className="size-4" />,
      active: isFriends,
    },
    {
      href: "/summary",
      label: t("navigation.summary.label"),
      description: t("navigation.summary.description"),
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
      } else if (delta > 2 && !isSidebarOpen) {
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
      document.documentElement.style.setProperty("--app-header-sticky-offset", isHeaderVisible ? `${headerElement.offsetHeight}px` : "0px");
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
  }, [isHeaderVisible]);

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b border-border/55 bg-background/94 shadow-[0_8px_22px_rgba(16,35,63,0.08)] backdrop-blur-sm transition-transform duration-[420ms] will-change-transform motion-reduce:transition-none"
        ref={headerRef}
        style={headerStyle}
      >
        <div className="relative mx-auto flex h-[4.25rem] w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="surface-pill flex h-[2.625rem] min-w-0 items-center rounded-full bg-card/78 p-[0.3125rem] shadow-none">
            <button
              aria-label={t("navigation.menu")}
              className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-primary transition hover:bg-primary/7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              onClick={() => setIsSidebarOpen(true)}
              type="button"
            >
              <Menu className="size-5" />
            </button>
          </div>

          <p className="surface-pill pointer-events-none absolute left-1/2 flex h-[2.625rem] max-w-[44vw] -translate-x-1/2 items-center rounded-full bg-card/78 px-4 text-center font-display text-xl leading-none text-foreground shadow-none sm:text-2xl">
            InsightUp
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
        aria-label={t("navigation.mainNav")}
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
              <p className="text-xs text-muted-foreground">{t("navigation.brandTagline")}</p>
            </div>
          </div>
          <Button aria-label={t("navigation.closeMenu")} className="size-10 px-0" onClick={() => setIsSidebarOpen(false)} size="icon" type="button" variant="ghost">
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
