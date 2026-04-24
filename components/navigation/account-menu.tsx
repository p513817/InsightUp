"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LoaderCircle, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { AppUserSummary } from "@/lib/presentation";
import { getUserInitials } from "@/lib/presentation";

interface AccountMenuProps {
  user: AppUserSummary;
}

function MenuLink({ href, icon, label, onNavigate }: { href: string; icon: React.ReactNode; label: string; onNavigate: () => void }) {
  return (
    <Link
      className="flex items-center justify-between rounded-[1rem] px-3 py-2.5 text-sm text-foreground transition hover:bg-[rgba(28,54,95,0.06)]"
      href={href}
      onClick={onNavigate}
    >
      <span className="flex items-center gap-2.5">
        <span className="text-muted-foreground">{icon}</span>
        <span>{label}</span>
      </span>
    </Link>
  );
}

export function AccountMenu({ user }: AccountMenuProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

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
        className="h-auto gap-3 rounded-full border border-white/55 bg-white/72 px-2.5 py-2 shadow-[0_8px_18px_rgba(16,35,63,0.06)] hover:bg-white"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
        variant="ghost"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={user.name} className="size-10 rounded-full border border-border object-cover sm:size-11" src={user.avatarUrl} />
        ) : (
          <div className="flex size-10 items-center justify-center rounded-full border border-border bg-[linear-gradient(135deg,rgba(121,215,195,0.42),rgba(28,54,95,0.12))] text-sm font-semibold text-foreground sm:size-11">
            {getUserInitials(user.name)}
          </div>
        )}
        <div className="hidden min-w-0 text-right md:block">
          <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email || "Signed in with Google"}</p>
        </div>
        <ChevronDown className={`size-4 text-muted-foreground transition ${isOpen ? "rotate-180" : ""}`} />
      </Button>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-[1.35rem] border border-white/60 bg-[rgba(255,255,255,0.96)] p-2 shadow-[0_18px_40px_rgba(16,35,63,0.16)] backdrop-blur-sm">
          <div className="rounded-[1rem] border border-border/60 bg-[linear-gradient(180deg,#ffffff_0%,#f5f9fc_100%)] px-3.5 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Account</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{user.name}</p>
            <p className="mt-0.5 break-all text-xs leading-5 text-muted-foreground">{user.email || "Signed in with Google"}</p>
          </div>

          <div className="mt-2 space-y-1">
            <MenuLink href="/account" icon={<UserRound className="size-4" />} label="Accounts" onNavigate={() => setIsOpen(false)} />
            <button
              className="flex w-full items-center justify-between rounded-[1rem] px-3 py-2.5 text-sm text-foreground transition hover:bg-[rgba(184,91,115,0.08)] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSigningOut}
              onClick={handleSignOut}
              type="button"
            >
              <span className="flex items-center gap-2.5">
                <span className="text-muted-foreground">{isSigningOut ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}</span>
                <span>{isSigningOut ? "登出中" : "登出"}</span>
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}