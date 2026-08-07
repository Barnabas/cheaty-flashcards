import { Howl } from "howler";
import BadgePath from "./assets/sounds/badge.mp3";
import CheatPath from "./assets/sounds/cheat.mp3";
import CorrectPath from "./assets/sounds/correct.mp3";
import LevelEndPath from "./assets/sounds/level_end.mp3";
import LevelStartPath from "./assets/sounds/level_start.mp3";
import MasteryUpPath from "./assets/sounds/mastery_up.mp3";
import StreakMilestonePath from "./assets/sounds/streak_milestone.mp3";
import WrongPath from "./assets/sounds/wrong.mp3";
import { useSettingsStore } from "./stores/settings";

type SoundNames =
  | "cheat"
  | "correct"
  | "level_end"
  | "level_start"
  | "wrong"
  | "mastery_up"
  | "streak_milestone"
  | "badge";

const sounds: Record<SoundNames, Howl> = {
  cheat: new Howl({ src: [CheatPath] }),
  correct: new Howl({ src: [CorrectPath] }),
  level_end: new Howl({ src: [LevelEndPath] }),
  level_start: new Howl({ src: [LevelStartPath] }),
  wrong: new Howl({ src: [WrongPath] }),
  mastery_up: new Howl({ src: [MasteryUpPath] }),
  streak_milestone: new Howl({ src: [StreakMilestonePath] }),
  badge: new Howl({ src: [BadgePath] }),
};

export function playSound(name: SoundNames) {
  if (!useSettingsStore().soundEnabled) return;
  sounds[name].play();
}
