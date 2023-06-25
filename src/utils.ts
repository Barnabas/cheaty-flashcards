import { AnswerType, LevelSummary } from "./types";

export function shuffle<T>(array: T[]): T[] {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

export function formatPercent(value: number) {
  return (value * 100).toFixed(1) + "%";
}

export function formatTime(ms: number) {
  let sec = ms / 1000;
  if (sec < 60) {
    return `${sec.toFixed(1)}s`;
  } else {
    const min = Math.floor(sec / 60);
    sec = Math.round(sec) % 60;
    return `${min}m ${sec}s`;
  }
}

export class LevelMetrics {
  questionsTotal: number = 0;
  questionsCorrect: number = 0;
  levelStart: number = Date.now();
  questionStart: number = 0;
  questionTimeTotal: number = 0;
  questionTimeMax: number = 0;
  isAnswerCorrect: boolean = true;

  beginQuestion() {
    this.questionStart = Date.now();
    this.questionsTotal += 1;
    this.isAnswerCorrect = true;
  }

  answerQuestion(answerType: AnswerType) {
    if (this.isAnswerCorrect && answerType === "right") {
      this.questionsCorrect += 1;
      const time = Date.now() - this.questionStart;
      this.questionTimeTotal += time;
      if (time > this.questionTimeMax) this.questionTimeMax = time;
    } else {
      this.isAnswerCorrect = false;
    }
  }

  endLevel(points: number): LevelSummary {
    const {
      questionsCorrect,
      questionsTotal,
      questionTimeTotal,
      questionTimeMax,
    } = this;
    const percentCorrect = questionsCorrect / questionsTotal;

    let message: string = "😤 Don't give up!";
    if (percentCorrect > 0.4) message = "🤓 Go again, I believe in you.";
    if (percentCorrect > 0.5) message = "🙂 Good job, keep going.";
    if (percentCorrect > 0.6) message = "👍 Very nice. You got this!";
    if (percentCorrect > 0.7) message = "😎 Well done, keep it up!";
    if (percentCorrect > 0.8) message = "😄 Fantastic! Woo hoo!";
    if (percentCorrect > 0.9) message = "🥳 Amazing! You're killing it.";
    if (percentCorrect > 0.99) message = "🤩 Wow! Perfect score!";

    return {
      levelTime: Date.now() - this.levelStart,
      questionsCorrect,
      percentCorrect,
      points,
      questionTimeAverage: questionTimeTotal / questionsTotal,
      questionTimeMax,
      message,
    };
  }
}
