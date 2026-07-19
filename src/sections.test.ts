import { describe, expect, it } from "vite-plus/test";
import { getLevelName, sections } from "./sections";

describe("getLevelName", () => {
  it("joins the section operator and 1-indexed level", () => {
    expect(getLevelName(sections[0], 2)).toBe("+ 3");
  });

  it("returns an empty string when section or level is missing", () => {
    expect(getLevelName(undefined, 2)).toBe("");
  });
});
