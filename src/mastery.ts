import { Operator } from "./types";
import { FamilyMastery } from "./stores/types";

export const MAX_STAGE = 5;
export const MIN_FACTOR = 2;
export const MAX_FACTOR = 9;
export const FAST_RESPONSE_MS = 3000;

export type OperatorGroup = "add" | "multiply";

export type MasteryOutcome = "correct-fast" | "correct-slow" | "wrong" | "cheated";

export type FactFamily = {
  group: OperatorGroup;
  a: number;
  b: number;
  key: string;
};

const emptyMastery: FamilyMastery = { stage: 0, timesSeen: 0, timesCorrect: 0, lastSeen: null };

export function operatorGroup(operator: Operator): OperatorGroup {
  return operator === "+" || operator === "-" ? "add" : "multiply";
}

// Inverse operator within the same fact family (the pairing used by mixed
// practice mode): + <-> -, × <-> ÷.
export function operatorsForGroup(group: OperatorGroup): [Operator, Operator] {
  return group === "add" ? ["+", "-"] : ["×", "÷"];
}

// Key encodes the full fact-family triple (two factors + their sum/product),
// matching the {3,6,9} / {3,6,18}-style grouping described in the plan.
export function factFamilyKey(group: OperatorGroup, a: number, b: number): string {
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  const c = group === "add" ? lo + hi : lo * hi;
  return `${group}:${lo},${hi},${c}`;
}

export function familyPool(
  group: OperatorGroup,
  min: number = MIN_FACTOR,
  max: number = MAX_FACTOR,
): FactFamily[] {
  const pool: FactFamily[] = [];
  for (let a = min; a <= max; a++) {
    for (let b = a; b <= max; b++) {
      pool.push({ group, a, b, key: factFamilyKey(group, a, b) });
    }
  }
  return pool;
}

// Pure Leitner-style stage transition for one attempt at a fact family.
// - correct-fast promotes (caps at MAX_STAGE)
// - correct-slow holds the stage (right, but not yet automatic)
// - wrong demotes (floors at 0)
// - cheated (hint used) holds the stage and doesn't count as earned-correct,
//   since the answer wasn't recalled from memory
export function applyOutcome(
  mastery: FamilyMastery | undefined,
  outcome: MasteryOutcome,
  now: number = Date.now(),
): FamilyMastery {
  const current = mastery ?? emptyMastery;
  let stage = current.stage;
  let timesCorrect = current.timesCorrect;

  switch (outcome) {
    case "correct-fast":
      stage = Math.min(MAX_STAGE, stage + 1);
      timesCorrect += 1;
      break;
    case "correct-slow":
      timesCorrect += 1;
      break;
    case "wrong":
      stage = Math.max(0, stage - 1);
      break;
    case "cheated":
      break;
  }

  return {
    stage,
    timesSeen: current.timesSeen + 1,
    timesCorrect,
    lastSeen: now,
  };
}

// Lower stage -> higher weight (more practice needed). Never zero, so fully
// mastered families still get interleaved in for review.
export function familyWeight(mastery: FamilyMastery | undefined): number {
  const stage = mastery?.stage ?? 0;
  return MAX_STAGE - stage + 1;
}

export function weightedPick<T>(items: T[], weights: number[], rng: () => number = Math.random): T {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export type SelectFamiliesOptions = {
  focusNumbers?: number[];
  rng?: () => number;
  // Extra per-family weight scaling on top of the mastery-driven weight —
  // e.g. a session generator boosting families it wants re-drilled this
  // session. Defaults to a no-op (weight ×1) for existing callers.
  weightMultiplier?: (key: string) => number;
};

// Weighted sample (with replacement) of `count` families from `pool`, biased
// toward whatever `getMastery` reports as low-stage. `focusNumbers`
// restricts the pool to families touching at least one of those numbers,
// falling back to the full pool if that filter would leave nothing.
export function selectFamilies(
  pool: FactFamily[],
  getMastery: (key: string) => FamilyMastery | undefined,
  count: number,
  options: SelectFamiliesOptions = {},
): FactFamily[] {
  const { focusNumbers, rng = Math.random, weightMultiplier = () => 1 } = options;
  let candidates = pool;
  if (focusNumbers && focusNumbers.length > 0) {
    const focusSet = new Set(focusNumbers);
    const filtered = pool.filter((f) => focusSet.has(f.a) || focusSet.has(f.b));
    if (filtered.length > 0) candidates = filtered;
  }

  const weights = candidates.map((f) => familyWeight(getMastery(f.key)) * weightMultiplier(f.key));
  const result: FactFamily[] = [];
  for (let i = 0; i < count; i++) {
    result.push(weightedPick(candidates, weights, rng));
  }
  return result;
}
