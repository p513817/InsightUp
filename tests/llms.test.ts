import { describe, expect, it } from "vitest";
import { parseStructuredSummaryText } from "@/lib/llms";

describe("parseStructuredSummaryText", () => {
  it("parses plain JSON summaries", () => {
    const parsed = parseStructuredSummaryText(
      JSON.stringify({
        overview: "整體趨勢穩定。",
        keyChanges: ["肌肉量持平。"],
        actionPlan: ["維持每週訓練。"],
        watchouts: ["持續觀察體脂率。"],
      }),
    );

    expect(parsed?.overview).toBe("整體趨勢穩定。");
    expect(parsed?.keyChanges).toEqual(["肌肉量持平。"]);
  });

  it("extracts summary JSON from fenced or wrapped model output", () => {
    const parsed = parseStructuredSummaryText(`
以下是摘要：
\`\`\`json
{
  "overview": "體重下降但肌肉也下降，需要留意恢復。",
  "keyChanges": ["體重下降。", "骨骼肌下降。"],
  "actionPlan": ["提高蛋白質攝取。"],
  "watchouts": ["避免過大的熱量赤字。"]
}
\`\`\`
`);

    expect(parsed?.overview).toBe("體重下降但肌肉也下降，需要留意恢復。");
    expect(parsed?.actionPlan).toEqual(["提高蛋白質攝取。"]);
  });
});
