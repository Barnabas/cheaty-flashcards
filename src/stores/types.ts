// Fact-family mastery record. Family grouping and Leitner promotion/demotion
// logic land in the adaptive mastery engine phase; this is just the shape
// persisted to localStorage.
export type FamilyMastery = {
  stage: number;
  timesSeen: number;
  timesCorrect: number;
  lastSeen: number | null;
};

export type PersonalBest = {
  percentCorrect: number;
  levelTime: number;
  questionTimeAverage: number;
  achievedAt: number;
  timesPlayed: number;
};
