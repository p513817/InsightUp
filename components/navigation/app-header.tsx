"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Activity, Files, GitCompareArrows, LayoutDashboard, Menu, Sparkles, UsersRound, UserRound, X } from "lucide-react";
import { LogoAnimated } from "@/components/auth/logo-animated";
import { AccountMenu } from "@/components/navigation/account-menu";
import { Button } from "@/components/ui/button";
import { ROUND_ACTION_FEEDBACK_CLASS } from "@/components/ui/floating-action-styles";
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

const SIDEBAR_NAV_FEEDBACK_MS = 150;
const SIDEBAR_NAV_TRANSITION_MS = 150;
const SIDEBAR_OPEN_FEEDBACK_MS = 150;
const SIDEBAR_CLOSE_FEEDBACK_MS = 150;
const SIDEBAR_PANEL_DURATION_CLASS = "duration-[320ms]";
const SIDEBAR_PANEL_EASE_CLASS = "ease-[cubic-bezier(0.22,1,0.36,1)]";

const sidebarNavClassName = (active: boolean, pending = false) =>
  cn(
    "group flex items-center gap-2.5 rounded-[1.1rem] border px-3 py-3 transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out active:scale-[0.97] active:translate-x-[1px]",
    active
      ? "border-accent/30 bg-accent/14 text-foreground shadow-[0_8px_18px_rgba(43,194,172,0.1)] active:bg-accent/22"
      : "border-transparent bg-transparent text-foreground hover:border-border/60 hover:bg-white/62 active:border-border/70 active:bg-white/78",
    pending ? "scale-[0.985] border-border/70 bg-white/78" : "",
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
  const isRecords = pathname.startsWith("/records") || pathname === "/profile";
  const isFriends = pathname.startsWith("/friends");
  const isSummary = pathname === "/summary";
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
      href: "/summary",
      label: t("navigation.summary.label"),
      description: t("navigation.summary.description"),
      icon: <Sparkles className="size-4" />,
      active: isSummary,
    },
  ];

  function setDashboardTrendMode(nextMode: "overall" | "segmental") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("trend", nextMode);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function setFriendViewMode(nextMode: "trend" | "compare") {
    if (!friendUserId) {
      return;
    }

    const nextPathname = nextMode === "compare" ? `/friends/${friendUserId}/compare` : `/friends/${friendUserId}`;
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

    setPendingNavHref(href);
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
              className={cn(
                `grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-primary hover:bg-primary/7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${ROUND_ACTION_FEEDBACK_CLASS}`,
                isSidebarOpenPending ? "bg-primary/10 scale-[0.92] rotate-90" : "",
              )}
              onClick={handleSidebarOpen}
              type="button"
            >
              <Menu className="size-5" />
            </button>
          </div>

          {isDashboard ? (
            <div
              aria-label={t("navigation.dashboard.label")}
              className="surface-pill absolute left-1/2 grid h-[2.625rem] max-w-[min(32rem,52vw)] -translate-x-1/2 grid-cols-2 gap-1 rounded-full bg-card/78 p-[0.3125rem] shadow-none"
              role="tablist"
            >
              <button
                aria-selected={dashboardTrendMode === "overall"}
                className={cn(
                  "inline-flex h-full items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold transition",
                  dashboardTrendMode === "overall"
                    ? "bg-[linear-gradient(135deg,rgb(var(--primary))_0%,rgb(var(--primary-strong))_100%)] text-primary-foreground shadow-[0_8px_16px_rgba(23,52,93,0.14)]"
                    : "text-muted-foreground hover:bg-primary/7 hover:text-foreground",
                )}
                onClick={() => setDashboardTrendMode("overall")}
                role="tab"
                type="button"
              >
                <Activity className="size-4" />
                <span className="truncate">{t("dashboardTrendUi.overall")}</span>
              </button>
              <button
                aria-selected={dashboardTrendMode === "segmental"}
                className={cn(
                  "inline-flex h-full items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold transition",
                  dashboardTrendMode === "segmental"
                    ? "bg-[linear-gradient(135deg,rgb(var(--primary))_0%,rgb(var(--primary-strong))_100%)] text-primary-foreground shadow-[0_8px_16px_rgba(23,52,93,0.14)]"
                    : "text-muted-foreground hover:bg-primary/7 hover:text-foreground",
                )}
                onClick={() => setDashboardTrendMode("segmental")}
                role="tab"
                type="button"
              >
                <UserRound className="size-4" />
                <span className="truncate">{t("dashboardTrendUi.segmental")}</span>
              </button>
            </div>
          ) : isFriendDetail ? (
            <div
              aria-label={t("navigation.friends.label")}
              className="surface-pill absolute left-1/2 grid h-[2.625rem] max-w-[min(32rem,56vw)] -translate-x-1/2 grid-cols-2 gap-1 rounded-full bg-card/78 p-[0.3125rem] shadow-none"
              role="tablist"
            >
              <button
                aria-selected={friendViewMode === "trend"}
                className={cn(
                  "inline-flex h-full items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold transition",
                  friendViewMode === "trend"
                    ? "bg-[linear-gradient(135deg,rgb(var(--primary))_0%,rgb(var(--primary-strong))_100%)] text-primary-foreground shadow-[0_8px_16px_rgba(23,52,93,0.14)]"
                    : "text-muted-foreground hover:bg-primary/7 hover:text-foreground",
                )}
                onClick={() => setFriendViewMode("trend")}
                role="tab"
                type="button"
              >
                <Activity className="size-4" />
                <span className="truncate">{t("friends.friendTrendTab")}</span>
              </button>
              <button
                aria-selected={friendViewMode === "compare"}
                className={cn(
                  "inline-flex h-full items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold transition",
                  friendViewMode === "compare"
                    ? "bg-[linear-gradient(135deg,rgb(var(--primary))_0%,rgb(var(--primary-strong))_100%)] text-primary-foreground shadow-[0_8px_16px_rgba(23,52,93,0.14)]"
                    : "text-muted-foreground hover:bg-primary/7 hover:text-foreground",
                )}
                onClick={() => setFriendViewMode("compare")}
                role="tab"
                type="button"
              >
                <GitCompareArrows className="size-4" />
                <span className="truncate">{t("friends.compareTab")}</span>
              </button>
            </div>
          ) : (
            <p className="surface-pill pointer-events-none absolute left-1/2 flex h-[2.625rem] max-w-[44vw] -translate-x-1/2 items-center rounded-full bg-card/78 px-4 text-center font-display text-xl leading-none text-foreground shadow-none sm:text-2xl">
              InsightUp
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
          "fixed inset-0 z-50 cursor-pointer bg-[rgb(var(--overlay)/0.2)] backdrop-blur-[1.5px] transition-[opacity,backdrop-filter,background-color] motion-reduce:transition-none",
          SIDEBAR_PANEL_DURATION_CLASS,
          SIDEBAR_PANEL_EASE_CLASS,
          isSidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0 backdrop-blur-0",
          "active:bg-[rgb(var(--overlay)/0.26)]",
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
            "flex items-center justify-between gap-3 border-b border-border/36 px-4 py-3.5 transition-[opacity,transform] motion-reduce:transition-none",
            SIDEBAR_PANEL_DURATION_CLASS,
            SIDEBAR_PANEL_EASE_CLASS,
            isSidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0",
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <LogoAnimated className="size-9 rounded-full" playSignal={sidebarLogoPlaySignal} size={40} />
            <div className="min-w-0">
              <p className="truncate font-display text-lg text-foreground">InsightUp</p>
              <p className="text-xs text-muted-foreground">{t("navigation.brandTagline")}</p>
            </div>
          </div>
          <Button
            aria-label={t("navigation.closeMenu")}
            className={cn(
              "size-10 px-0 transition-[transform,background-color] duration-200",
              isSidebarClosePending
                ? "scale-[0.92] rotate-90 bg-primary/12"
                : "active:scale-[0.92] active:rotate-90 active:bg-primary/12",
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
