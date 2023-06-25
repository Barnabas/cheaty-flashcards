import { AnswerType, LevelSummary } from "./types";

export function shuffle<T>(array: T[]): T[] {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

function formatPercent(value: number) {
  return (value * 100).toFixed(1) + '%'
}

function formatTime(ms: number) {
  let sec = Math.round(ms / 1000);
  if(sec < 60) {
    return `${sec}s`;
  } else {
    const min = Math.floor(sec / 60);
    sec = sec % 60;
    return `${min}m ${sec}s`;
  }
}

export class LevelMetrics {
  questionsTotal: number = 0;
  questionsCorrect: number = 0;
  levelStart: number = Date.now();
  questionStart: number = 0;
  questionTimes: number[] = [];
  isAnswerCorrect: boolean = true;

  beginQuestion() {
    this.questionStart = Date.now();
    this.questionsTotal += 1;
    this.isAnswerCorrect = true;
  }

  answerQuestion(answerType: AnswerType) {
    if (this.isAnswerCorrect && answerType === "right") {
      this.questionsCorrect += 1;
      this.questionTimes.push(Date.now() - this.questionStart);
    } else {
      this.isAnswerCorrect = false;
    }
  }

  endLevel(points: number): LevelSummary {
    const { questionsCorrect, questionsTotal } = this;
    const totalTime = this.questionTimes.reduce((prev, curr) => prev + curr);
    return {
      levelTime: formatTime(Date.now() - this.levelStart),
      questionsCorrect,
      percentCorrect: formatPercent(questionsCorrect / questionsTotal),
      points,
      questionAverageTime: formatTime(totalTime / questionsTotal)
    };
  }
}
