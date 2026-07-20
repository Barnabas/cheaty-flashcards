import { describe, expect, it } from "vite-plus/test";
import { fnv1aHash } from "./checksum";

describe("fnv1aHash", () => {
  it("is deterministic", () => {
    expect(fnv1aHash("hello")).toBe(fnv1aHash("hello"));
  });

  it("changes when the input changes", () => {
    expect(fnv1aHash("hello")).not.toBe(fnv1aHash("hellp"));
  });

  it("is sensitive to a single-character edit anywhere in a longer string", () => {
    const json = JSON.stringify({ percentCorrect: 0.8, stage: 3 });
    const tampered = JSON.stringify({ percentCorrect: 1.0, stage: 3 });
    expect(fnv1aHash(json)).not.toBe(fnv1aHash(tampered));
  });
});
