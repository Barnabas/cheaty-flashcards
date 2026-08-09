import { defineStore } from "pinia";
import { FactFamily, OperatorGroup, familyPool } from "../mastery";
import { isReadyToUnlock, nextFamilyToUnlock, seedStarterFamilies } from "../curriculum";
import { FamilyMastery } from "./types";

function familyFor(group: OperatorGroup, key: string): FactFamily | undefined {
  return familyPool(group).find((f) => f.key === key);
}

export const useCurriculumStore = defineStore("curriculum", {
  state: () => ({
    active: { add: [], multiply: [] } as Record<OperatorGroup, string[]>,
  }),
  actions: {
    // Seeds the starter set the first time a group is visited; a no-op once
    // anything is already active for that group.
    ensureSeeded(group: OperatorGroup) {
      if (this.active[group].length === 0) {
        this.active[group] = seedStarterFamilies(group).map((f) => f.key);
      }
    },
    activeFamilies(group: OperatorGroup): FactFamily[] {
      return this.active[group]
        .map((key) => familyFor(group, key))
        .filter((f): f is FactFamily => f !== undefined);
    },
    // Auto-unlocks the next family once `scope` shows solid mastery. Callers
    // pass the table a session just played (Phase 12) — "win every card at
    // the table and Ziggy deals a new one" is the game's one rule, and an
    // empty scope never unlocks, so nothing is dealt for a session that
    // wasn't played. Defaults to the whole active set, which is what the rule
    // meant back when a session targeted all of it. Returns the newly
    // unlocked family, or undefined if not ready yet / the whole pool is
    // already active.
    tryAutoUnlock(
      group: OperatorGroup,
      getMastery: (key: string) => FamilyMastery | undefined,
      // Defaulted in the body, not the signature: Pinia's `this` isn't typed
      // yet in a default parameter expression.
      scope?: FactFamily[],
    ): FactFamily | undefined {
      if (!isReadyToUnlock(scope ?? this.activeFamilies(group), getMastery)) return undefined;
      const next = nextFamilyToUnlock(group, this.active[group]);
      if (next) this.active[group].push(next.key);
      return next;
    },
    // Player opt-in ("bonus fact"): unlocks the next family immediately,
    // ignoring the mastery gate.
    unlockBonus(group: OperatorGroup): FactFamily | undefined {
      const next = nextFamilyToUnlock(group, this.active[group]);
      if (next) this.active[group].push(next.key);
      return next;
    },
  },
  persist: true,
});
