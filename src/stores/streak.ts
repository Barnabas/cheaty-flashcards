import { defineStore } from "pinia";

export const useStreakStore = defineStore("streak", {
  state: () => ({
    current: 0,
    best: 0,
  }),
  actions: {
    // Called after a question is answered correctly without any hint used
    // on it. Returns the new streak count.
    recordClean(): number {
      this.current += 1;
      if (this.current > this.best) this.best = this.current;
      return this.current;
    },
    // A hint was used on the current question, breaking the cheat-free
    // streak. Guarded so repeated cheats don't trigger a persisted-state
    // write for a value that's already 0.
    recordCheat() {
      if (this.current !== 0) this.current = 0;
    },
  },
  persist: true,
});
