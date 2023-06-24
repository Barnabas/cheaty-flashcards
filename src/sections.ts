import { Level, Question, Section } from "./types";
import { shuffle } from "./utils";

const sections: Section[] = [
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

export function generateLevel(
  section: Section,
  level: number,
  size: number,
  answerCount: number = 4
): Level {
  const questions: Question[] = [];
  for (let question = 1; question <= size; question++) {
    let factorA = level + 1;
    let factorB = (question % 8) + 2;
    let correct: number = -1;
    let factors: number[] = [];
    let wrong = new Set<number>();

    switch (section.operator) {
      case "×":
        factors = [factorA, factorB];
        correct = factorA * factorB;
        if (factorA > 1) wrong.add((factorA - 1) * factorB);
        if (factorB > 1) wrong.add(factorA * (factorB - 1));
        if (factorA > 2) wrong.add((factorA - 2) * factorB);
        if (factorB > 2) wrong.add(factorA * (factorB - 2));
        if (factorA < 10) wrong.add((factorA + 1) * factorB);
        if (factorB < 10) wrong.add(factorA * (factorB + 1));
        if (factorA < 9) wrong.add((factorA + 2) * factorB);
        if (factorB < 9) wrong.add(factorA * (factorB + 2));
        break;
      case "÷":
        factors = [factorA * factorB, factorA];
        correct = factorB;
        if (factorB > 1) wrong.add(factorB - 1);
        if (factorB > 2) wrong.add(factorB - 2);
        if (factorB < 10) wrong.add(factorB + 1);
        if (factorB < 9) wrong.add(factorB + 2);
        break;
    }

    const wrongAnswers = shuffle([...wrong]).slice(0, answerCount - 1);
    questions.push({
      factors,
      correct,
      answers: shuffle([correct, ...wrongAnswers]),
    });
  }
  return { level, questions: shuffle(questions) };
}

export { sections };
