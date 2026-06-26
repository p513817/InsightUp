"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Activity, Files, GitCompareArrows, LayoutDashboard, Menu, Sparkles, Target, Trophy, UsersRound, UserRound, X } from "lucide-react";
import { LogoAnimated } from "@/components/auth/logo-animated";
import { AccountMenu } from "@/components/navigation/account-menu";
import { Button } from "@/components/ui/button";
import { SegmentedSwitch } from "@/components/ui/segmented-switch";
import { useTranslations } from "@/components/i18n-provider";
import { startContentTransitionFeedback, startRouteTransitionFeedback } from "@/lib/route-transition-feedback";
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

const SIDEBAR_NAV_FEEDBACK_MS = 150;
const SIDEBAR_NAV_TRANSITION_MS = 150;
const SIDEBAR_OPEN_FEEDBACK_MS = 40;
const SIDEBAR_CLOSE_FEEDBACK_MS = 150;
const SIDEBAR_PANEL_DURATION_CLASS = "duration-[240ms]";
const SIDEBAR_PANEL_EASE_CLASS = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const SIDEBAR_ROUND_BUTTON_PRESS_CLASS =
  "transition-[transform,background-color,box-shadow] duration-150 ease-out active:scale-[0.9] active:rotate-6 active:bg-primary/12 active:shadow-[inset_0_0_0_1px_rgb(var(--primary)/0.12)]";

const sidebarNavClassName = (active: boolean, pending = false) =>
  cn(
    "group flex items-center gap-2.5 rounded-[1.1rem] border px-3 py-3 transition-[background-color,border-color,box-shadow,transform,filter] duration-150 ease-out active:scale-[0.982] active:brightness-[0.98]",
    active
      ? "border-accent/30 bg-accent/14 text-foreground shadow-[0_8px_18px_rgba(43,194,172,0.1)] active:border-accent/42 active:bg-accent/24"
      : "border-transparent bg-transparent text-foreground hover:border-border/60 hover:bg-white/62 active:border-border/70 active:bg-white/82",
    pending ? "scale-[0.982] border-accent/32 bg-accent/12 shadow-[0_8px_18px_rgba(43,194,172,0.08)] brightness-[0.98]" : "",
  );

function SidebarNavContent({ active, description, icon, label }: Pick<NavItem, "active" | "description" | "icon" | "label">) {
  return (
    <>
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full transition",
          active
            ? "bg-white/78 text-accent-strong shadow-[inset_0_0_0_1px_rgb(var(--accent)/0.2)] group-active:scale-[0.94]"
            : "bg-white/62 text-muted-foreground group-hover:bg-white group-hover:text-primary group-active:scale-[0.94] group-active:bg-white/90",
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

function SidebarNavLink({
  active,
  description,
  href,
  icon,
  label,
  onNavigate,
  pending,
}: NavItem & { onNavigate: (href: string) => void; pending?: boolean }) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={sidebarNavClassName(active, pending)}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(href);
      }}
    >
      <SidebarNavContent active={active} description={description} icon={icon} label={label} />
    </Link>
  );
}

export function AppHeader({ user }: AppHeaderProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const headerRef = useRef<HTMLElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarOpenPending, setIsSidebarOpenPending] = useState(false);
  const [isSidebarClosePending, setIsSidebarClosePending] = useState(false);
  const [sidebarLogoPlaySignal, setSidebarLogoPlaySignal] = useState(0);
  const [pendingNavHref, setPendingNavHref] = useState<string | null>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const isDashboard = pathname === "/dashboard";
  const isRecords = pathname.startsWith("/records");
  const isFriends = pathname.startsWith("/friends");
  const isCompetitions = pathname.startsWith("/competitions");
  const isPersonalGoal = pathname.startsWith("/personal-goal");
  const isSummary = pathname === "/summary";
  const isAccount = pathname === "/account" || pathname === "/profile";
  const isShare = pathname === "/share";
  const dashboardTrendMode = searchParams.get("trend") === "segmental" ? "segmental" : "overall";
  const friendDetailMatch = pathname.match(/^\/friends\/([^/]+)(?:\/compare)?$/);
  const friendUserId = friendDetailMatch?.[1] ?? null;
  const isFriendDetail = Boolean(friendUserId);
  const friendViewMode = pathname.endsWith("/compare") ? "compare" : "trend";
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
      href: "/competitions",
      label: t("navigation.competitions.label"),
      description: t("navigation.competitions.description"),
      icon: <Trophy className="size-4" />,
      active: isCompetitions,
    },
    {
      href: "/personal-goal",
      label: t("navigation.personal_goal.label"),
      description: t("navigation.personal_goal.description"),
      icon: <Target className="size-4" />,
      active: isPersonalGoal,
    },
    {
      href: "/summary",
      label: t("navigation.summary.label"),
      description: t("navigation.summary.description"),
      icon: <Sparkles className="size-4" />,
      active: isSummary,
    },
  ];
  const activePageLabel =
    navItems.find((item) => item.active)?.label
    ?? (isAccount ? t("account.title") : null)
    ?? (isShare ? t("shareTrend.title") : null)
    ?? "InsightUp";

  function setDashboardTrendMode(nextMode: "overall" | "segmental") {
    if (nextMode === dashboardTrendMode) {
      return;
    }

    startRouteTransitionFeedback();
    const params = new URLSearchParams(searchParams.toString());

    if (nextMode === "segmental") {
      params.set("trend", "segmental");
    } else {
      params.delete("trend");
    }

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }

  function setFriendViewMode(nextMode: "trend" | "compare") {
    if (!friendUserId || nextMode === friendViewMode) {
      return;
    }

    const nextPathname = nextMode === "compare" ? `/friends/${friendUserId}/compare` : `/friends/${friendUserId}`;
    startRouteTransitionFeedback();
    router.replace(nextPathname, { scroll: false });
  }

  useEffect(() => {
    setIsSidebarOpen(false);
    setIsSidebarOpenPending(false);
    setIsSidebarClosePending(false);
    setPendingNavHref(null);
  }, [pathname]);

  function handleSidebarOpen() {
    if (isSidebarOpen || isSidebarOpenPending) {
      return;
    }

    setIsSidebarOpenPending(true);
    window.setTimeout(() => {
      setIsSidebarOpen(true);
      setIsSidebarOpenPending(false);
    }, SIDEBAR_OPEN_FEEDBACK_MS);
  }

  function handleSidebarNavigate(href: string) {
    if (pendingNavHref) {
      return;
    }

    if (href === pathname) {
      setIsSidebarOpen(false);
      return;
    }

    setPendingNavHref(href);
    startRouteTransitionFeedback();
    startContentTransitionFeedback();

    window.setTimeout(() => {
      setIsSidebarOpen(false);

      window.setTimeout(() => {
        router.push(href);
        setPendingNavHref(null);
      }, SIDEBAR_NAV_TRANSITION_MS);
    }, SIDEBAR_NAV_FEEDBACK_MS);
  }

  function handleSidebarClose() {
    if (!isSidebarOpen || isSidebarClosePending) {
      return;
    }

    setIsSidebarClosePending(true);
    window.setTimeout(() => {
      setIsSidebarOpen(false);
      setIsSidebarClosePending(false);
    }, SIDEBAR_CLOSE_FEEDBACK_MS);
  }

  useEffect(() => {
    if (!isSidebarOpen) {
      setIsSidebarOpenPending(false);
      setIsSidebarClosePending(false);
      return;
    }

    setSidebarLogoPlaySignal((current) => current + 1);
  }, [isSidebarOpen]);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let animationFrame = 0;

    function updateHeaderVisibility() {
      animationFrame = 0;
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;

      if (currentScrollY < 12 || delta < -6) {
        setIsHeaderVisible(true);
        document.documentElement.dataset.scrollDirection = "up";
      } else if (delta > 2 && !isSidebarOpen) {
        setIsHeaderVisible(false);
        document.documentElement.dataset.scrollDirection = "down";
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

      delete document.documentElement.dataset.scrollDirection;
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
        className="sticky top-0 z-40 border-b border-border/55 bg-background/94 shadow-[0_6px_18px_rgba(16,35,63,0.07)] backdrop-blur-sm transition-transform duration-[420ms] will-change-transform motion-reduce:transition-none"
        ref={headerRef}
        style={headerStyle}
      >
        <div className="relative mx-auto flex h-[3.75rem] w-full max-w-[30rem] items-center justify-between gap-3 px-4 sm:px-5">
          <div className="surface-pill flex h-[2.625rem] min-w-0 items-center rounded-full bg-card/78 p-[0.3125rem] shadow-none">
            <button
              aria-label={t("navigation.menu")}
              className={cn(
                `grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-primary hover:bg-primary/7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${SIDEBAR_ROUND_BUTTON_PRESS_CLASS}`,
                isSidebarOpenPending ? "scale-[0.9] rotate-45 bg-primary/12 shadow-[inset_0_0_0_1px_rgb(var(--primary)/0.12)]" : "",
              )}
              onClick={handleSidebarOpen}
              type="button"
            >
              <Menu className="size-5" />
            </button>
          </div>

          {isDashboard ? (
            <SegmentedSwitch
              ariaLabel={t("navigation.dashboard.label")}
              className="max-w-[min(32rem,52vw)]"
              items={[
                {
                  icon: <Activity className="size-4" />,
                  label: t("dashboardTrendUi.overall"),
                  value: "overall",
                },
                {
                  icon: <UserRound className="size-4" />,
                  label: t("dashboardTrendUi.segmental"),
                  value: "segmental",
                },
              ]}
              onValueChange={(nextValue) => setDashboardTrendMode(nextValue === "segmental" ? "segmental" : "overall")}
              value={dashboardTrendMode}
            />
          ) : isFriendDetail ? (
            <SegmentedSwitch
              ariaLabel={t("navigation.friends.label")}
              className="max-w-[min(32rem,56vw)]"
              items={[
                {
                  icon: <Activity className="size-4" />,
                  label: t("friends.overviewTab"),
                  value: "trend",
                },
                {
                  icon: <GitCompareArrows className="size-4" />,
                  label: t("friends.compareTab"),
                  value: "compare",
                },
              ]}
              onValueChange={(nextValue) => setFriendViewMode(nextValue === "compare" ? "compare" : "trend")}
              value={friendViewMode}
            />
          ) : (
            <p
              className="surface-pill pointer-events-none absolute left-1/2 flex h-[2.625rem] max-w-[52vw] -translate-x-1/2 items-center rounded-full bg-card/78 px-4 text-center text-[1.08rem] font-semibold leading-none text-foreground shadow-none sm:max-w-[58vw] sm:text-xl"
            >
              <span className="truncate">{activePageLabel}</span>
            </p>
          )}

          <div className="flex shrink-0 justify-end">
            <AccountMenu compact user={user} />
          </div>
        </div>
      </header>

      <div
        aria-hidden={!isSidebarOpen}
        className={cn(
          "fixed inset-0 z-50 cursor-pointer bg-[rgb(var(--overlay)/0.16)] backdrop-blur-[0.75px] transition-[opacity,backdrop-filter,background-color] motion-reduce:transition-none",
          SIDEBAR_PANEL_DURATION_CLASS,
          SIDEBAR_PANEL_EASE_CLASS,
          isSidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0 backdrop-blur-0",
          "active:bg-[rgb(var(--overlay)/0.22)]",
        )}
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside
        aria-label={t("navigation.mainNav")}
        className={cn(
          "fixed left-0 top-0 z-50 flex h-dvh w-[min(16.5rem,calc(100vw-2rem))] flex-col overflow-hidden border-r border-border/55 bg-[rgb(var(--card)/0.98)] shadow-[12px_0_30px_rgba(16,35,63,0.1)] transition-[transform,opacity] will-change-transform motion-reduce:transition-none",
          SIDEBAR_PANEL_DURATION_CLASS,
          SIDEBAR_PANEL_EASE_CLASS,
          isSidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-[104%] opacity-95",
        )}
      >
        <div
          className={cn(
            "flex h-[3.75rem] items-center justify-between gap-3 border-b border-border/36 px-4 transition-[opacity,transform] motion-reduce:transition-none",
            SIDEBAR_PANEL_DURATION_CLASS,
            SIDEBAR_PANEL_EASE_CLASS,
            isSidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0",
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <LogoAnimated className="size-9 rounded-full" playSignal={sidebarLogoPlaySignal} size={40} />
            <div className="min-w-0">
              <p className="truncate font-display text-lg leading-none text-foreground">InsightUp</p>
            </div>
          </div>
          <Button
            aria-label={t("navigation.closeMenu")}
            className={cn(
              `size-10 px-0 ${SIDEBAR_ROUND_BUTTON_PRESS_CLASS}`,
              isSidebarClosePending
                ? "scale-[0.9] rotate-45 bg-primary/12 shadow-[inset_0_0_0_1px_rgb(var(--primary)/0.12)]"
                : "active:rotate-45",
            )}
            onClick={handleSidebarClose}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="size-5" />
          </Button>
        </div>

        <nav
          className={cn(
            "flex-1 space-y-1.5 overflow-y-auto px-3 py-3 transition-[opacity,transform] motion-reduce:transition-none",
            SIDEBAR_PANEL_DURATION_CLASS,
            SIDEBAR_PANEL_EASE_CLASS,
            isSidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0",
          )}
        >
          {navItems.map((item) => (
            <SidebarNavLink key={item.href} {...item} onNavigate={handleSidebarNavigate} pending={pendingNavHref === item.href} />
          ))}
        </nav>
      </aside>

    </>
  );
}
