import { Howl } from "howler";
import CheatPath from "./assets/sounds/cheat.mp3";
import CorrectPath from "./assets/sounds/correct.mp3";
import LevelEndPath from "./assets/sounds/level_end.mp3";
import LevelStartPath from "./assets/sounds/level_start.mp3";
import WrongPath from "./assets/sounds/wrong.mp3";
import { useSettingsStore } from "./stores/settings";

type SoundNames = "cheat" | "correct" | "level_end" | "level_start" | "wrong";

const sounds: Record<SoundNames, Howl> = {
  cheat: new Howl({ src: [CheatPath] }),
  correct: new Howl({ src: [CorrectPath] }),
  level_end: new Howl({ src: [LevelEndPath] }),
  level_start: new Howl({ src: [LevelStartPath] }),
  wrong: new Howl({ src: [WrongPath] }),
};

export function playSound(name: SoundNames) {
  if (!useSettingsStore().soundEnabled) return;
  sounds[name].play();
}

// Phase 7's expanded event set (streak milestones, a fact family reaching
// full mastery, a new personal-best badge) gets synthesized Web Audio
// chimes rather than new mp3 assets — small, dependency-free, and avoids
// having to source/license more audio files for a few short jingles.
export type ChimeName = "streak_milestone" | "mastery_up" | "badge";

type Tone = {
  freq: number;
  start: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
};

const CHIMES: Record<ChimeName, Tone[]> = {
  streak_milestone: [
    { freq: 660, start: 0, duration: 0.12 },
    { freq: 880, start: 0.1, duration: 0.18 },
  ],
  mastery_up: [
    { freq: 523.25, start: 0, duration: 0.1 },
    { freq: 659.25, start: 0.09, duration: 0.1 },
    { freq: 783.99, start: 0.18, duration: 0.24 },
  ],
  badge: [
    { freq: 587.33, start: 0, duration: 0.1 },
    { freq: 739.99, start: 0.09, duration: 0.1 },
    { freq: 880, start: 0.18, duration: 0.1 },
    { freq: 1174.66, start: 0.27, duration: 0.3 },
  ],
};

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext;
  if (!Ctor) return null;
  audioCtx ??= new Ctor();
  return audioCtx;
}

function playTones(tones: Tone[]) {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  const now = ctx.currentTime;
  for (const { freq, start, duration, type = "sine", gain = 0.15 } of tones) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gainNode.gain.setValueAtTime(0, now + start);
    gainNode.gain.linearRampToValueAtTime(gain, now + start + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
    osc.connect(gainNode).connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + duration + 0.02);
  }
}

export function playChime(name: ChimeName) {
  if (!useSettingsStore().soundEnabled) return;
  playTones(CHIMES[name]);
}
