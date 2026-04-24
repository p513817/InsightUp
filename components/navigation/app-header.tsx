"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UserRound } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import type { AppUserSummary } from "@/lib/presentation";
import { getUserInitials } from "@/lib/presentation";

interface AppHeaderProps {
  user: AppUserSummary;
}

export function AppHeader({ user }: AppHeaderProps) {
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";
  const isProfile = pathname === "/profile";

  return (
    <header className="sticky top-0 z-30 border-b border-white/45 bg-[rgba(237,244,248,0.94)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <Link className="flex min-w-0 max-w-full items-center gap-3 rounded-full border border-white/55 bg-white/72 px-3 py-2 shadow-[0_8px_18px_rgba(16,35,63,0.06)]" href="/dashboard">
            <Image alt="InsightUp" className="size-10 rounded-full sm:size-11" height={44} src="/insightup-logo-rmbg.png" width={44} />
            <div className="min-w-0">
              <p className="truncate font-display text-xl text-foreground">InsightUp</p>
              <p className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground sm:block">InBody tracker</p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={user.name} className="size-10 rounded-full border border-border object-cover sm:size-11" src={user.avatarUrl} />
            ) : (
              <div className="flex size-10 items-center justify-center rounded-full border border-border bg-[linear-gradient(135deg,rgba(121,215,195,0.42),rgba(28,54,95,0.12))] text-sm font-semibold text-foreground sm:size-11">
                {getUserInitials(user.name)}
              </div>
            )}
            <div className="hidden rounded-full border border-white/55 bg-white/72 px-4 py-2 text-right shadow-[0_8px_18px_rgba(16,35,63,0.06)] md:block">
              <p className="text-sm font-semibold text-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email || "Signed in with Google"}</p>
            </div>
            <SignOutButton />
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 rounded-full border border-white/55 bg-white/74 p-1 shadow-[0_8px_18px_rgba(16,35,63,0.06)] sm:inline-flex sm:w-fit sm:self-center">
          <Button asChild size="sm" variant={isDashboard ? "default" : "ghost"} className="w-full justify-center rounded-full sm:min-w-36">
            <Link href="/dashboard">
              <LayoutDashboard className="size-4" />
              Dashboard
            </Link>
          </Button>
          <Button asChild size="sm" variant={isProfile ? "default" : "ghost"} className="w-full justify-center rounded-full sm:min-w-36">
            <Link href="/profile">
              <UserRound className="size-4" />
              Profile
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}