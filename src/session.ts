// Dynamic session composition (Phase 8): replaces the old fixed-length,
// level-numbered generateLevel(). A session targets a set of curriculum-
// active fact families and keeps drilling until every one gets a clean
// pass, or a hard cap kicks in so a struggling player still gets to stop.
import { Operator, Question } from "./types";
import { FamilyMastery } from "./stores/types";
import {
  FactFamily,
  OperatorGroup,
  familyWeight,
  operatorsForGroup,
  weightedPick,
} from "./mastery";
import { shuffle } from "./utils";

export const GROUP_LABELS: Record<OperatorGroup, string> = {
  add: "Addition & Subtraction",
  multiply: "Multiplication & Division",
};

// Rough starting numbers (see docs/open-questions.md's Phase 8 entry) — a
// session ends early on a clean pass, but never runs longer than this regardless.
export const SESSION_MAX_QUESTIONS = 20;
export const SESSION_MAX_MS = 3 * 60 * 1000;

const DEFAULT_ANSWER_COUNT = 5;
// Extra sampling weight for a (family, operator) permutation that still
// needs coverage this session — either never seen yet, or its most recent
// attempt was wrong/cheated — on top of its long-run mastery weight. Applies
// equally to "pending" and "retry" so an unseen permutation gets pulled into
// follow-up batches just as eagerly as a missed one, which is what turns
// "every target family clears" into a real minimum session length instead of
// one lucky guess per family ending things.
const RETRY_WEIGHT_BOOST = 4;

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
// complete yet: weighted sample of (family, operator) permutations biased
// heavily toward ones not yet "clean" — never seen this session, or most
// recently wrong/cheated — with occasional interleaved review of already-
// clean permutations (via the normal mastery-driven weight all permutations
// keep getting).
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
  const candidates = buildPermutations(group, pool);
  const weights = candidates.map(
    (p) =>
      familyWeight(getMastery(p.family.key)) *
      (statuses[p.key] === "clean" ? 1 : RETRY_WEIGHT_BOOST),
  );
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
