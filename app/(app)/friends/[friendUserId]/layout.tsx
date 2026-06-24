import type { ReactNode } from "react";
import { FriendViewTransitionShell } from "@/components/friends/friend-view-transition-shell";

type FriendDetailLayoutProps = {
  children: ReactNode;
};

export default function FriendDetailLayout({ children }: FriendDetailLayoutProps) {
  return <FriendViewTransitionShell>{children}</FriendViewTransitionShell>;
}
