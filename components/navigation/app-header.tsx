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
    <header className="sticky top-0 z-30 border-b border-border/70 bg-[#f7f2e8]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between gap-4">
          <Link className="flex min-w-0 items-center gap-3" href="/dashboard">
            <Image alt="InsightUp" className="size-10 rounded-full sm:size-11" height={44} src="/insightup-logo-rmbg.png" width={44} />
            <div className="min-w-0">
              <p className="truncate font-display text-xl text-foreground">InsightUp</p>
              <p className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground sm:block">InBody tracker</p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={user.name} className="size-10 rounded-full border border-border object-cover sm:size-11" src={user.avatarUrl} />
            ) : (
              <div className="flex size-10 items-center justify-center rounded-full border border-border bg-[#efe5d4] text-sm font-semibold text-foreground sm:size-11">
                {getUserInitials(user.name)}
              </div>
            )}
            <div className="hidden text-right md:block">
              <p className="text-sm font-semibold text-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email || "Signed in with Google"}</p>
            </div>
            <SignOutButton />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-full border border-border/80 bg-card/70 p-1 sm:inline-flex sm:w-fit sm:self-center">
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