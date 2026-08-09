import { describe, expect, it, beforeEach } from "vite-plus/test";
import { createPinia, setActivePinia } from "pinia";
import { useWalletStore } from "./wallet";
import { STARTING_TOKENS, WALLET_CAP } from "../wallet";

describe("useWalletStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("starts a new player off with the opening balance", () => {
    expect(useWalletStore().tokens).toBe(STARTING_TOKENS);
  });

  it("spends what it can afford", () => {
    const wallet = useWalletStore();
    expect(wallet.spend(3)).toBe(true);
    expect(wallet.tokens).toBe(STARTING_TOKENS - 3);
  });

  it("refuses a purchase it can't afford, and spends nothing", () => {
    const wallet = useWalletStore();
    expect(wallet.spend(STARTING_TOKENS + 1)).toBe(false);
    expect(wallet.tokens).toBe(STARTING_TOKENS);
  });

  it("affords exactly the balance, but not a token more", () => {
    const wallet = useWalletStore();
    expect(wallet.canAfford(STARTING_TOKENS)).toBe(true);
    expect(wallet.canAfford(STARTING_TOKENS + 1)).toBe(false);
  });

  it("earns up to the cap and reports what was actually credited", () => {
    const wallet = useWalletStore();
    expect(wallet.earn(2)).toBe(2);
    expect(wallet.tokens).toBe(STARTING_TOKENS + 2);

    // Full pockets: the payout is clipped rather than silently overflowing.
    const room = WALLET_CAP - wallet.tokens;
    expect(wallet.earn(WALLET_CAP)).toBe(room);
    expect(wallet.tokens).toBe(WALLET_CAP);
    expect(wallet.earn(3)).toBe(0);
    expect(wallet.tokens).toBe(WALLET_CAP);
  });
});
