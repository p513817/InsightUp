import { describe, expect, it } from "vitest";
import { calculatePersonalGoalProgress } from "@/lib/personal-goals";

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
