"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LoaderCircle, LogOut, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { AppUserSummary } from "@/lib/presentation";

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

const FEEDBACK_EMAIL = "p513817@gmail.com";
const FEEDBACK_SUBJECT = "[InsightUp] 產品問題回報 / 功能建議";
const FEEDBACK_BODY = "請描述：\n1) 問題或建議\n2) 發生頁面與操作步驟\n3) 期望結果\n4) 畫面截圖（可選）";
const FEEDBACK_MAILTO = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(FEEDBACK_SUBJECT)}&body=${encodeURIComponent(FEEDBACK_BODY)}`;

function MenuLink({ href, icon, label, onNavigate }: { href: string; icon: React.ReactNode; label: string; onNavigate: () => void }) {
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

function getFirstDisplayCharacter(name: string) {
  return Array.from(name.trim())[0]?.toUpperCase() || "I";
}

export function AccountMenu({ user, compact = false, collapseProgress = compact ? 1 : 0 }: AccountMenuProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const progress = Math.min(Math.max(collapseProgress, 0), 1);
  const expandedProgress = compact ? 0 : 1 - progress;
  const isCollapsed = expandedProgress === 0;
  const menuStyle: AccountMenuStyle = {
    "--account-gap": `${0.625 * expandedProgress}rem`,
    "--account-px": isCollapsed ? "0" : `var(--brand-padding)`,
    "--account-py": "0",
    "--account-avatar-size": `var(--logo-size)`,
    "--account-chevron-width": `${1 * expandedProgress}rem`,
    "--account-text-width": `${11 * expandedProgress}rem`,
    "--account-text-opacity": expandedProgress,
  };

  useEffect(() => {
    setImageFailed(false);
    setImageLoaded(false);
  }, [user.avatarUrl]);

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

  return (
    <div className="relative" ref={containerRef} style={menuStyle}>
      <div
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={
          [
            "surface-pill flex items-center justify-center gap-[var(--brand-gap)] rounded-full cursor-pointer select-none transition-[gap,padding] duration-500 ease-out",
            isCollapsed
              ? "w-[2.625rem] h-[2.625rem] min-w-0 max-w-full p-0"
              : "w-[3.25rem] h-[3.25rem] min-w-0 max-w-full p-0"
          ].join(" ")
        }
        onClick={() => setIsOpen((current) => !current)}
        tabIndex={0}
        role="button"
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsOpen(current => !current);
          }
        }}
        style={isCollapsed
          ? { outline: 'none', height: '2.625rem', width: '2.625rem' }
          : { outline: 'none', height: '3.25rem', width: '3.25rem' }
        }
      >
        <div className="flex items-center justify-center rounded-full bg-background transition-[height,width] duration-500 ease-out w-[var(--logo-size)] h-[var(--logo-size)] mx-auto">
          {(!user.avatarUrl || imageFailed)
            ? <span className="text-base font-semibold text-primary">{getFirstDisplayCharacter(user.name)}</span>
            : <img
                alt={user.name}
                className="w-full h-full rounded-full object-cover bg-background"
                onError={() => setImageFailed(true)}
                onLoad={() => setImageLoaded(true)}
                src={user.avatarUrl}
              />
          }
        </div>
      </div>

      {isOpen ? (
        <div className="surface-menu absolute right-0 top-[calc(100%+0.75rem)] z-40 w-auto min-w-max max-w-[calc(100vw-2rem)] overflow-hidden rounded-[1.35rem] p-2">
          <div className="mt-2 space-y-1">
            <MenuLink href="/account" icon={<UserRound className="size-4" />} label="個人資訊" onNavigate={() => setIsOpen(false)} />
            <a
              className="flex cursor-pointer items-center gap-2.5 rounded-[1rem] px-3 py-2.5 text-sm text-foreground transition hover:bg-primary/6"
              href={FEEDBACK_MAILTO}
              onClick={() => setIsOpen(false)}
            >
              <span className="text-muted-foreground">
                <Mail className="size-4" />
              </span>
              <span>問題回饋</span>
            </a>
            <button
              className="flex w-full items-center gap-2.5 rounded-[1rem] px-3 py-2.5 text-sm text-foreground transition hover:bg-danger/8 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSigningOut}
              onClick={handleSignOut}
              type="button"
            >
              <span className="text-muted-foreground">{isSigningOut ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}</span>
              <span>{isSigningOut ? "登出中" : "登出"}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
