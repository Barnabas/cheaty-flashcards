// Dynamic session composition (Phase 8): replaces the old fixed-length,
// level-numbered generateLevel(). A session targets a set of fact families
// and keeps drilling until every one gets a clean pass, or a hard cap kicks
// in so a struggling player still gets to stop.
//
// Phase 12 narrowed what "a set of fact families" means: a session seats a
// *table* of at most TABLE_MAX_SEATS families (see selectTable below) rather
// than every curriculum-active one. The clean-pass condition is scoped to the
// table, which is what keeps a session ~2 minutes whether the player has 4
// cards in play or all 36 — see docs/game-vision.md.
import { Operator, Question } from "./types";
import { FamilyMastery } from "./stores/types";
import {
  FactFamily,
  OperatorGroup,
  familyWeight,
  operatorsForGroup,
  selectFamilies,
  weightedPick,
} from "./mastery";
import { UNLOCK_STAGE_THRESHOLD, curriculumOrder } from "./curriculum";
import { shuffle } from "./utils";

export const GROUP_LABELS: Record<OperatorGroup, string> = {
  add: "Addition & Subtraction",
  multiply: "Multiplication & Division",
};

// The fallback ending, not the normal one: a session is meant to finish on a
// clean pass of its table (12 questions for a full 6-card table), and these
// only catch a player who keeps missing. See docs/plan-notes/phase-12.md for
// the simulation the numbers are tuned against.
export const SESSION_MAX_QUESTIONS = 24;
export const SESSION_MAX_MS = 3 * 60 * 1000;

// How many fact families a session seats. The starter curriculum is 4
// families, so early tables are smaller than this by nature and grow to a
// full table as cards are dealt; from then on the table size — and so the
// session length — stops growing.
export const TABLE_MAX_SEATS = 6;
// Seats held back for a card the player has already won, so a session is
// mostly the work in front of them plus a little defence of what they hold.
export const TABLE_REVIEW_SEATS = 1;

const DEFAULT_ANSWER_COUNT = 5;

// Progress of one (family, operator) permutation within the current session
// — e.g. a family in the "add" group has a "+" permutation and a "-"
// permutation tracked separately, so getting 3+4 right doesn't let 7-4 go
// unpracticed. "clean" once answered correctly without a hint; "retry" if
// its most recent attempt was wrong or cheated; "pending" if not yet
// attempted.
export type SessionFamilyStatus = "pending" | "clean" | "retry";

// Composite key identifying one (family, operator) permutation for session
// status tracking — distinct from the family's own `key`, which mastery.ts
// uses and which doesn't distinguish operators.
export function permutationKey(familyKey: string, operator: Operator): string {
  return `${familyKey}::${operator}`;
}

type Permutation = { family: FactFamily; operator: Operator; key: string };

function buildPermutations(group: OperatorGroup, pool: FactFamily[]): Permutation[] {
  const [opA, opB] = operatorsForGroup(group);
  return pool.flatMap((family) => [
    { family, operator: opA, key: permutationKey(family.key, opA) },
    { family, operator: opB, key: permutationKey(family.key, opB) },
  ]);
}

// Every (family, operator) permutation a session must clear before it's
// allowed to end — both operators, not just whichever one a given question
// happened to draw.
export function buildSessionTargetKeys(group: OperatorGroup, families: FactFamily[]): string[] {
  return buildPermutations(group, families).map((p) => p.key);
}

export function buildQuestion(
  operator: Operator,
  a: number,
  b: number,
  key: string,
  answerCount: number,
): Question {
  let correct: number = -1;
  let factors: number[] = [];
  let wrong = new Set<number>();

  const addWrong = (factor: number, max: number = 100) => {
    if (factor > 1 && factor < max) wrong.add(factor);
  };

  switch (operator) {
    case "×":
      factors = [a, b];
      correct = a * b;
      [1, 2].forEach((i) => {
        if (a - i > 1) addWrong((a - i) * b);
        if (b - i > 1) addWrong(a * (b - i));
        addWrong((a + i) * b);
        addWrong(a * (b + i));
        addWrong(correct + i);
        addWrong(correct - i);
      });
      break;
    case "÷":
      factors = [a * b, a];
      correct = b;
      [1, 2, 3].forEach((i) => {
        addWrong(b - i, 10);
        addWrong(b + i, 10);
      });
      break;
    case "+":
      factors = [a, b];
      correct = a + b;
      [1, 2, 3, 4].forEach((i) => {
        addWrong(correct + i, 19);
        addWrong(correct - i, 19);
      });
      break;
    case "-":
      factors = [a + b, a];
      correct = b;
      [1, 2, 3, 4].forEach((i) => {
        addWrong(correct + i, 10);
        addWrong(correct - i, 10);
      });
      break;
  }

  const wrongAnswers = shuffle([...wrong]).slice(0, answerCount - 1);
  return {
    operator,
    familyKey: key,
    factors,
    correct,
    answers: shuffle([correct, ...wrongAnswers]),
  };
}

// Restricts a family list to those touching at least one of `focusNumbers`
// ("work on my 7s and 8s"), falling back to the full list if that filter
// would leave nothing — same fallback behavior the old per-level focus
// filter had.
export function resolveTargetFamilies(
  families: FactFamily[],
  focusNumbers?: number[],
): FactFamily[] {
  if (!focusNumbers || focusNumbers.length === 0) return families;
  const focusSet = new Set(focusNumbers);
  const filtered = families.filter((f) => focusSet.has(f.a) || focusSet.has(f.b));
  return filtered.length > 0 ? filtered : families;
}

export type TableOptions = {
  seats?: number;
  rng?: () => number;
  // Families that must be seated whatever the weighting says — the card Ziggy
  // just dealt, which the intro is about to point at and call new.
  requiredKeys?: string[];
};

// Seats the table for one session: a handful of families out of everything
// the player has in play, chosen by need. Cards still in Ziggy's hand (below
// the winning stage) take every seat but one; the last is a review seat for a
// card the player has already won, so holding onto what you have is part of
// the session rather than a separate mode. When there aren't enough unwon
// cards to fill the table — late game, or a narrow ?focus= — won cards take
// the spare seats instead.
//
// Within each of those groups the pick is the same mastery-weighted sampler
// the questions use, without replacement, so the weakest cards are the most
// likely to be seated without any card being permanently unseatable.
export function selectTable(
  pool: FactFamily[],
  getMastery: (key: string) => FamilyMastery | undefined,
  options: TableOptions = {},
): FactFamily[] {
  const { seats = TABLE_MAX_SEATS, rng = Math.random, requiredKeys = [] } = options;
  const size = Math.min(seats, pool.length);
  const required = new Set(requiredKeys);

  const seated = pool.filter((f) => required.has(f.key)).slice(0, size);
  const rest = pool.filter((f) => !required.has(f.key));
  const isWon = (f: FactFamily) => (getMastery(f.key)?.stage ?? 0) >= UNLOCK_STAGE_THRESHOLD;
  const inHand = rest.filter((f) => !isWon(f));
  const won = rest.filter(isWon);

  const free = size - seated.length;
  const reviewSeats = Math.min(won.length, TABLE_REVIEW_SEATS);
  const handSeats = Math.max(0, Math.min(inHand.length, free - reviewSeats));
  const wonSeats = Math.max(0, Math.min(won.length, free - handSeats));

  seated.push(
    ...selectFamilies(inHand, getMastery, handSeats, { rng, distinct: true }),
    ...selectFamilies(won, getMastery, wonSeats, { rng, distinct: true }),
  );
  // Teaching order, so the intro reads smallest-fact-first however the seats
  // were filled.
  return curriculumOrder(seated);
}

type QuestionOptions = {
  getMastery?: (key: string) => FamilyMastery | undefined;
  rng?: () => number;
  answerCount?: number;
};

// Both operators for every family, in shuffled order — one question each for
// e.g. "3 + 4" and "7 - 4", not a coin-flipped pick between them. This is
// what guarantees a real minimum session length: every permutation a new
// family introduces gets visited at least once up front, rather than a
// session being able to end the moment one lucky guess per family lands.
export function buildInitialQuestions(
  group: OperatorGroup,
  families: FactFamily[],
  options: QuestionOptions = {},
): Question[] {
  const { answerCount = DEFAULT_ANSWER_COUNT } = options;
  const questions = buildPermutations(group, families).map((p) =>
    buildQuestion(p.operator, p.family.a, p.family.b, p.family.key, answerCount),
  );
  return shuffle(questions);
}

// Follow-up batch once the initial pass is done but the session isn't
// complete yet: a mastery-weighted sample of only the (family, operator)
// permutations still standing between the player and the end of the session —
// never seen this session, or most recently wrong/cheated.
//
// Phase 12 narrowed this from "boost the unclean ones" to "ask nothing else".
// Re-asking an already-clean permutation can only ever knock it back to
// "retry", which on a 12-permutation table made a struggling player's session
// a random walk that often only ended at the hard cap — the very thing the
// cap is supposed to be a rare fallback for. Review of cards the player
// already holds is the table's job now (see selectTable), not the follow-up
// batch's.
export function buildFollowUpQuestions(
  group: OperatorGroup,
  pool: FactFamily[],
  statuses: Record<string, SessionFamilyStatus>,
  count: number,
  options: QuestionOptions = {},
): Question[] {
  const {
    getMastery = () => undefined,
    rng = Math.random,
    answerCount = DEFAULT_ANSWER_COUNT,
  } = options;
  const permutations = buildPermutations(group, pool);
  // Defensive fallback: a session with nothing left to clear has already
  // ended, so this only matters if a caller asks for a batch anyway.
  const unclean = permutations.filter((p) => statuses[p.key] !== "clean");
  const candidates = unclean.length > 0 ? unclean : permutations;
  const weights = candidates.map((p) => familyWeight(getMastery(p.family.key)));
  const picks: Permutation[] = [];
  for (let i = 0; i < count; i++) {
    picks.push(weightedPick(candidates, weights, rng));
  }
  return picks.map((p) =>
    buildQuestion(p.operator, p.family.a, p.family.b, p.family.key, answerCount),
  );
}

// A session finishes early once every target (family, operator) permutation
// has been cleared at least once — "pending" or "retry" permutations keep
// it going, which means both directions of every target family (e.g. "+"
// and "-") must land clean, not just whichever one came up first.
export function isSessionComplete(
  statuses: Record<string, SessionFamilyStatus>,
  targetKeys: string[],
): boolean {
  return targetKeys.length > 0 && targetKeys.every((key) => statuses[key] === "clean");
}

// Fallback so a struggling player still gets to stop, regardless of how
// many families remain uncleared.
export function hasReachedHardCap(questionsAsked: number, elapsedMs: number): boolean {
  return questionsAsked >= SESSION_MAX_QUESTIONS || elapsedMs >= SESSION_MAX_MS;
}
