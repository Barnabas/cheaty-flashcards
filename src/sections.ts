import { Level, Question, Section } from "./types";
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

    const addWrong = (factor: number, max: number = 100) => {
      if (factor > 1 && factor < max) wrong.add(factor);
    };

    switch (section.operator) {
      case "×":
        factors = [factorA, factorB];
        correct = factorA * factorB;
        [1, 2].forEach((i) => {
          if(factorA - i > 1) addWrong((factorA - i) * factorB);
          if(factorB - i > 1) addWrong(factorA * (factorB - i));
          addWrong((factorA + i) * factorB);
          addWrong(factorA * (factorB + i));
          addWrong(correct + i);
          addWrong(correct - i);
        });
        break;
      case "÷":
        factors = [factorA * factorB, factorA];
        correct = factorB;
        [1, 2, 3].forEach((i) => {
          addWrong(factorB - i, 10);
          addWrong(factorB + i, 10);
        });
        break;
      case "+":
        factors = [factorA, factorB];
        correct = factorA + factorB;
        [1, 2, 3, 4].forEach((i) => {
          addWrong(correct + i, 19);
          addWrong(correct - i, 19);
        });
        break;
      case "-":
        factors = [factorA + factorB, factorA];
        correct = factorB;
        [1, 2, 3, 4].forEach((i) => {
          addWrong(correct + i, 10);
          addWrong(correct - i, 10);
        });
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
