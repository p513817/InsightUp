"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LoaderCircle, LogOut, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { AppUserSummary } from "@/lib/presentation";
import { getUserInitials } from "@/lib/presentation";

interface AccountMenuProps {
  user: AppUserSummary;
  compact?: boolean;
}

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

export function AccountMenu({ user, compact = false }: AccountMenuProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
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
    <div className="relative" ref={containerRef}>
      <Button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={compact ? "surface-pill h-auto gap-1.5 rounded-full px-1.5 py-1 hover:bg-card" : "surface-pill h-auto gap-3 rounded-full px-2.5 py-2 hover:bg-card"}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
        variant="ghost"
      >
        {user.avatarUrl && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={user.name}
            className={compact ? "size-8 rounded-full border border-border object-cover" : "size-10 rounded-full border border-border object-cover sm:size-11"}
            onError={() => setImageFailed(true)}
            src={user.avatarUrl}
          />
        ) : (
          <div className={compact ? "surface-avatar-fallback-strong flex size-8 items-center justify-center rounded-full border border-border text-xs font-semibold text-foreground" : "surface-avatar-fallback-strong flex size-10 items-center justify-center rounded-full border border-border text-sm font-semibold text-foreground sm:size-11"}>
            {getUserInitials(user.name)}
          </div>
        )}
        <div className={compact ? "hidden" : "hidden min-w-0 text-right md:block"}>
          <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email || "Signed in with Google"}</p>
        </div>
        <ChevronDown className={`${compact ? "size-3" : "size-4"} text-muted-foreground transition ${isOpen ? "rotate-180" : ""}`} />
      </Button>

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