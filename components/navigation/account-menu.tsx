"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut, Mail, UserRound } from "lucide-react";
import { useLocale, useTranslations, setLocaleCookie, getLocaleLabel } from "@/components/i18n-provider";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { ROUND_ACTION_FEEDBACK_CLASS } from "@/components/ui/floating-action-styles";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { AppUserSummary } from "@/lib/presentation";
import { locales, type Locale } from "@/lib/i18n";

interface AccountMenuProps {
  user: AppUserSummary;
  compact?: boolean;
  collapseProgress?: number;
}

type AccountMenuStyle = CSSProperties & {
  "--account-gap": string;
  "--account-px": string;
  "--account-py": string;
  "--account-avatar-size": string;
  "--account-chevron-width": string;
  "--account-text-width": string;
  "--account-text-opacity": number;
};

function MenuLink({ href, icon, label, onNavigate }: { href: string; icon: ReactNode; label: string; onNavigate: () => void }) {
  return (
    <Link
      className="flex items-center gap-2.5 rounded-[1rem] px-3 py-2.5 text-sm text-foreground transition hover:bg-primary/6"
      href={href}
      onClick={onNavigate}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export function AccountMenu({ user, compact = false, collapseProgress = compact ? 1 : 0 }: AccountMenuProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const progress = Math.min(Math.max(collapseProgress, 0), 1);
  const expandedProgress = compact ? 0 : 1 - progress;
  const isCollapsed = expandedProgress === 0;
  const menuStyle: AccountMenuStyle = {
    "--account-gap": `${0.625 * expandedProgress}rem`,
    "--account-px": isCollapsed ? "0" : `var(--brand-padding)`,
    "--account-py": "0",
    "--account-avatar-size": isCollapsed ? "2rem" : "2.625rem",
    "--account-chevron-width": `${1 * expandedProgress}rem`,
    "--account-text-width": `${11 * expandedProgress}rem`,
    "--account-text-opacity": expandedProgress,
  };

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleSignOut() {
    setIsSigningOut(true);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  function changeLocale(nextLocale: Locale) {
    setLocaleCookie(nextLocale);
    setIsOpen(false);
    router.refresh();
  }

  const feedbackMailto = `mailto:p513817@gmail.com?subject=${encodeURIComponent(t("account.feedbackSubject"))}&body=${encodeURIComponent(t("account.feedbackBody"))}`;

  return (
    <div className="relative" ref={containerRef} style={menuStyle}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={[
          "surface-pill flex items-center justify-center gap-[var(--brand-gap)] rounded-full bg-card/78 cursor-pointer select-none transition-[gap,padding] duration-500 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          ROUND_ACTION_FEEDBACK_CLASS,
          isCollapsed ? "w-[2.625rem] h-[2.625rem] min-w-0 max-w-full p-[0.3125rem]" : "w-[3.25rem] h-[3.25rem] min-w-0 max-w-full p-[0.3125rem]",
        ].join(" ")}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
        style={isCollapsed ? { outline: "none", height: "2.625rem", width: "2.625rem" } : { outline: "none", height: "3.25rem", width: "3.25rem" }}
      >
        <UserAvatar
          avatarUrl={user.avatarUrl}
          className="mx-auto flex h-[var(--account-avatar-size)] w-[var(--account-avatar-size)] items-center justify-center overflow-hidden rounded-full bg-card/78 transition-[height,width] duration-500 ease-out"
          fallbackClassName="text-sm font-semibold text-primary"
          imageClassName="rounded-full bg-card/78"
          loading="eager"
          name={user.name}
        />
      </button>

      {isOpen ? (
        <div className="surface-menu absolute right-0 top-[calc(100%+0.75rem)] z-40 w-auto min-w-max max-w-[calc(100vw-2rem)] overflow-hidden rounded-[1.35rem] p-2">
          <div className="mb-2 rounded-[1rem] border border-border/60 bg-card/80 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{t("account.language")}</p>
            <div className="mt-2 flex gap-2">
              {locales.map((option) => (
                <button
                  key={option}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    locale === option ? "border-primary/40 bg-primary/10 text-foreground" : "border-border/60 bg-card text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => changeLocale(option)}
                  type="button"
                >
                  {getLocaleLabel(option)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 space-y-1">
            <MenuLink href="/account" icon={<UserRound className="size-4" />} label={t("account.title")} onNavigate={() => setIsOpen(false)} />
            <a
              className="flex cursor-pointer items-center gap-2.5 rounded-[1rem] px-3 py-2.5 text-sm text-foreground transition hover:bg-primary/6"
              href={feedbackMailto}
              onClick={() => setIsOpen(false)}
            >
              <span className="text-muted-foreground">
                <Mail className="size-4" />
              </span>
              <span>{t("account.feedback")}</span>
            </a>
            <button
              className="flex w-full items-center gap-2.5 rounded-[1rem] px-3 py-2.5 text-sm text-foreground transition hover:bg-danger/8 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSigningOut}
              onClick={handleSignOut}
              type="button"
            >
              <span className="text-muted-foreground">{isSigningOut ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}</span>
              <span>{isSigningOut ? t("account.signingOut") : t("account.signOut")}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
