import { describe, expect, it } from "vitest";
import { getCompetitionLeaderBoard, type CompetitionMemberProgress, type CompetitionProgress } from "@/lib/competitions";

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
