import { describe, expect, it } from "vite-plus/test";
import { formatPercent } from "./utils";

describe("formatPercent", () => {
  it("shows whole percentages only — kids never see a decimal", () => {
    expect(formatPercent(1)).toBe("100%");
    expect(formatPercent(0.85)).toBe("85%");
    expect(formatPercent(2 / 3)).toBe("67%");
    expect(formatPercent(0)).toBe("0%");
  });
});
