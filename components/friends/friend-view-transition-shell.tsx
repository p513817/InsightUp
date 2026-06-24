"use client";

import type { ReactNode } from "react";
import { ContentTransitionShell } from "@/components/ui/content-transition-shell";

type FriendViewTransitionShellProps = {
  children: ReactNode;
};

export function FriendViewTransitionShell({ children }: FriendViewTransitionShellProps) {
  return (
    <ContentTransitionShell mode="event" waitForPathnameChange>
      {children}
    </ContentTransitionShell>
  );
}
