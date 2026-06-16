import { describe, expect, it } from "vitest";
import { getMetricProgressDirection } from "@/lib/inbody/progress";

describe("inbody metric progress direction", () => {
  it("treats body weight as neutral without a goal context", () => {
    expect(getMetricProgressDirection("weight", -0.2)).toBe("neutral");
    expect(getMetricProgressDirection("weight", 0.2)).toBe("neutral");
  });

  it("treats lower fat metrics as positive progress", () => {
    expect(getMetricProgressDirection("fat", -0.2)).toBe("positive");
    expect(getMetricProgressDirection("fatPercent", -0.2)).toBe("positive");
  });

  it("treats higher muscle metrics as positive progress", () => {
    expect(getMetricProgressDirection("muscle", 0.2)).toBe("positive");
    expect(getMetricProgressDirection("muscle", -0.2)).toBe("negative");
  });

  it("treats energy estimates as neutral support metrics", () => {
    expect(getMetricProgressDirection("bmr", 10)).toBe("neutral");
    expect(getMetricProgressDirection("bmr", -10)).toBe("neutral");
    expect(getMetricProgressDirection("recommendedCalories", 10)).toBe("neutral");
    expect(getMetricProgressDirection("recommendedCalories", -10)).toBe("neutral");
  });

  it("treats segmental muscle ratio up and fat ratio down as positive progress", () => {
    expect(getMetricProgressDirection("muscleRatio", 0.2)).toBe("positive");
    expect(getMetricProgressDirection("fatRatio", -0.2)).toBe("positive");
  });
});
