import { describe, expect, it } from "vitest";
import { getMetricProgressDirection } from "@/lib/inbody/progress";

describe("inbody metric progress direction", () => {
  it("treats lower fat metrics as positive progress", () => {
    expect(getMetricProgressDirection("fatPercent", -0.2)).toBe("positive");
    expect(getMetricProgressDirection("fatPercent", 0.2)).toBe("negative");
  });

  it("treats higher muscle metrics as positive progress", () => {
    expect(getMetricProgressDirection("muscle", 0.2)).toBe("positive");
    expect(getMetricProgressDirection("muscle", -0.2)).toBe("negative");
  });

  it("treats higher energy metrics as positive progress", () => {
    expect(getMetricProgressDirection("bmr", 10)).toBe("positive");
    expect(getMetricProgressDirection("recommendedCalories", 10)).toBe("positive");
  });

  it("treats segmental muscle ratio up and fat ratio down as positive progress", () => {
    expect(getMetricProgressDirection("muscleRatio", 0.2)).toBe("positive");
    expect(getMetricProgressDirection("fatRatio", -0.2)).toBe("positive");
  });
});
