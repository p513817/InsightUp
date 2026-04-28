"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AddFriendDialog } from "@/components/friends/add-friend-dialog";
import { FriendsTable } from "@/components/friends/friends-table";
import { Button } from "@/components/ui/button";
import type { FriendSnapshot } from "@/lib/friends/types";
import { formatLongDate } from "@/lib/presentation";

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
    const leftValue = new Date(left.latestRecordedAt || left.linkedAt).getTime();
    const rightValue = new Date(right.latestRecordedAt || right.linkedAt).getTime();
    return rightValue - leftValue;
  });
}

export function FriendsWorkspace({ initialFriends }: FriendsWorkspaceProps) {
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
      toast.success("好友已加入。", {
        description: `${response.friend.displayName} 的最新 InBody 資訊已加入清單。`,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "新增好友失敗。");
      throw error;
    }
  }

  async function handleRemoveFriend(friend: FriendSnapshot) {
    if (!window.confirm(`確定要從清單移除 ${friend.displayName} 嗎？`)) {
      return;
    }

    setBusyFriendId(friend.friendUserId);

    try {
      await requestJson<{ success: boolean }>(`/api/friends/${friend.friendUserId}`, {
        method: "DELETE",
      });
      setFriends((current) => current.filter((entry) => entry.friendUserId !== friend.friendUserId));
      toast.success("好友已移除。");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "移除好友失敗。");
    } finally {
      setBusyFriendId(null);
    }
  }

  return (
    <div className="space-y-5 sm:space-y-8">
      <section className="relative p-1 sm:p-2">
        <div className="relative z-10 mx-auto max-w-5xl space-y-4 sm:space-y-5">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-[1.2fr_0.9fr_0.9fr]">
              <div className="surface-glass-card min-w-[8.75rem] shrink-0 rounded-[0.875rem] px-3 py-3 sm:min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Network</p>
              <p className="mt-1 font-display text-[1.2rem] leading-tight text-foreground sm:text-[1.35rem]">{friends.length}</p>
            </div>
              <div className="surface-soft-card min-w-[7.25rem] shrink-0 rounded-[0.875rem] px-3 py-3 sm:min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Snapshots</p>
                <p className="mt-1 font-display text-[1.2rem] leading-tight text-foreground sm:text-[1.35rem]">{activeSnapshots}/{friends.length || 0}</p>
              </div>
              <div className="surface-soft-card min-w-[7.25rem] shrink-0 rounded-[0.875rem] px-3 py-3 sm:min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Freshest</p>
                <p className="mt-1 font-display text-[1.2rem] leading-tight text-foreground sm:text-[1.35rem]">{formatLongDate(freshestFriend?.latestRecordedAt)}</p>
              </div>
          </div>
        </div>
      </section>

      <section className="space-y-2.5 sm:space-y-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-muted-foreground">共 {friends.length} 位好友</p>
          <Button className="self-start sm:self-auto" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Add Friend
          </Button>
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-[1.3rem] leading-tight text-foreground sm:text-[1.55rem]">Friends List</h2>
        </div>

        <FriendsTable busyFriendId={busyFriendId} friends={friends} onRemove={handleRemoveFriend} />
      </section>

      <AddFriendDialog onConfirm={handleAddFriend} onOpenChange={setDialogOpen} open={dialogOpen} />
    </div>
  );
}