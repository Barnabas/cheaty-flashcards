export type Operator = "+" | "-" | "×" | "÷";

export type Question = {
  operator: Operator;
  familyKey: string;
  factors: number[];
  correct: number;
  answers: number[];
};

export type Level = {
  level: number;
  name: string;
  questions: Question[];
};

export type Section = {
  name: string;
  id: string;
  operator: Operator;
};

export type AnswerType = "wrong" | "right" | "hint" | "hide";

export type LevelSummary = {
  levelTime: number;
  questionsCorrect: number;
  percentCorrect: number;
  questionTimeAverage: number;
  questionTimeMax: number;
  message: string;
};
