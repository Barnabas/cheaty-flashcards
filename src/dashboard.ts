// Pure presentation helpers for the home page mastery dashboard (Phase 4).
// Store-independent, same pattern as mastery.ts/streak.ts.
import { FactFamily, MAX_STAGE } from "./mastery";
import { FamilyMastery } from "./stores/types";
import { ZiggyPose } from "./types";

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

export type ZiggyGreeting = {
  pose: ZiggyPose;
  lines: string[];
};

// Ziggy's home-page greeting. Phase 7 scattered third-person commentary about
// Ziggy across every panel ("Ziggy's starting to sweat"); Phase 9 collapses
// that into a single first-person speech bubble that reacts to how far the
// player has actually got — same mood thresholds as the old per-group
// denFlavor(), one voice instead of three copies of it. Pure/testable like the
// rest of this file.
export function homeGreeting(summary: MasterySummary): ZiggyGreeting {
  if (summary.total === 0 || summary.started === 0) {
    return {
      pose: "wink",
      lines: [
        "I'm Ziggy. I know every one of these facts by heart — you don't. Yet.",
        "Need a way out of a tough one? Just ask. It'll cost you.",
      ],
    };
  }
  if (summary.mastered >= summary.total) {
    return {
      pose: "gleeful",
      lines: [
        `All ${summary.total} of them. You know every fact I've shown you.`,
        "Fine. I'll go dig up some harder ones.",
      ],
    };
  }
  if (summary.mastered / summary.total >= 0.5) {
    return {
      pose: "gleeful",
      lines: [
        `${summary.mastered} of ${summary.total} facts, locked in. You're making this look easy.`,
        "Don't get comfortable. Which pile are we doing?",
      ],
    };
  }
  return {
    pose: "neutral",
    lines: [
      `${summary.mastered} of ${summary.total} facts down. The rest still belong to me.`,
      "Pick a pile and let's go again.",
    ],
  };
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
