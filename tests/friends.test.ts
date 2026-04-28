import { describe, expect, it } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  addFriendByCode,
  DuplicateFriendshipError,
  ensureCurrentUserProfile,
  FriendNotFoundError,
  listFriendSnapshots,
  MissingFriendsInfrastructureError,
  normalizeFriendCode,
  SelfFriendshipError,
} from "@/lib/friends/service";

function createProfileClient(error: { code?: string } | null) {
  return {
    from() {
      return {
        upsert() {
          return {
            select() {
              return {
                single: async () => ({ data: null, error }),
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
}

function createFriendRpcClient(options: {
  insertError?: { code?: string } | null;
  lookupRows?: Array<Record<string, unknown>>;
  snapshotRows?: Array<Record<string, unknown>>;
}) {
  const inserted: Array<{ friend_user_id: string; user_id: string }> = [];

  const supabase = {
    from() {
      return {
        insert: async (payload: { friend_user_id: string; user_id: string }) => {
          inserted.push(payload);
          return { error: options.insertError ?? null };
        },
      };
    },
    rpc: async (fn: string) => {
      if (fn === "find_user_profile_by_friend_code") {
        return { data: options.lookupRows ?? [], error: null };
      }

      if (fn === "list_friend_latest_records") {
        return { data: options.snapshotRows ?? [], error: null };
      }

      return { data: [], error: null };
    },
  } as unknown as SupabaseClient;

  return { inserted, supabase };
}

describe("friends service", () => {
  it("normalizes a friend code before lookup", () => {
    expect(normalizeFriendCode(" ab 12-cd ")).toBe("AB12-CD");
  });

  it("throws a clear error when the friends migration is missing", async () => {
    const supabase = createProfileClient({ code: "PGRST205" });
    const user = {
      created_at: "2026-04-24T00:00:00.000Z",
      email: "demo@example.com",
      id: "user-1",
      user_metadata: { full_name: "Demo User" },
    } as unknown as User;

    await expect(ensureCurrentUserProfile(supabase, user)).rejects.toBeInstanceOf(MissingFriendsInfrastructureError);
  });

  it("rejects adding yourself as a friend", async () => {
    const { inserted, supabase } = createFriendRpcClient({
      lookupRows: [
        {
          avatar_url: null,
          display_name: "Demo User",
          friend_code: "AB12CD34EF",
          user_id: "user-1",
        },
      ],
    });

    await expect(addFriendByCode(supabase, "user-1", "ab12cd34ef")).rejects.toBeInstanceOf(SelfFriendshipError);
    expect(inserted).toEqual([]);
  });

  it("surfaces an unknown friend code with a domain error", async () => {
    const { supabase } = createFriendRpcClient({ lookupRows: [] });

    await expect(addFriendByCode(supabase, "user-1", "missing-code")).rejects.toBeInstanceOf(FriendNotFoundError);
  });

  it("translates duplicate rows into a stable duplicate error", async () => {
    const { supabase } = createFriendRpcClient({
      insertError: { code: "23505" },
      lookupRows: [
        {
          avatar_url: null,
          display_name: "Friend User",
          friend_code: "ZXCV123456",
          user_id: "friend-1",
        },
      ],
    });

    await expect(addFriendByCode(supabase, "user-1", "zxcv123456")).rejects.toBeInstanceOf(DuplicateFriendshipError);
  });

  it("maps latest friend snapshots from the rpc payload", async () => {
    const { supabase } = createFriendRpcClient({
      snapshotRows: [
        {
          avatar_url: null,
          display_name: "Friend User",
          friend_code: "ZXCV123456",
          friend_user_id: "friend-1",
          latest_fat: 11.8,
          latest_fat_delta: -0.6,
          latest_fat_percent: 18.2,
          latest_fat_percent_delta: -0.8,
          latest_muscle: 31.5,
          latest_muscle_delta: 0.4,
          latest_recorded_at: "2026-04-20",
          latest_score: 84,
          latest_score_delta: 2,
          latest_source_type: "manual",
          latest_weight: 66.2,
          latest_weight_delta: -0.7,
          linked_at: "2026-04-24T08:00:00.000Z",
        },
      ],
    });

    await expect(listFriendSnapshots(supabase)).resolves.toEqual([
      {
        avatarUrl: null,
        displayName: "Friend User",
        friendCode: "ZXCV123456",
        friendUserId: "friend-1",
        latestFat: 11.8,
        latestFatDelta: -0.6,
        latestFatPercent: 18.2,
        latestFatPercentDelta: -0.8,
        latestMuscle: 31.5,
        latestMuscleDelta: 0.4,
        latestRecordedAt: "2026-04-20",
        latestScore: 84,
        latestScoreDelta: 2,
        latestSourceType: "manual",
        latestWeight: 66.2,
        latestWeightDelta: -0.7,
        linkedAt: "2026-04-24T08:00:00.000Z",
      },
    ]);
  });
});