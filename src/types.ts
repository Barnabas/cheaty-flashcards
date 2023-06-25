export type Operator = "+" | "-" | "×" | "÷";

export type Question = {
  factors: number[];
  correct: number;
  answers: number[];
};

export type Level = {
  level: number;
  questions: Question[];
};

export type Section = {
  name: string;
  id: string;
  operator: Operator;
};

export type AnswerType = "wrong" | "right" | "hint" | "hide";

export type LevelSummary = {
  levelTime: string,
  questionsCorrect: number,
  percentCorrect: string,
  points: number,
  questionAverageTime: string
}
