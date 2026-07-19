import { defineStore } from "pinia";

export const useSettingsStore = defineStore("settings", {
  state: () => ({
    soundEnabled: true,
  }),
  persist: true,
});
