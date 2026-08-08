export type Operator = "+" | "-" | "×" | "÷";

export type Question = {
  operator: Operator;
  familyKey: string;
  factors: number[];
  correct: number;
  answers: number[];
};

export type AnswerType = "wrong" | "right" | "hint" | "hide";

// Which piece of Ziggy art a given moment calls for — see ZiggyImage.vue for
// what each one is and when to reach for it. Lives here rather than in the
// component so pure copy/presentation helpers (dashboard.ts) can pick a pose
// without importing a component.
export type ZiggyPose = "neutral" | "wink" | "gleeful" | "mark";

export type SessionSummary = {
  sessionTime: number;
  questionsCorrect: number;
  percentCorrect: number;
  questionTimeAverage: number;
  questionTimeMax: number;
  message: string;
};
