import { defineStore } from "pinia";
import { STARTING_TOKENS, creditableAmount } from "../wallet";

// The hint-token wallet: persistent (Phase 13), capped, and the only currency
// in the game. Prices and payout rules live in ../wallet.ts; this store just
// holds the balance and refuses to go negative or past the cap.
export const useWalletStore = defineStore("wallet", {
  state: () => ({
    tokens: STARTING_TOKENS,
  }),
  actions: {
    canAfford(cost: number): boolean {
      return this.tokens >= cost;
    },
    // Returns false and spends nothing when the player can't afford it, so
    // callers can treat "did the purchase happen" as one check.
    spend(cost: number): boolean {
      if (!this.canAfford(cost)) return false;
      this.tokens -= cost;
      return true;
    },
    // Returns what was actually credited — the cap swallows the rest.
    earn(amount: number): number {
      const credited = creditableAmount(this.tokens, amount);
      this.tokens += credited;
      return credited;
    },
  },
  persist: true,
});
