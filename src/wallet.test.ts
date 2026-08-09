import { describe, expect, it } from "vite-plus/test";
import {
  CLEAN_SESSION_REWARD,
  ELIMINATE_COST,
  NEW_CARD_COST,
  REVEAL_COST,
  STARTING_TOKENS,
  WALLET_CAP,
  ZIGGY_PRICES,
  creditableAmount,
  streakMilestoneReward,
} from "./wallet";
import { STREAK_MILESTONES } from "./streak";

describe("streakMilestoneReward", () => {
  it("pays nothing for a streak that isn't a milestone", () => {
    expect(streakMilestoneReward(0)).toBe(0);
    expect(streakMilestoneReward(4)).toBe(0);
    expect(streakMilestoneReward(11)).toBe(0);
  });

  it("pays more for the first few milestones, then flattens", () => {
    expect(streakMilestoneReward(5)).toBe(1);
    expect(streakMilestoneReward(10)).toBe(2);
    expect(streakMilestoneReward(25)).toBe(3);
    expect(streakMilestoneReward(500)).toBe(3);
  });

  it("pays out at every milestone the streak celebrates", () => {
    // A celebrated milestone with no payout would be a toast that promises
    // tokens and hands over none.
    expect(STREAK_MILESTONES.every((streak) => streakMilestoneReward(streak) > 0)).toBe(true);
  });
});

describe("creditableAmount", () => {
  it("credits the whole payout when there's room", () => {
    expect(creditableAmount(0, 3)).toBe(3);
    expect(creditableAmount(WALLET_CAP - 3, 3)).toBe(3);
  });

  it("credits only what fits under the cap", () => {
    expect(creditableAmount(WALLET_CAP - 1, 3)).toBe(1);
    expect(creditableAmount(WALLET_CAP, 3)).toBe(0);
  });

  it("never returns a negative credit, even from an over-cap balance", () => {
    expect(creditableAmount(WALLET_CAP + 5, 3)).toBe(0);
  });
});

describe("the economy's shape", () => {
  it("prices recall-skipping help above recall-preserving help", () => {
    expect(REVEAL_COST).toBeGreaterThan(ELIMINATE_COST);
    expect(NEW_CARD_COST).toBeGreaterThan(REVEAL_COST);
  });

  it("lets a player afford the most expensive purchase within the cap", () => {
    expect(NEW_CARD_COST).toBeLessThanOrEqual(WALLET_CAP);
    expect(STARTING_TOKENS).toBeLessThanOrEqual(WALLET_CAP);
  });

  it("takes more than one clean session to save up for a new card", () => {
    // Otherwise the cheapest path through the curriculum is to buy every card
    // rather than win it.
    expect(NEW_CARD_COST).toBeGreaterThan(CLEAN_SESSION_REWARD);
  });

  it("shows a price for everything Ziggy sells", () => {
    expect(ZIGGY_PRICES.map((price) => price.cost)).toEqual([
      ELIMINATE_COST,
      REVEAL_COST,
      NEW_CARD_COST,
    ]);
  });
});
