import { describe, expect, it } from "vite-plus/test";
import {
  GROUP_LABELS,
  SESSION_MAX_MS,
  SESSION_MAX_QUESTIONS,
  SessionFamilyStatus,
  TABLE_MAX_SEATS,
  TABLE_REVIEW_SEATS,
  buildFollowUpQuestions,
  buildInitialQuestions,
  buildQuestion,
  buildSessionTargetKeys,
  hasReachedHardCap,
  isSessionComplete,
  permutationKey,
  resolveTargetFamilies,
  selectTable,
} from "./session";
import { MAX_STAGE, familyPool } from "./mastery";
import { UNLOCK_STAGE_THRESHOLD } from "./curriculum";
import { FamilyMastery } from "./stores/types";

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

describe("selectTable", () => {
  const pool = familyPool("add"); // all 36 families
  const stubMastery = (stage: number): FamilyMastery => ({
    stage,
    timesSeen: 5,
    timesCorrect: 5,
    lastSeen: null,
  });
  // Everything won except the first `count` families, which are still in
  // Ziggy's hand.
  function mostlyWon(count: number) {
    const inHand = new Set(pool.slice(0, count).map((f) => f.key));
    return (key: string) => stubMastery(inHand.has(key) ? 0 : MAX_STAGE);
  }

  it("seats no more than a full table, however many families are in play", () => {
    const table = selectTable(pool, () => undefined, { rng: lcgRng(1) });
    expect(table).toHaveLength(TABLE_MAX_SEATS);
  });

  it("seats every family when there are fewer than a full table in play", () => {
    const small = pool.slice(0, 4);
    const table = selectTable(small, () => undefined, { rng: lcgRng(1) });
    expect(new Set(table.map((f) => f.key))).toEqual(new Set(small.map((f) => f.key)));
  });

  it("never seats the same family twice", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const table = selectTable(pool, () => undefined, { rng: lcgRng(seed) });
      expect(new Set(table.map((f) => f.key)).size).toBe(table.length);
    }
  });

  it("keeps all but the review seat for cards still in Ziggy's hand", () => {
    const getMastery = mostlyWon(20);
    for (let seed = 1; seed <= 25; seed++) {
      const table = selectTable(pool, getMastery, { rng: lcgRng(seed) });
      const won = table.filter((f) => getMastery(f.key).stage >= UNLOCK_STAGE_THRESHOLD);
      expect(won).toHaveLength(TABLE_REVIEW_SEATS);
    }
  });

  it("fills the spare seats with won cards once few are left in Ziggy's hand", () => {
    // Only two families still unwon: they take two seats, review takes the
    // rest rather than the table shrinking.
    const getMastery = mostlyWon(2);
    const table = selectTable(pool, getMastery, { rng: lcgRng(3) });
    expect(table).toHaveLength(TABLE_MAX_SEATS);
    const inHand = table.filter((f) => getMastery(f.key).stage < UNLOCK_STAGE_THRESHOLD);
    expect(inHand).toHaveLength(2);
  });

  it("always seats a required family, whatever the weighting says", () => {
    // A fully-mastered family at the end of the teaching order is about the
    // least likely card to be seated on its own merits.
    const required = pool[pool.length - 1];
    const getMastery = (key: string) =>
      stubMastery(key === required.key ? MAX_STAGE : UNLOCK_STAGE_THRESHOLD - 1);
    for (let seed = 1; seed <= 25; seed++) {
      const table = selectTable(pool, getMastery, {
        rng: lcgRng(seed),
        requiredKeys: [required.key],
      });
      expect(table.map((f) => f.key)).toContain(required.key);
      expect(table).toHaveLength(TABLE_MAX_SEATS);
    }
  });

  it("favours the weakest cards in Ziggy's hand", () => {
    // One never-promoted family among 35 that are one step short of won —
    // all in Ziggy's hand, so they compete for the same seats and the only
    // thing separating them is mastery weight.
    const weak = pool[10];
    const peer = pool[11];
    const getMastery = (key: string) =>
      stubMastery(key === weak.key ? 0 : UNLOCK_STAGE_THRESHOLD - 1);
    let weakSeated = 0;
    let peerSeated = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const table = selectTable(pool, getMastery, { rng: lcgRng(seed) });
      if (table.some((f) => f.key === weak.key)) weakSeated += 1;
      if (table.some((f) => f.key === peer.key)) peerSeated += 1;
    }
    expect(weakSeated).toBeGreaterThan(peerSeated);
  });
});

// Plays a whole session out over the pure session API, mirroring what
// usePlaySession does with it: seat a table, ask both operators of every
// seated family, then keep drawing follow-up batches until the table is clean
// or the hard cap stops things. `missChance` is the odds of the simulated
// player getting a question wrong; the two-miss rule means a missed question
// simply ends uncleared rather than being tapped at until it's right.
function simulateSession(options: {
  pool: ReturnType<typeof familyPool>;
  rng: () => number;
  missChance: number;
}) {
  const { pool, rng, missChance } = options;
  const table = selectTable(pool, () => undefined, { rng });
  const targetKeys = buildSessionTargetKeys("add", table);
  const statuses: Record<string, SessionFamilyStatus> = Object.fromEntries(
    targetKeys.map((key) => [key, "pending" as const]),
  );
  const questions = buildInitialQuestions("add", table);

  let asked = 0;
  for (let index = 0; ; index++) {
    if (index >= questions.length) {
      questions.push(...buildFollowUpQuestions("add", table, statuses, 4, { rng }));
    }
    const question = questions[index];
    asked += 1;
    statuses[permutationKey(question.familyKey, question.operator)] =
      rng() < missChance ? "retry" : "clean";
    if (isSessionComplete(statuses, targetKeys)) return { asked, cleanPass: true };
    // Elapsed time is left at 0: this measures the question cap, and the
    // simulated player answers instantly.
    if (hasReachedHardCap(asked, 0)) return { asked, cleanPass: false };
  }
}

describe("session length", () => {
  const pool = familyPool("add"); // the endgame: all 36 families in play

  it("is completable with every family in play, and short", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const result = simulateSession({ pool, rng: lcgRng(seed), missChance: 0 });
      expect(result.cleanPass).toBe(true);
      // Both operators of every seated family, and not one question more —
      // the session's floor is the table, not the collection.
      expect(result.asked).toBe(TABLE_MAX_SEATS * 2);
    }
  });

  it("still ends on a clean pass for a player missing a quarter of the time", () => {
    let cleanPasses = 0;
    let total = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const result = simulateSession({ pool, rng: lcgRng(seed), missChance: 0.25 });
      if (result.cleanPass) cleanPasses += 1;
      total += result.asked;
    }
    // The hard cap is meant to be a rare fallback, not the usual ending.
    expect(cleanPasses / 200).toBeGreaterThan(0.9);
    expect(total / 200).toBeLessThan(SESSION_MAX_QUESTIONS);
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

  it("asks only about permutations that still need clearing", () => {
    const retryFamily = pool[0];
    // Every permutation clean except one operator of one family.
    const statuses: Record<string, SessionFamilyStatus> = Object.fromEntries(
      buildSessionTargetKeys("add", pool).map((key) => [key, "clean" as const]),
    );
    statuses[permutationKey(retryFamily.key, "+")] = "retry";

    const questions = buildFollowUpQuestions("add", pool, statuses, 2000, { rng: lcgRng(11) });
    // Not "mostly" — re-asking a clean permutation can only knock it back to
    // "retry", so a session's follow-ups never do it.
    expect(questions.every((q) => q.familyKey === retryFamily.key && q.operator === "+")).toBe(
      true,
    );
  });

  it("falls back to the full set if asked for a batch with nothing left to clear", () => {
    const statuses: Record<string, SessionFamilyStatus> = Object.fromEntries(
      buildSessionTargetKeys("add", pool).map((key) => [key, "clean" as const]),
    );
    const questions = buildFollowUpQuestions("add", pool, statuses, 10, { rng: lcgRng(4) });
    expect(questions).toHaveLength(10);
  });

  it("treats permutations never seen this session ('pending') as needing clearing too", () => {
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
