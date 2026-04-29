import type { InbodyRecord } from "@/lib/inbody/types";

export interface FriendProfile {
  userId: string;
  friendCode: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface FriendSnapshot {
  friendUserId: string;
  friendCode: string;
  displayName: string;
  avatarUrl: string | null;
  linkedAt: string;
  latestRecordedAt: string | null;
  latestWeight: number | null;
  latestWeightDelta: number | null;
  latestMuscle: number | null;
  latestMuscleDelta: number | null;
  latestFat: number | null;
  latestFatDelta: number | null;
  latestFatPercent: number | null;
  latestFatPercentDelta: number | null;
  latestScore: number | null;
  latestScoreDelta: number | null;
  latestSourceType: InbodyRecord["sourceType"] | null;
}