import Link from "next/link";
import { LayoutDashboard, UserRound } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AppUserSummary } from "@/lib/presentation";
import { getUserInitials } from "@/lib/presentation";

interface AppHeaderProps {
  user: AppUserSummary;
}

export function AppHeader({ user }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-[#f7f2e8]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-4 lg:px-10">
        <div className="flex items-center gap-4">
          <Link className="flex items-center gap-3" href="/dashboard">
            <div className="flex size-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              IU
            </div>
            <div>
              <p className="font-display text-xl text-foreground">InsightUp</p>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">InBody tracker</p>
            </div>
          </Link>
          <Badge variant="neutral" className="hidden sm:inline-flex">
            Fly.io Ready
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">
              <LayoutDashboard className="size-4" />
              Dashboard
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/profile">
              <UserRound className="size-4" />
              Profile
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email || "Signed in with Google"}</p>
          </div>
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={user.name} className="size-11 rounded-full border border-border object-cover" src={user.avatarUrl} />
          ) : (
            <div className="flex size-11 items-center justify-center rounded-full border border-border bg-[#efe5d4] text-sm font-semibold text-foreground">
              {getUserInitials(user.name)}
            </div>
          )}
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}