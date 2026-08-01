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
    // Auto-unlocks the next family once the active set shows solid mastery.
    // Returns the newly unlocked family, or undefined if not ready yet / the
    // whole pool is already active.
    tryAutoUnlock(
      group: OperatorGroup,
      getMastery: (key: string) => FamilyMastery | undefined,
    ): FactFamily | undefined {
      if (!isReadyToUnlock(this.activeFamilies(group), getMastery)) return undefined;
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
