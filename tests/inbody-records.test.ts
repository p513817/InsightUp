import { describe, expect, it } from "vitest";
import { buildChartPayload, createSegmentalDataFromRecord, ensureSegmentalData } from "@/lib/inbody/records";
import type { InbodyRecord } from "@/lib/inbody/types";

describe("inbody record helpers", () => {
  it("creates stable segmental defaults from an overall record", () => {
    const segmental = createSegmentalDataFromRecord({
      muscle: 30.5,
      fat: 11.9,
      fatPercent: 18,
    });

    expect(segmental.leftArm.muscle).toBeGreaterThan(0);
    expect(segmental.trunk.fatRatio).toBeGreaterThan(100);
  });

  it("fills missing segmental values with derived fallbacks", () => {
    const segmental = ensureSegmentalData({
      muscle: 30,
      fat: 10,
      fatPercent: 16,
      segmental: {
        leftArm: {
          name: "Left Arm",
          muscle: 2.91,
          fat: 0.51,
          muscleRatio: 102,
          fatRatio: 94,
        },
      },
    });

    expect(segmental.leftArm.muscle).toBe(2.91);
    expect(segmental.rightLeg.muscle).toBeGreaterThan(0);
  });

  it("builds chart payload from included records only", () => {
    const records: InbodyRecord[] = [
      {
        id: "a",
        userId: "u1",
        date: "2026-01-01",
        height: 165,
        age: 29,
        gender: "male",
        score: 81,
        weight: 66.1,
        muscle: 30.5,
        fat: 11.9,
        fatPercent: 18,
        visceralFatLevel: 6,
        bmr: 1508,
        recommendedCalories: 2140,
        isIncludedInCharts: true,
        sourceType: "manual",
        notes: null,
        segmental: createSegmentalDataFromRecord({ muscle: 30.5, fat: 11.9, fatPercent: 18 }),
      },
      {
        id: "b",
        userId: "u1",
        date: "2026-02-01",
        height: 165,
        age: 29,
        gender: "male",
        score: 82,
        weight: 65.8,
        muscle: 30.8,
        fat: 11.2,
        fatPercent: 17.1,
        visceralFatLevel: 5,
        bmr: 1516,
        recommendedCalories: 2140,
        isIncludedInCharts: false,
        sourceType: "manual",
        notes: null,
        segmental: createSegmentalDataFromRecord({ muscle: 30.8, fat: 11.2, fatPercent: 17.1 }),
      },
    ];

    const chart = buildChartPayload(records, "overall");
    expect(chart.points).toHaveLength(1);
    expect(chart.points[0]?.weight).toBe(66.1);
  });
});
