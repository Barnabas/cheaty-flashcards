import { Howl } from "howler";
import CheatPath from "./assets/sounds/cheat.mp3";
import CorrectPath from "./assets/sounds/correct.mp3";
import LevelEndPath from "./assets/sounds/level_end.mp3";
import LevelStartPath from "./assets/sounds/level_start.mp3";
import WrongPath from "./assets/sounds/wrong.mp3";

type SoundNames = "cheat" | "correct" | "level_end" | "level_start" | "wrong";

const sounds: Record<SoundNames, Howl> = {
  cheat: new Howl({ src: [CheatPath] }),
  correct: new Howl({ src: [CorrectPath] }),
  level_end: new Howl({ src: [LevelEndPath] }),
  level_start: new Howl({ src: [LevelStartPath] }),
  wrong: new Howl({ src: [WrongPath] }),
};

export function playSound(name: SoundNames) {
  sounds[name].play();
}
