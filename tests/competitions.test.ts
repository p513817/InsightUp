import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COMPETITION_INVITEE_MUST_BE_FRIEND_ERROR,
  getCompetitionLeaderBoard,
  isCompetitionInviteeValidationError,
  type CompetitionMemberProgress,
  type CompetitionProgress,
  validateCompetitionInviteeUserIds,
} from "@/lib/competitions";

function createMember(input: Partial<CompetitionMemberProgress> & Pick<CompetitionMemberProgress, "id" | "displayName">): CompetitionMemberProgress {
  const { id, ...overrides } = input;

  return {
    avatarUrl: null,
    completedGoalCount: 0,
    createdAt: "2026-06-01T00:00:00.000Z",
    friendCode: null,
    goalCount: 1,
    goals: [],
    id,
    invitedByUserId: null,
    joinedAt: "2026-06-01T00:00:00.000Z",
    latestRecordDate: "2026-06-07",
    progressPercent: 0,
    role: "participant",
    status: "accepted",
    updatedAt: "2026-06-01T00:00:00.000Z",
    userId: id,
    ...overrides,
  };
}

function createCompetition(members: CompetitionMemberProgress[]): CompetitionProgress {
  return {
    createdAt: "2026-06-01T00:00:00.000Z",
    currentUserMember: null,
    id: "competition-1",
    members,
    name: "Demo competition",
    ownerId: "owner-1",
    status: "active",
    targetDate: "2026-08-08",
    updatedAt: "2026-06-01T00:00:00.000Z",
  };
}

describe("competition leaderboard", () => {
  it("keeps members without goals and declined members at the bottom", () => {
    const competition = createCompetition([
      createMember({
        displayName: "No goal",
        goalCount: 0,
        id: "no-goal",
        progressPercent: 100,
      }),
      createMember({
        displayName: "Negative progress",
        id: "negative-progress",
        progressPercent: -20,
      }),
      createMember({
        displayName: "Declined",
        id: "declined",
        progressPercent: 200,
        status: "declined",
      }),
      createMember({
        displayName: "Positive progress",
        id: "positive-progress",
        progressPercent: 80,
      }),
    ]);

    expect(getCompetitionLeaderBoard(competition).map((member) => member.id)).toEqual([
      "positive-progress",
      "negative-progress",
      "no-goal",
      "declined",
    ]);
  });
});

function createFriendshipClient(rows: Array<{ friend_user_id: string }>) {
  return {
    from(table: string) {
      expect(table).toBe("user_friendships");

      return {
        select(columns: string) {
          expect(columns).toBe("friend_user_id");

          return {
            eq(column: string, value: string) {
              expect(column).toBe("user_id");
              expect(value).toBe("owner-1");

              return {
                in(targetColumn: string, values: string[]) {
                  expect(targetColumn).toBe("friend_user_id");
                  return Promise.resolve({
                    data: rows.filter((row) => values.includes(row.friend_user_id)),
                    error: null,
                  });
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
}

describe("competition invite validation", () => {
  it("deduplicates direct invitee ids that already belong to the caller's friends", async () => {
    const supabase = createFriendshipClient([
      { friend_user_id: "friend-1" },
      { friend_user_id: "friend-2" },
    ]);

    await expect(
      validateCompetitionInviteeUserIds(supabase, "owner-1", ["friend-1", "friend-2", "friend-1", "owner-1"]),
    ).resolves.toEqual(["friend-1", "friend-2"]);
  });

  it("rejects direct invitee ids that bypass the friend gate", async () => {
    const supabase = createFriendshipClient([{ friend_user_id: "friend-1" }]);

    await expect(
      validateCompetitionInviteeUserIds(supabase, "owner-1", ["friend-1", "outsider-1"]),
    ).rejects.toThrow(COMPETITION_INVITEE_MUST_BE_FRIEND_ERROR);
  });

  it("marks friend-gate failures as invite validation errors", () => {
    expect(isCompetitionInviteeValidationError(new Error(COMPETITION_INVITEE_MUST_BE_FRIEND_ERROR))).toBe(true);
  });
});
