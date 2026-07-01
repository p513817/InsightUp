import { describe, expect, it } from "vitest";
import { calculatePersonalGoalProgress, stripCompetitionGoalFields } from "@/lib/personal-goals";
import { sanitizeNextPath } from "@/lib/auth/redirects";

describe("personal goal progress", () => {
  it("marks a maintenance goal as achieved only when the current value is unchanged", () => {
    expect(calculatePersonalGoalProgress(30.5, 30.5, 30.5)).toEqual({
      progressPercent: 100,
      isAchieved: true,
    });
  });

  it("returns negative progress when a maintenance goal regresses", () => {
    expect(calculatePersonalGoalProgress(30.5, 30.5, 30.3)).toEqual({
      progressPercent: -1,
      isAchieved: false,
    });
  });
});

describe("personal goal input hardening", () => {
  it("strips competition-owned fields from generic personal goal payloads", () => {
    expect(
      stripCompetitionGoalFields({
        competitionId: "11111111-1111-4111-8111-111111111111",
        competitionMemberId: "22222222-2222-4222-8222-222222222222",
        metricKey: "weight",
        startRecordId: null,
        startValue: 70,
        targetDate: "2026-07-31",
        targetDateLocked: true,
        targetValue: 68,
        title: "Summer goal",
      }),
    ).toMatchObject({
      competitionId: null,
      competitionMemberId: null,
      targetDateLocked: false,
    });
  });
});

describe("auth redirect sanitization", () => {
  it("rejects protocol-relative redirect targets", () => {
    expect(sanitizeNextPath("//evil.example/landing")).toBe("/dashboard");
    expect(sanitizeNextPath("/dashboard")).toBe("/dashboard");
  });
});
