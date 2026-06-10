import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeFriendCode } from "@/lib/friends/service";
import {
  PERSONAL_GOAL_METRIC_KEYS,
  PERSONAL_GOAL_METRICS,
  type PersonalGoal,
  type PersonalGoalMetricKey,
} from "@/lib/personal-goals";

export const COMPETITION_STATUSES = ["active", "completed", "cancelled"] as const;
export type CompetitionStatus = (typeof COMPETITION_STATUSES)[number];

export const COMPETITION_MEMBER_ROLES = ["owner", "participant"] as const;
export type CompetitionMemberRole = (typeof COMPETITION_MEMBER_ROLES)[number];

export const COMPETITION_MEMBER_STATUSES = ["invited", "accepted", "declined", "removed"] as const;
export type CompetitionMemberStatus = (typeof COMPETITION_MEMBER_STATUSES)[number];

export const competitionCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  inviteeUserIds: z.array(z.string().uuid()).default([]),
  inviteeFriendCodes: z.array(z.string().trim().min(1).max(32)).default([]),
});

export const competitionUpdateSchema = competitionCreateSchema;

export const competitionGoalCreateSchema = z.object({
  title: z.string().trim().max(80).nullable().optional(),
  startRecordId: z.string().uuid().nullable().optional(),
  metricKey: z.enum(PERSONAL_GOAL_METRIC_KEYS),
  startValue: z.number().finite(),
  targetValue: z.number().finite(),
});

export const competitionGoalBatchCreateSchema = z.object({
  goals: z.array(competitionGoalCreateSchema).min(1).max(PERSONAL_GOAL_METRICS.length),
});

export type CompetitionCreateValues = z.infer<typeof competitionCreateSchema>;
export type CompetitionUpdateValues = z.infer<typeof competitionUpdateSchema>;
export type CompetitionGoalCreateValues = z.infer<typeof competitionGoalCreateSchema>;

export type CompetitionProgressRow = {
  competition_id: string;
  competition_name: string;
  competition_target_date: string;
  competition_status: CompetitionStatus;
  competition_owner_id: string;
  competition_created_at: string;
  competition_updated_at: string;
  member_id: string;
  member_user_id: string;
  member_display_name: string;
  member_avatar_url: string | null;
  member_friend_code: string | null;
  member_role: CompetitionMemberRole;
  member_status: CompetitionMemberStatus;
  member_invited_by_user_id: string | null;
  member_joined_at: string | null;
  member_created_at: string;
  member_updated_at: string;
  member_latest_recorded_at: string | null;
  member_goal_count: number;
  member_completed_goal_count: number;
  member_progress_percent: number;
  goal_id: string | null;
  goal_title: string | null;
  goal_metric_key: PersonalGoalMetricKey | null;
  goal_start_value: number | string | null;
  goal_target_value: number | string | null;
  goal_unit: string | null;
  goal_target_date: string | null;
  goal_target_date_locked: boolean | null;
  goal_created_at: string | null;
  goal_updated_at: string | null;
  goal_latest_value: number | string | null;
  goal_reference_record_date: string | null;
  goal_progress_percent: number | null;
  goal_is_achieved: boolean | null;
};

export type CompetitionMemberGoal = PersonalGoal;

export type CompetitionMemberProgress = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  friendCode: string | null;
  role: CompetitionMemberRole;
  status: CompetitionMemberStatus;
  invitedByUserId: string | null;
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
  latestRecordDate: string | null;
  goalCount: number;
  completedGoalCount: number;
  progressPercent: number;
  goals: CompetitionMemberGoal[];
};

export type CompetitionProgress = {
  id: string;
  name: string;
  targetDate: string;
  status: CompetitionStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  members: CompetitionMemberProgress[];
  currentUserMember: CompetitionMemberProgress | null;
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return null;
}

function mapProgressRow(row: CompetitionProgressRow) {
  return {
    competitionId: row.competition_id,
    competitionName: row.competition_name,
    competitionTargetDate: row.competition_target_date,
    competitionStatus: row.competition_status,
    competitionOwnerId: row.competition_owner_id,
    competitionCreatedAt: row.competition_created_at,
    competitionUpdatedAt: row.competition_updated_at,
    memberId: row.member_id,
    memberUserId: row.member_user_id,
    memberDisplayName: row.member_display_name,
    memberAvatarUrl: row.member_avatar_url,
    memberFriendCode: row.member_friend_code,
    memberRole: row.member_role,
    memberStatus: row.member_status,
    memberInvitedByUserId: row.member_invited_by_user_id,
    memberJoinedAt: row.member_joined_at,
    memberCreatedAt: row.member_created_at,
    memberUpdatedAt: row.member_updated_at,
    memberLatestRecordDate: row.member_latest_recorded_at,
    memberGoalCount: row.member_goal_count,
    memberCompletedGoalCount: row.member_completed_goal_count,
    memberProgressPercent: row.member_progress_percent,
    goalId: row.goal_id,
    goalTitle: row.goal_title,
    goalMetricKey: row.goal_metric_key,
    goalStartValue: toNumber(row.goal_start_value),
    goalTargetValue: toNumber(row.goal_target_value),
    goalUnit: row.goal_unit,
    goalTargetDate: row.goal_target_date,
    goalTargetDateLocked: row.goal_target_date_locked ?? false,
    goalCreatedAt: row.goal_created_at,
    goalUpdatedAt: row.goal_updated_at,
    goalLatestValue: toNumber(row.goal_latest_value),
    goalReferenceRecordDate: row.goal_reference_record_date,
    goalProgressPercent: row.goal_progress_percent,
    goalIsAchieved: row.goal_is_achieved,
  };
}

export function normalizeCompetitionInviteeCode(value: string) {
  return normalizeFriendCode(value);
}

export function groupCompetitionProgressRows(rows: CompetitionProgressRow[]) {
  const competitions = new Map<string, CompetitionProgress>();

  for (const row of rows.map(mapProgressRow)) {
    const existingCompetition = competitions.get(row.competitionId);
    const memberGoal: CompetitionMemberGoal | null = row.goalId
      ? {
          id: row.goalId,
          title: row.goalTitle,
          startRecordId: null,
          competitionId: row.competitionId,
          competitionMemberId: row.memberId,
          metricKey: row.goalMetricKey ?? PERSONAL_GOAL_METRICS[0].key,
          startValue: row.goalStartValue ?? 0,
          targetValue: row.goalTargetValue ?? 0,
          unit: row.goalUnit ?? "",
          targetDate: row.goalTargetDate,
          targetDateLocked: row.goalTargetDateLocked ?? false,
          createdAt: row.goalCreatedAt || row.competitionCreatedAt,
          updatedAt: row.goalUpdatedAt || row.competitionUpdatedAt,
          latestValue: row.goalLatestValue,
          referenceRecordDate: row.goalReferenceRecordDate,
          progressPercent: row.goalProgressPercent ?? 0,
          isAchieved: row.goalIsAchieved ?? false,
        }
      : null;

    if (!existingCompetition) {
      competitions.set(row.competitionId, {
        id: row.competitionId,
        name: row.competitionName,
        targetDate: row.competitionTargetDate,
        status: row.competitionStatus,
        ownerId: row.competitionOwnerId,
        createdAt: row.competitionCreatedAt,
        updatedAt: row.competitionUpdatedAt,
        members: [
          {
            id: row.memberId,
            userId: row.memberUserId,
            displayName: row.memberDisplayName,
            avatarUrl: row.memberAvatarUrl,
            friendCode: row.memberFriendCode,
            role: row.memberRole,
            status: row.memberStatus,
            invitedByUserId: row.memberInvitedByUserId,
            joinedAt: row.memberJoinedAt,
            createdAt: row.memberCreatedAt,
            updatedAt: row.memberUpdatedAt,
            latestRecordDate: row.memberLatestRecordDate,
            goalCount: row.memberGoalCount,
            completedGoalCount: row.memberCompletedGoalCount,
            progressPercent: row.memberProgressPercent,
            goals: memberGoal ? [memberGoal] : [],
          },
        ],
        currentUserMember: null,
      });
      continue;
    }

    const targetMember = existingCompetition.members.find((member) => member.id === row.memberId);
    if (!targetMember) {
      existingCompetition.members.push({
        id: row.memberId,
        userId: row.memberUserId,
        displayName: row.memberDisplayName,
        avatarUrl: row.memberAvatarUrl,
        friendCode: row.memberFriendCode,
        role: row.memberRole,
        status: row.memberStatus,
        invitedByUserId: row.memberInvitedByUserId,
        joinedAt: row.memberJoinedAt,
        createdAt: row.memberCreatedAt,
        updatedAt: row.memberUpdatedAt,
        latestRecordDate: row.memberLatestRecordDate,
        goalCount: row.memberGoalCount,
        completedGoalCount: row.memberCompletedGoalCount,
        progressPercent: row.memberProgressPercent,
        goals: memberGoal ? [memberGoal] : [],
      });
    } else if (memberGoal) {
      targetMember.goals.push(memberGoal);
    }
  }

  return Array.from(competitions.values()).map((competition) => ({
    ...competition,
    members: competition.members.map((member) => ({
      ...member,
      goals: [...member.goals].sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    })),
  }));
}

export async function listCompetitionProgressRows(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("list_my_competitions_with_progress");

  if (error) {
    throw error;
  }

  return (data || []) as CompetitionProgressRow[];
}

export async function listCompetitionsWithProgress(supabase: SupabaseClient) {
  return groupCompetitionProgressRows(await listCompetitionProgressRows(supabase));
}

export function getCompetitionById(competitions: CompetitionProgress[], competitionId: string) {
  return competitions.find((competition) => competition.id === competitionId) ?? null;
}

export function attachCurrentUserMember(competition: CompetitionProgress, userId: string) {
  return {
    ...competition,
    currentUserMember: getCompetitionMemberByUserId(competition, userId),
  };
}

export async function createCompetitionWithMembers(
  supabase: SupabaseClient,
  input: CompetitionCreateValues,
  inviteeUserIds: string[],
) {
  const { data, error } = await supabase.rpc("create_competition_with_members", {
    input_name: input.name,
    input_target_date: input.targetDate,
    input_invitee_user_ids: inviteeUserIds,
  });

  if (error) {
    throw error;
  }

  return ((data || []) as { competition_id: string }[])[0]?.competition_id ?? null;
}

export async function updateCompetitionWithMembers(
  supabase: SupabaseClient,
  competitionId: string,
  input: CompetitionUpdateValues,
  inviteeUserIds: string[],
) {
  const { data, error } = await supabase.rpc("update_competition_with_members", {
    input_competition_id: competitionId,
    input_name: input.name,
    input_target_date: input.targetDate,
    input_invitee_user_ids: inviteeUserIds,
  });

  if (error) {
    throw error;
  }

  return ((data || []) as { competition_id: string }[])[0]?.competition_id ?? null;
}

export async function deleteCompetitionWithMembers(supabase: SupabaseClient, competitionId: string) {
  const { data, error } = await supabase.rpc("delete_competition_with_members", {
    input_competition_id: competitionId,
  });

  if (error) {
    throw error;
  }

  return ((data || []) as { competition_id: string }[])[0]?.competition_id ?? null;
}

export function getCompetitionMemberByUserId(competition: CompetitionProgress | null, userId: string) {
  return competition?.members.find((member) => member.userId === userId) ?? null;
}

export function getCompetitionLeaderBoard(competition: CompetitionProgress | null) {
  return [...(competition?.members ?? [])].sort((left, right) => {
    if (right.progressPercent !== left.progressPercent) {
      return right.progressPercent - left.progressPercent;
    }

    const leftUpdated = new Date(left.updatedAt).getTime();
    const rightUpdated = new Date(right.updatedAt).getTime();
    return rightUpdated - leftUpdated;
  });
}
