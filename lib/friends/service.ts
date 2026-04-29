import type { SupabaseClient, User } from "@supabase/supabase-js";
import { summarizeUser } from "@/lib/presentation";
import type { FriendProfile, FriendSnapshot } from "./types";

interface UserProfileRow {
  user_id: string;
  friend_code: string;
  display_name: string;
  avatar_url: string | null;
}

interface FriendSnapshotRow {
  friend_user_id: string;
  friend_code: string;
  display_name: string;
  avatar_url: string | null;
  linked_at: string;
  latest_recorded_at: string | null;
  latest_weight: number | null;
  latest_weight_delta: number | null;
  latest_muscle: number | null;
  latest_muscle_delta: number | null;
  latest_fat: number | null;
  latest_fat_delta: number | null;
  latest_fat_percent: number | null;
  latest_fat_percent_delta: number | null;
  latest_score: number | null;
  latest_score_delta: number | null;
  latest_source_type: FriendSnapshot["latestSourceType"];
}

const FRIENDS_MIGRATION_PATH = "infra/supabase/migrations/20260424_002_friends.sql";
const MISSING_FRIENDS_CODES = new Set(["PGRST202", "PGRST205", "42P01", "42883"]);
const DUPLICATE_ROW_CODE = "23505";

export class MissingFriendsInfrastructureError extends Error {
  constructor() {
    super(`Friends storage is unavailable. Apply ${FRIENDS_MIGRATION_PATH} to your Supabase database.`);
    this.name = "MissingFriendsInfrastructureError";
  }
}

export class FriendNotFoundError extends Error {
  constructor(friendCode: string) {
    super(`找不到好友 ID 為 ${friendCode} 的使用者。`);
    this.name = "FriendNotFoundError";
  }
}

export class DuplicateFriendshipError extends Error {
  constructor() {
    super("這位好友已經在清單中了。");
    this.name = "DuplicateFriendshipError";
  }
}

export class SelfFriendshipError extends Error {
  constructor() {
    super("不能把自己加入好友清單。");
    this.name = "SelfFriendshipError";
  }
}

function isMissingFriendsInfrastructure(error: { code?: string } | null) {
  return Boolean(error?.code && MISSING_FRIENDS_CODES.has(error.code));
}

function isDuplicateFriendship(error: { code?: string } | null) {
  return error?.code === DUPLICATE_ROW_CODE;
}

function mapFriendProfile(row: UserProfileRow): FriendProfile {
  return {
    userId: row.user_id,
    friendCode: row.friend_code,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
  };
}

function mapFriendSnapshot(row: FriendSnapshotRow): FriendSnapshot {
  return {
    friendUserId: row.friend_user_id,
    friendCode: row.friend_code,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    linkedAt: row.linked_at,
    latestRecordedAt: row.latest_recorded_at,
    latestWeight: row.latest_weight,
    latestWeightDelta: row.latest_weight_delta,
    latestMuscle: row.latest_muscle,
    latestMuscleDelta: row.latest_muscle_delta,
    latestFat: row.latest_fat,
    latestFatDelta: row.latest_fat_delta,
    latestFatPercent: row.latest_fat_percent,
    latestFatPercentDelta: row.latest_fat_percent_delta,
    latestScore: row.latest_score,
    latestScoreDelta: row.latest_score_delta,
    latestSourceType: row.latest_source_type,
  };
}

function createFallbackSnapshot(profile: FriendProfile): FriendSnapshot {
  return {
    friendUserId: profile.userId,
    friendCode: profile.friendCode,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    linkedAt: new Date().toISOString(),
    latestRecordedAt: null,
    latestWeight: null,
    latestWeightDelta: null,
    latestMuscle: null,
    latestMuscleDelta: null,
    latestFat: null,
    latestFatDelta: null,
    latestFatPercent: null,
    latestFatPercentDelta: null,
    latestScore: null,
    latestScoreDelta: null,
    latestSourceType: null,
  };
}

export function normalizeFriendCode(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export async function ensureCurrentUserProfile(supabase: SupabaseClient, user: User) {
  const summary = summarizeUser(user);
  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(
      {
        avatar_url: summary.avatarUrl,
        display_name: summary.name,
        user_id: user.id,
      },
      { onConflict: "user_id" },
    )
    .select("user_id, friend_code, display_name, avatar_url")
    .single<UserProfileRow>();

  if (error) {
    if (isMissingFriendsInfrastructure(error)) {
      throw new MissingFriendsInfrastructureError();
    }

    throw error;
  }

  return mapFriendProfile(data);
}

export async function listFriendSnapshots(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("list_friend_latest_records");

  if (error) {
    if (isMissingFriendsInfrastructure(error)) {
      throw new MissingFriendsInfrastructureError();
    }

    throw error;
  }

  return ((data || []) as FriendSnapshotRow[]).map((row) => mapFriendSnapshot(row));
}

export async function addFriendByCode(supabase: SupabaseClient, userId: string, friendCode: string) {
  const normalizedFriendCode = normalizeFriendCode(friendCode);
  const { data, error } = await supabase.rpc("find_user_profile_by_friend_code", {
    input_code: normalizedFriendCode,
  });

  if (error) {
    if (isMissingFriendsInfrastructure(error)) {
      throw new MissingFriendsInfrastructureError();
    }

    throw error;
  }

  const profileRow = ((data || []) as UserProfileRow[])[0];

  if (!profileRow) {
    throw new FriendNotFoundError(normalizedFriendCode);
  }

  if (profileRow.user_id === userId) {
    throw new SelfFriendshipError();
  }

  const profile = mapFriendProfile(profileRow);
  const { error: insertError } = await supabase.from("user_friendships").insert({
    friend_user_id: profile.userId,
    user_id: userId,
  });

  if (insertError) {
    if (isMissingFriendsInfrastructure(insertError)) {
      throw new MissingFriendsInfrastructureError();
    }

    if (isDuplicateFriendship(insertError)) {
      throw new DuplicateFriendshipError();
    }

    throw insertError;
  }

  const friends = await listFriendSnapshots(supabase);
  return friends.find((friend) => friend.friendUserId === profile.userId) ?? createFallbackSnapshot(profile);
}

export async function removeFriend(supabase: SupabaseClient, userId: string, friendUserId: string) {
  const { error } = await supabase.from("user_friendships").delete().eq("user_id", userId).eq("friend_user_id", friendUserId);

  if (error) {
    if (isMissingFriendsInfrastructure(error)) {
      throw new MissingFriendsInfrastructureError();
    }

    throw error;
  }
}