"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AddFriendDialog } from "@/components/friends/add-friend-dialog";
import { FriendsTable } from "@/components/friends/friends-table";
import { CompactInfoCard } from "@/components/ui/compact-info-card";
import { StatsScrollbarRow } from "@/components/ui/stats-scrollbar-row";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { useLocale, useTranslations } from "@/components/i18n-provider";
import type { FriendSnapshot } from "@/lib/friends/types";
import { formatCompactDate } from "@/lib/presentation";

interface FriendsWorkspaceProps {
  initialFriends: FriendSnapshot[];
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || "Request failed.");
  }

  return response.json() as Promise<T>;
}

function sortFriends(friends: FriendSnapshot[]) {
  return [...friends].sort((left, right) => {
    if (left.latestRecordedAt && right.latestRecordedAt) {
      const leftSnapshotTime = new Date(left.latestRecordedAt).getTime();
      const rightSnapshotTime = new Date(right.latestRecordedAt).getTime();
      return rightSnapshotTime - leftSnapshotTime;
    }

    if (left.latestRecordedAt) {
      return -1;
    }

    if (right.latestRecordedAt) {
      return 1;
    }

    return new Date(right.linkedAt).getTime() - new Date(left.linkedAt).getTime();
  });
}

export function FriendsWorkspace({ initialFriends }: FriendsWorkspaceProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [friends, setFriends] = useState(() => sortFriends(initialFriends));
  const [busyFriendId, setBusyFriendId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const activeSnapshots = friends.filter((friend) => friend.latestRecordedAt).length;
  const freshestFriend = friends.find((friend) => friend.latestRecordedAt);

  async function handleAddFriend(friendCode: string) {
    try {
      const response = await requestJson<{ friend: FriendSnapshot }>("/api/friends", {
        body: JSON.stringify({ friendCode }),
        method: "POST",
      });

      setFriends((current) => sortFriends([...current.filter((entry) => entry.friendUserId !== response.friend.friendUserId), response.friend]));
      toast.success(t("friends.friendAdded"), {
        description: t("friends.friendAddedBody").replace("{name}", response.friend.displayName),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("friends.addFailed"));
      throw error;
    }
  }

  async function handleRemoveFriend(friend: FriendSnapshot) {
    if (!window.confirm(t("friends.removeConfirm").replace("{name}", friend.displayName))) {
      return;
    }

    setBusyFriendId(friend.friendUserId);

    try {
      await requestJson<{ success: boolean }>(`/api/friends/${friend.friendUserId}`, {
        method: "DELETE",
      });
      setFriends((current) => current.filter((entry) => entry.friendUserId !== friend.friendUserId));
      toast.success(t("friends.friendRemoved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("friends.removeFailed"));
    } finally {
      setBusyFriendId(null);
    }
  }

  return (
    <div className="space-y-4 pb-24 sm:space-y-7 sm:pb-28">
      <section>
        <StatsScrollbarRow className="grid grid-cols-3 gap-1.5">
          <CompactInfoCard label={t("friends.title")} minWidthClassName="min-w-0" value={friends.length} />
          <CompactInfoCard label={t("friends.snapshotCount")} minWidthClassName="min-w-0" value={`${activeSnapshots}/${friends.length || 0}`} />
          <CompactInfoCard label={t("friends.latestDate")} minWidthClassName="min-w-0" value={formatCompactDate(freshestFriend?.latestRecordedAt, locale)} />
        </StatsScrollbarRow>
      </section>

      <section className="space-y-2.5 sm:space-y-3">
        <FriendsTable busyFriendId={busyFriendId} friends={friends} onAdd={() => setDialogOpen(true)} onRemove={handleRemoveFriend} />
      </section>

      {friends.length ? (
        <FloatingActionButton
          ariaLabel={t("friends.add")}
          onClick={() => setDialogOpen(true)}
          pressFeedbackClassName="transition-[transform,background-color,opacity,box-shadow] duration-200 active:scale-[0.92] active:rotate-45 active:brightness-95"
          title={t("friends.add")}
        >
          <Plus className="size-7" />
        </FloatingActionButton>
      ) : null}

      <AddFriendDialog onConfirm={handleAddFriend} onOpenChange={setDialogOpen} open={dialogOpen} />
    </div>
  );
}
