import { describe, expect, it } from "vite-plus/test";
import {
  MAX_STAGE,
  applyOutcome,
  factFamilyKey,
  familyPool,
  familyWeight,
  operatorGroup,
  operatorsForGroup,
  selectFamilies,
  weightedPick,
} from "./mastery";
import { FamilyMastery } from "./stores/types";

describe("operatorGroup", () => {
  it("groups + and - together, × and ÷ together", () => {
    expect(operatorGroup("+")).toBe("add");
    expect(operatorGroup("-")).toBe("add");
    expect(operatorGroup("×")).toBe("multiply");
    expect(operatorGroup("÷")).toBe("multiply");
  });
});

describe("operatorsForGroup", () => {
  it("returns the inverse-operator pair for each group", () => {
    expect(operatorsForGroup("add")).toEqual(["+", "-"]);
    expect(operatorsForGroup("multiply")).toEqual(["×", "÷"]);
  });
});

describe("factFamilyKey", () => {
  it("encodes the triple of two factors plus their sum for add families", () => {
    expect(factFamilyKey("add", 3, 6)).toBe("add:3,6,9");
  });

  it("encodes the triple of two factors plus their product for multiply families", () => {
    expect(factFamilyKey("multiply", 3, 6)).toBe("multiply:3,6,18");
  });

  it("is order-independent", () => {
    expect(factFamilyKey("add", 6, 3)).toBe(factFamilyKey("add", 3, 6));
    expect(factFamilyKey("multiply", 6, 3)).toBe(factFamilyKey("multiply", 3, 6));
  });
});

describe("familyPool", () => {
  it("generates every unordered pair within the range, keys deduplicated", () => {
    const pool = familyPool("add", 2, 4);
    // pairs: (2,2) (2,3) (2,4) (3,3) (3,4) (4,4)
    expect(pool).toHaveLength(6);
    expect(new Set(pool.map((f) => f.key)).size).toBe(6);
  });
});

describe("applyOutcome", () => {
  const base: FamilyMastery = { stage: 2, timesSeen: 10, timesCorrect: 5, lastSeen: null };

  it("promotes on correct-fast, capped at MAX_STAGE", () => {
    expect(applyOutcome(base, "correct-fast", 100)).toMatchObject({
      stage: 3,
      timesSeen: 11,
      timesCorrect: 6,
      lastSeen: 100,
    });
    const atCap: FamilyMastery = { ...base, stage: MAX_STAGE };
    expect(applyOutcome(atCap, "correct-fast").stage).toBe(MAX_STAGE);
  });

  it("holds stage on correct-slow but still counts the correct answer", () => {
    expect(applyOutcome(base, "correct-slow", 100)).toMatchObject({
      stage: 2,
      timesCorrect: 6,
    });
  });

  it("demotes on wrong, floored at 0", () => {
    expect(applyOutcome(base, "wrong", 100)).toMatchObject({ stage: 1, timesCorrect: 5 });
    const atFloor: FamilyMastery = { ...base, stage: 0 };
    expect(applyOutcome(atFloor, "wrong").stage).toBe(0);
  });

  it("holds stage and grants no credit on cheated", () => {
    expect(applyOutcome(base, "cheated", 100)).toMatchObject({
      stage: 2,
      timesCorrect: 5,
      timesSeen: 11,
    });
  });

  it("treats a missing record as a fresh, unseen family", () => {
    expect(applyOutcome(undefined, "correct-fast", 100)).toMatchObject({
      stage: 1,
      timesSeen: 1,
      timesCorrect: 1,
    });
  });
});

describe("familyWeight", () => {
  it("decreases monotonically as stage increases, never reaching zero", () => {
    const weights = Array.from({ length: MAX_STAGE + 1 }, (_, stage) =>
      familyWeight({ stage, timesSeen: 0, timesCorrect: 0, lastSeen: null }),
    );
    for (let i = 1; i < weights.length; i++) {
      expect(weights[i]).toBeLessThan(weights[i - 1]);
    }
    expect(weights[weights.length - 1]).toBeGreaterThan(0);
  });

  it("treats an unseen family the same as stage 0", () => {
    expect(familyWeight(undefined)).toBe(
      familyWeight({ stage: 0, timesSeen: 0, timesCorrect: 0, lastSeen: null }),
    );
  });
});

describe("weightedPick", () => {
  it("always picks the only item with nonzero weight", () => {
    const rng = () => 0.999;
    expect(weightedPick(["a", "b", "c"], [0, 5, 0], rng)).toBe("b");
  });

  it("distributes picks proportionally to weight over many draws", () => {
    const items = ["low", "high"];
    const weights = [1, 3];
    let counts = { low: 0, high: 0 };
    let seed = 1;
    const rng = () => {
      // deterministic LCG so the test is reproducible
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let i = 0; i < 4000; i++) {
      const pick = weightedPick(items, weights, rng);
      counts[pick as "low" | "high"] += 1;
    }
    const ratio = counts.high / counts.low;
    // expected ratio ~3, allow generous tolerance for RNG noise
    expect(ratio).toBeGreaterThan(2);
    expect(ratio).toBeLessThan(4.5);
  });
});

describe("selectFamilies", () => {
  const pool = familyPool("add", 2, 4);

  it("returns exactly `count` families, sampled with replacement", () => {
    const result = selectFamilies(pool, () => undefined, 20, { rng: () => 0.5 });
    expect(result).toHaveLength(20);
  });

  it("biases heavily toward low-mastery families over many draws", () => {
    const weak = pool[0];
    const mastered: Record<string, FamilyMastery> = {};
    for (const f of pool) {
      if (f.key !== weak.key)
        mastered[f.key] = { stage: MAX_STAGE, timesSeen: 1, timesCorrect: 1, lastSeen: null };
    }
    let seed = 42;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const result = selectFamilies(pool, (key) => mastered[key], 2000, { rng });
    const weakCount = result.filter((f) => f.key === weak.key).length;
    // weak family (weight 6) vs 5 mastered families (weight 1 each, total 5)
    // -> weak family should account for roughly 6/11 of draws
    expect(weakCount / result.length).toBeGreaterThan(0.4);
  });

  it("restricts the pool to families touching a focus number", () => {
    const result = selectFamilies(pool, () => undefined, 50, {
      focusNumbers: [4],
      rng: () => 0.5,
    });
    expect(result.every((f) => f.a === 4 || f.b === 4)).toBe(true);
  });

  it("falls back to the full pool when the focus filter matches nothing", () => {
    const result = selectFamilies(pool, () => undefined, 10, {
      focusNumbers: [999],
      rng: () => 0.5,
    });
    expect(result).toHaveLength(10);
  });

  it("never repeats a family when sampling `distinct`", () => {
    const result = selectFamilies(pool, () => undefined, 4, { rng: () => 0.5, distinct: true });
    expect(result).toHaveLength(4);
    expect(new Set(result.map((f) => f.key)).size).toBe(4);
  });

  it("returns the whole pool, not an infinite loop, when `distinct` runs out", () => {
    const result = selectFamilies(pool, () => undefined, 99, { rng: () => 0.5, distinct: true });
    expect(result).toHaveLength(pool.length);
  });

  it("still weights by mastery when sampling `distinct`", () => {
    const weak = pool[0];
    const mastered: Record<string, FamilyMastery> = {};
    for (const f of pool) {
      if (f.key !== weak.key)
        mastered[f.key] = { stage: MAX_STAGE, timesSeen: 1, timesCorrect: 1, lastSeen: null };
    }
    let seed = 42;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    let firstPickedWeak = 0;
    for (let i = 0; i < 200; i++) {
      const result = selectFamilies(pool, (key) => mastered[key], 2, { rng, distinct: true });
      if (result[0].key === weak.key) firstPickedWeak += 1;
    }
    // Weight 6 against 5 mastered families at weight 1 -> roughly 6/11 of
    // first picks, versus 1/6 if distinctness had flattened the weights.
    expect(firstPickedWeak / 200).toBeGreaterThan(0.4);
  });

  it("boosts families via weightMultiplier on top of mastery weight", () => {
    const boosted = pool[0];
    let seed = 5;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const result = selectFamilies(pool, () => undefined, 2000, {
      rng,
      weightMultiplier: (key) => (key === boosted.key ? 10 : 1),
    });
    const boostedCount = result.filter((f) => f.key === boosted.key).length;
    // boosted family weight 10 vs 5 others at weight 1 each (total 5) ->
    // expected share is 10/15 ~= 0.67, well above an unboosted ~1/6.
    expect(boostedCount / result.length).toBeGreaterThan(0.5);
  });
});
