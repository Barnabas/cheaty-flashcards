import { Level, Operator, Question, Section } from "./types";
import { FamilyMastery } from "./stores/types";
import { familyPool, operatorGroup, operatorsForGroup, selectFamilies } from "./mastery";
import { shuffle } from "./utils";

const sections: Section[] = [
  {
    name: "Addition",
    id: "add",
    operator: "+",
  },
  {
    name: "Subtraction",
    id: "subtract",
    operator: "-",
  },
  {
    name: "Multiplication",
    id: "multiply",
    operator: "×",
  },
  {
    name: "Division",
    id: "divide",
    operator: "÷",
  },
];

type GenerateOptions = {
  level: number;
  questionCount: number;
  answerCount: number;
  // Restrict/bias the weighted pool toward families touching these numbers
  // ("work on my 7s and 8s").
  focusNumbers?: number[];
  // Pairs inverse operations from the same fact-family group (+/- or ×/÷)
  // into one practice session, matching how fact families are taught.
  mixed?: boolean;
  // Mastery lookup driving the weighted sampling; omit for a uniform pool
  // (e.g. tests, or before any mastery data exists).
  getMastery?: (key: string) => FamilyMastery | undefined;
  rng?: () => number;
};

export function getLevelName(section?: Section, level?: number) {
  if (!section || !level) return "";
  return [section.operator, level + 1].join(" ");
}

function buildQuestion(
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

export function generateLevel(section: Section, options: GenerateOptions): Level {
  const name = getLevelName(section, options.level);
  const group = operatorGroup(section.operator);
  const pool = familyPool(group);
  const getMastery = options.getMastery ?? (() => undefined);
  const rng = options.rng ?? Math.random;
  const [opA, opB] = operatorsForGroup(group);
  const inverseOperator = section.operator === opA ? opB : opA;

  const families = selectFamilies(pool, getMastery, options.questionCount, {
    focusNumbers: options.focusNumbers,
    rng,
  });

  const questions = families.map((family) => {
    const operator = options.mixed && rng() < 0.5 ? inverseOperator : section.operator;
    return buildQuestion(operator, family.a, family.b, family.key, options.answerCount);
  });

  return { name, level: options.level, questions: shuffle(questions) };
}

export { sections };
