import { AnswerType, SessionSummary } from "./types";

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

export class SessionMetrics {
  questionsTotal: number = 0;
  questionsCorrect: number = 0;
  sessionStart: number = Date.now();
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

  endSession(): SessionSummary {
    const { questionsCorrect, questionsTotal, questionTimeTotal, questionTimeMax } = this;
    const percentCorrect = questionsCorrect / questionsTotal;

    // Ziggy says these out loud on the outro screen (see PlayPage.vue), so
    // they're first person and emoji-free — the mascot art carries the tone
    // that the emoji used to.
    let message: string = "Rough round. Don't you dare quit on me now.";
    if (percentCorrect > 0.4) message = "Go again. I believe in you, honestly.";
    if (percentCorrect > 0.5) message = "Good work. Keep going.";
    if (percentCorrect > 0.6) message = "Very nice. You've got this.";
    if (percentCorrect > 0.7) message = "Well done! Keep it up.";
    if (percentCorrect > 0.8) message = "Fantastic — I barely got a word in.";
    if (percentCorrect > 0.9) message = "Amazing. You're making this look easy.";
    if (percentCorrect > 0.99) message = "Perfect score. I've got nothing left to teach you.";

    return {
      sessionTime: Date.now() - this.sessionStart,
      questionsCorrect,
      percentCorrect,
      questionTimeAverage: questionTimeTotal / questionsTotal,
      questionTimeMax,
      message,
    };
  }
}
