// Pure helpers for "levels as milestones/badges" (Phase 4) — decoupled from
// the raw difficulty a level number used to imply (that link was already
// severed in Phase 2's adaptive engine).
import { PersonalBest } from "./stores/types";

// A level counts as "cleared" for badge purposes once a personal best hits
// this score. Deliberately below 100%: the badge celebrates solid play, not
// perfection.
export const LEVEL_CLEAR_THRESHOLD = 0.8;

// Highest level (1..maxLevel) with a personal best at or above the clear
// threshold, or 0 if none qualify. Levels aren't sequentially gated, so this
// doesn't require earlier levels to also be cleared.
export function highestClearedLevel(
  sectionId: string,
  maxLevel: number,
  getPersonalBest: (sectionId: string, level: number) => PersonalBest | undefined,
): number {
  let highest = 0;
  for (let level = 1; level <= maxLevel; level++) {
    const best = getPersonalBest(sectionId, level);
    if (best && best.percentCorrect >= LEVEL_CLEAR_THRESHOLD) highest = level;
  }
  return highest;
}
