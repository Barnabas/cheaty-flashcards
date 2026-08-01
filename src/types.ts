export type Operator = "+" | "-" | "×" | "÷";

export type Question = {
  operator: Operator;
  familyKey: string;
  factors: number[];
  correct: number;
  answers: number[];
};

export type AnswerType = "wrong" | "right" | "hint" | "hide";

export type SessionSummary = {
  sessionTime: number;
  questionsCorrect: number;
  percentCorrect: number;
  questionTimeAverage: number;
  questionTimeMax: number;
  message: string;
};
