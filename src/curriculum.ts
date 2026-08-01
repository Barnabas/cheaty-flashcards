// Progressive curriculum (Phase 8): which fact families a player has been
// introduced to per operator group, and when the next one should unlock.
// Pure logic, same store-independent pattern as mastery.ts; src/stores/
// curriculum.ts wraps this with persisted state.
import { FactFamily, OperatorGroup, familyPool } from "./mastery";
import { FamilyMastery } from "./stores/types";

export const STARTER_FAMILY_COUNT = 4;
export const UNLOCK_STAGE_THRESHOLD = 3;
export const UNLOCK_MIN_SEEN = 3;

// Deterministic teaching order: smaller facts first. Ascending by the
// family's sum (add group) or product (multiply group), so e.g. 2+2 unlocks
// long before 9+9.
export function curriculumOrder(pool: FactFamily[]): FactFamily[] {
  const value = (f: FactFamily) => (f.group === "add" ? f.a + f.b : f.a * f.b);
  return [...pool].sort((x, y) => value(x) - value(y) || x.a - y.a || x.b - y.b);
}

export function seedStarterFamilies(group: OperatorGroup): FactFamily[] {
  return curriculumOrder(familyPool(group)).slice(0, STARTER_FAMILY_COUNT);
}

// Ready to introduce a new family once every currently-active family has
// solid, well-exercised mastery — deliberately requires *all* of them, not
// an average, so a weak family can't hide behind strong ones.
export function isReadyToUnlock(
  activeFamilies: FactFamily[],
  getMastery: (key: string) => FamilyMastery | undefined,
): boolean {
  if (activeFamilies.length === 0) return false;
  return activeFamilies.every((family) => {
    const mastery = getMastery(family.key);
    return (
      (mastery?.stage ?? 0) >= UNLOCK_STAGE_THRESHOLD &&
      (mastery?.timesSeen ?? 0) >= UNLOCK_MIN_SEEN
    );
  });
}

// Next family in teaching order not already active, or undefined once every
// family in the group has been introduced.
export function nextFamilyToUnlock(
  group: OperatorGroup,
  activeKeys: string[],
): FactFamily | undefined {
  const active = new Set(activeKeys);
  return curriculumOrder(familyPool(group)).find((family) => !active.has(family.key));
}
