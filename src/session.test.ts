import { describe, expect, it } from "vite-plus/test";
import {
  GROUP_LABELS,
  SESSION_MAX_MS,
  SESSION_MAX_QUESTIONS,
  SessionFamilyStatus,
  buildFollowUpQuestions,
  buildInitialQuestions,
  buildQuestion,
  buildSessionTargetKeys,
  hasReachedHardCap,
  isSessionComplete,
  permutationKey,
  resolveTargetFamilies,
} from "./session";
import { familyPool } from "./mastery";

function lcgRng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

describe("GROUP_LABELS", () => {
  it("has a human-readable label for each operator group", () => {
    expect(GROUP_LABELS.add).toBe("Addition & Subtraction");
    expect(GROUP_LABELS.multiply).toBe("Multiplication & Division");
  });
});

describe("buildQuestion", () => {
  it("builds a self-consistent question for each operator", () => {
    for (const [operator, a, b] of [
      ["+", 3, 4],
      ["-", 3, 4],
      ["×", 3, 4],
      ["÷", 3, 4],
    ] as const) {
      const q = buildQuestion(operator, a, b, "key", 5);
      expect(q.answers).toContain(q.correct);
      expect(new Set(q.answers).size).toBe(q.answers.length);
    }
  });
});

describe("resolveTargetFamilies", () => {
  const families = familyPool("add", 2, 4);

  it("returns the full list when no focus numbers are given", () => {
    expect(resolveTargetFamilies(families)).toEqual(families);
  });

  it("restricts to families touching a focus number", () => {
    const result = resolveTargetFamilies(families, [4]);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((f) => f.a === 4 || f.b === 4)).toBe(true);
  });

  it("falls back to the full list when the focus filter matches nothing", () => {
    expect(resolveTargetFamilies(families, [999])).toEqual(families);
  });
});

describe("buildInitialQuestions", () => {
  it("produces exactly two questions per family, one for each operator", () => {
    const families = familyPool("add", 2, 4);
    const questions = buildInitialQuestions("add", families, { rng: lcgRng(1) });
    expect(questions).toHaveLength(families.length * 2);
    expect(new Set(questions.map((q) => q.familyKey))).toEqual(new Set(families.map((f) => f.key)));
    for (const family of families) {
      const operators = questions.filter((q) => q.familyKey === family.key).map((q) => q.operator);
      expect(new Set(operators)).toEqual(new Set(["+", "-"]));
    }
  });

  it("mixes both operators from the group's inverse pair", () => {
    const families = familyPool("add", 2, 9);
    const questions = buildInitialQuestions("add", families, { rng: lcgRng(3) });
    const operators = new Set(questions.map((q) => q.operator));
    expect(operators.has("+")).toBe(true);
    expect(operators.has("-")).toBe(true);
  });

  it("every question is answerable and self-consistent", () => {
    const families = familyPool("multiply", 2, 5);
    const questions = buildInitialQuestions("multiply", families, { rng: lcgRng(5) });
    for (const q of questions) {
      expect(q.answers).toContain(q.correct);
      expect(new Set(q.answers).size).toBe(q.answers.length);
    }
  });
});

describe("buildFollowUpQuestions", () => {
  const pool = familyPool("add", 2, 4); // 6 families

  it("returns the requested number of questions", () => {
    const questions = buildFollowUpQuestions("add", pool, {}, 15, { rng: lcgRng(2) });
    expect(questions).toHaveLength(15);
  });

  it("biases heavily toward permutations marked 'retry'", () => {
    const retryFamily = pool[0];
    // Every permutation clean except one operator of one family.
    const statuses: Record<string, SessionFamilyStatus> = Object.fromEntries(
      buildSessionTargetKeys("add", pool).map((key) => [key, "clean" as const]),
    );
    statuses[permutationKey(retryFamily.key, "+")] = "retry";

    const questions = buildFollowUpQuestions("add", pool, statuses, 2000, { rng: lcgRng(11) });
    const retryCount = questions.filter(
      (q) => q.familyKey === retryFamily.key && q.operator === "+",
    ).length;
    // retry permutation gets weight 1*4=4 vs 11 clean permutations at weight 1
    // each (total 11) -> expected share ~4/15 ~= 0.27, well above an
    // unboosted ~1/12.
    expect(retryCount / questions.length).toBeGreaterThan(0.18);
  });

  it("biases just as heavily toward permutations never seen this session ('pending')", () => {
    // No statuses recorded at all — every permutation is implicitly pending,
    // so every permutation should get an equal, boosted share, not just the
    // ones explicitly marked "retry".
    const questions = buildFollowUpQuestions("add", pool, {}, 3000, { rng: lcgRng(7) });
    const counts = new Map<string, number>();
    for (const q of questions) {
      const key = permutationKey(q.familyKey, q.operator);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const targetKeys = buildSessionTargetKeys("add", pool);
    expect(counts.size).toBe(targetKeys.length);
  });
});

describe("buildSessionTargetKeys", () => {
  it("produces both operator permutations for every family", () => {
    const families = familyPool("add", 2, 3);
    const keys = buildSessionTargetKeys("add", families);
    expect(keys).toHaveLength(families.length * 2);
    for (const family of families) {
      expect(keys).toContain(permutationKey(family.key, "+"));
      expect(keys).toContain(permutationKey(family.key, "-"));
    }
  });
});

describe("isSessionComplete", () => {
  it("is false when there are no target families", () => {
    expect(isSessionComplete({}, [])).toBe(false);
  });

  it("is false while any target family isn't 'clean'", () => {
    const statuses = { a: "clean", b: "retry" } as const;
    expect(isSessionComplete(statuses, ["a", "b"])).toBe(false);
  });

  it("is false for a target family that hasn't been attempted at all", () => {
    expect(isSessionComplete({ a: "clean" }, ["a", "b"])).toBe(false);
  });

  it("is true once every target family is 'clean'", () => {
    const statuses = { a: "clean", b: "clean" } as const;
    expect(isSessionComplete(statuses, ["a", "b"])).toBe(true);
  });

  it("stays false when a family's other operator hasn't cleared yet", () => {
    const families = familyPool("add", 2, 2); // one family: 2+2
    const targetKeys = buildSessionTargetKeys("add", families);
    const statuses: Record<string, SessionFamilyStatus> = {
      [permutationKey(families[0].key, "+")]: "clean",
    };
    // "-" permutation never attempted -> session isn't done just because "+"
    // landed clean.
    expect(isSessionComplete(statuses, targetKeys)).toBe(false);

    statuses[permutationKey(families[0].key, "-")] = "clean";
    expect(isSessionComplete(statuses, targetKeys)).toBe(true);
  });
});

describe("hasReachedHardCap", () => {
  it("is false comfortably under both caps", () => {
    expect(hasReachedHardCap(5, 10_000)).toBe(false);
  });

  it("is true once the question cap is hit", () => {
    expect(hasReachedHardCap(SESSION_MAX_QUESTIONS, 0)).toBe(true);
  });

  it("is true once the time cap is hit", () => {
    expect(hasReachedHardCap(0, SESSION_MAX_MS)).toBe(true);
  });
});
