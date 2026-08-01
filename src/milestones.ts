// Pure helpers for "sessions as milestones/badges" (Phase 4, reworked in
// Phase 8 once levels went away) — decoupled from raw difficulty, which was
// already severed from level numbers by Phase 2's adaptive engine.
import { OperatorGroup } from "./mastery";
import { SessionBest } from "./stores/types";

// A group counts as "cleared" for badge purposes once its personal best hits
// this score. Deliberately below 100%: the badge celebrates solid play, not
// perfection.
export const SESSION_CLEAR_THRESHOLD = 0.8;

export function hasClearedGroup(
  group: OperatorGroup,
  getBest: (group: OperatorGroup) => SessionBest | undefined,
): boolean {
  const best = getBest(group);
  return !!best && best.percentCorrect >= SESSION_CLEAR_THRESHOLD;
}
