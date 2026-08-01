// Pure presentation helpers for the home page mastery dashboard (Phase 4).
// Store-independent, same pattern as mastery.ts/streak.ts.
import { FactFamily, MAX_STAGE } from "./mastery";
import { FamilyMastery } from "./stores/types";

// Stage 0 (never promoted) through MAX_STAGE (fully mastered), low to high.
const STAGE_BG_CLASSES = [
  "bg-base-300",
  "bg-error/30",
  "bg-warning/40",
  "bg-warning/70",
  "bg-success/50",
  "bg-success",
];

export function stageBgClass(stage: number): string {
  return STAGE_BG_CLASSES[Math.max(0, Math.min(MAX_STAGE, stage))];
}

export type MasterySummary = {
  total: number;
  mastered: number;
  started: number;
};

// Ziggy the Fox is the through-line for the "cheat has stakes" mechanic —
// this reframes the mastery grid (Ziggy's Den) as a running commentary from
// him, rather than a bare progress readout. Pure/testable like the rest of
// this file.
export function denFlavor(summary: MasterySummary): string {
  if (summary.total === 0) return "";
  if (summary.mastered >= summary.total) {
    return "Ziggy's fresh out of tricks here — you know these cold!";
  }
  if (summary.mastered / summary.total >= 0.5) {
    return "Ziggy's starting to sweat. Keep going!";
  }
  if (summary.started > 0) {
    return "Ziggy's still got a few tricks up his sleeve.";
  }
  return "Ziggy hasn't even broken a sweat yet — go rattle his cage!";
}

export function denPose(summary: MasterySummary): "idle" | "sly" | "cheer" {
  if (summary.total > 0 && summary.mastered >= summary.total) return "cheer";
  if (summary.started === 0) return "sly";
  return "idle";
}

// Counts across a fact-family pool: how many have been seen at all, and how
// many have reached full mastery. Drives the "12 / 36 facts mastered" text
// next to a group's heatmap.
export function masterySummary(
  pool: FactFamily[],
  getMastery: (key: string) => FamilyMastery | undefined,
): MasterySummary {
  let mastered = 0;
  let started = 0;
  for (const family of pool) {
    const entry = getMastery(family.key);
    if (!entry || entry.timesSeen === 0) continue;
    started += 1;
    if (entry.stage >= MAX_STAGE) mastered += 1;
  }
  return { total: pool.length, mastered, started };
}
