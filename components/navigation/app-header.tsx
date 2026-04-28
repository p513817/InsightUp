"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Files, LayoutDashboard, UsersRound } from "lucide-react";
import { AccountMenu } from "@/components/navigation/account-menu";
import { Button } from "@/components/ui/button";
import type { AppUserSummary } from "@/lib/presentation";

interface AppHeaderProps {
  user: AppUserSummary;
}

export function AppHeader({ user }: AppHeaderProps) {
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";
  const isRecords = pathname === "/records" || pathname === "/profile";
  const isFriends = pathname === "/friends";

  return (
    <header className="sticky top-0 z-30 border-b border-border/55 bg-background/94 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <Link className="surface-pill flex min-w-0 max-w-full items-center gap-3 rounded-full px-3 py-2" href="/dashboard">
            <Image alt="InsightUp" className="size-10 rounded-full sm:size-11" height={44} src="/insightup-logo-rmbg.png" width={44} />
            <div className="min-w-0">
              <p className="truncate font-display text-xl text-foreground">InsightUp</p>
              <p className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground sm:block">InBody tracker</p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <AccountMenu user={user} />
          </div>
        </div>

        <div className="surface-pill grid w-full grid-cols-3 gap-2 rounded-full p-1 sm:inline-flex sm:w-fit sm:self-center">
          <Button asChild size="sm" variant={isDashboard ? "default" : "ghost"} className="w-full justify-center rounded-full sm:min-w-36">
            <Link href="/dashboard">
              <LayoutDashboard className="size-4" />
              Dashboard
            </Link>
          </Button>
          <Button asChild size="sm" variant={isRecords ? "default" : "ghost"} className="w-full justify-center rounded-full sm:min-w-36">
            <Link href="/records">
              <Files className="size-4" />
              Records
            </Link>
          </Button>
          <Button asChild size="sm" variant={isFriends ? "default" : "ghost"} className="w-full justify-center rounded-full sm:min-w-36">
            <Link href="/friends">
              <UsersRound className="size-4" />
              Friends
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}