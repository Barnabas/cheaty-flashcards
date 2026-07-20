import { describe, expect, it } from "vite-plus/test";
import { generateLevel, getLevelName, sections } from "./sections";
import { MAX_STAGE, factFamilyKey } from "./mastery";
import { FamilyMastery } from "./stores/types";

describe("getLevelName", () => {
  it("joins the section operator and 1-indexed level", () => {
    expect(getLevelName(sections[0], 2)).toBe("+ 3");
  });

  it("returns an empty string when section or level is missing", () => {
    expect(getLevelName(undefined, 2)).toBe("");
  });
});

function lcgRng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

describe("generateLevel", () => {
  const addSection = sections.find((s) => s.id === "add")!;
  const multiplySection = sections.find((s) => s.id === "multiply")!;

  it("produces the requested number of questions, each answerable and self-consistent", () => {
    const level = generateLevel(addSection, {
      level: 0,
      questionCount: 10,
      answerCount: 5,
      rng: lcgRng(1),
    });
    expect(level.questions).toHaveLength(10);
    for (const q of level.questions) {
      expect(q.operator).toBe("+");
      expect(q.answers).toContain(q.correct);
      expect(new Set(q.answers).size).toBe(q.answers.length);
    }
  });

  it("biases sampling toward low-mastery families", () => {
    const mastered: Record<string, FamilyMastery> = {};
    for (let a = 2; a <= 9; a++) {
      for (let b = a; b <= 9; b++) {
        const key = factFamilyKey("add", a, b);
        if (a !== 2 || b !== 2) {
          mastered[key] = { stage: MAX_STAGE, timesSeen: 1, timesCorrect: 1, lastSeen: null };
        }
      }
    }
    const level = generateLevel(addSection, {
      level: 0,
      questionCount: 3000,
      answerCount: 5,
      rng: lcgRng(7),
      getMastery: (key) => mastered[key],
    });
    const weakKey = factFamilyKey("add", 2, 2);
    const weakCount = level.questions.filter((q) => q.familyKey === weakKey).length;
    // pool has 36 families (2..9); weak family weight 6 vs 35 mastered at
    // weight 1 each -> expected share is 6/41 ~= 0.15, well above the ~0.03
    // an unweighted uniform draw would give it.
    const share = weakCount / level.questions.length;
    expect(share).toBeGreaterThan(0.1);
    expect(share).toBeLessThan(0.2);
  });

  it("restricts questions to a focus number when provided", () => {
    const level = generateLevel(multiplySection, {
      level: 0,
      questionCount: 30,
      answerCount: 5,
      focusNumbers: [7],
      rng: lcgRng(3),
    });
    for (const q of level.questions) {
      expect(q.factors).toContain(7);
    }
  });

  it("in mixed mode, generates both operators from the section's group", () => {
    const level = generateLevel(addSection, {
      level: 0,
      questionCount: 200,
      answerCount: 5,
      mixed: true,
      rng: lcgRng(9),
    });
    const operators = new Set(level.questions.map((q) => q.operator));
    expect(operators.has("+")).toBe(true);
    expect(operators.has("-")).toBe(true);
  });

  it("outside mixed mode, only uses the section's own operator", () => {
    const level = generateLevel(addSection, {
      level: 0,
      questionCount: 50,
      answerCount: 5,
      rng: lcgRng(11),
    });
    expect(level.questions.every((q) => q.operator === "+")).toBe(true);
  });
});
