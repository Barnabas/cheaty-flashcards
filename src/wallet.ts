// One economy (Phase 13): what Ziggy charges, what he pays, and how much a
// player can carry. Pure rules with no store attached — same split as
// mastery.ts/curriculum.ts — because these are the numbers that decide whether
// cheating is a trade or a punishment, and they should be readable and
// tunable in one place. See docs/game-vision.md, "One economy: hint tokens".
import { STREAK_MILESTONES } from "./streak";

// Small enough that spending is a real decision, big enough to afford the
// most expensive thing on the list. Payouts above the cap are simply lost —
// there's nothing else to spend tokens on, so hoarding can't be the game.
export const WALLET_CAP = 10;
// A brand-new player opens their wallet with exactly one new card's worth,
// which is also what a session used to hand out for free.
export const STARTING_TOKENS = 5;

// Prices. Eliminating two wrong answers leaves recall work to do, so it's
// cheap; revealing the answer skips recall entirely. Having Ziggy deal a card
// early used to be free, which made cheating the curriculum cost nothing
// while cheating one answer cost everything.
export const ELIMINATE_COST = 1;
export const REVEAL_COST = 3;
export const NEW_CARD_COST = 5;

// Ziggy's menu, in his words — rendered before the player spends anything, so
// all three prices are visible without buying to find out.
export const ZIGGY_PRICES: { label: string; cost: number }[] = [
  { label: "Hide 2 wrong answers", cost: ELIMINATE_COST },
  { label: "Show you the answer", cost: REVEAL_COST },
  { label: "Deal you a new card", cost: NEW_CARD_COST },
];

// Payout for finishing a session without buying anything. Deliberately not
// tied to the score: a struggling player who never asks for help still gets
// paid, which is what keeps the wallet from bottoming out for good.
export const CLEAN_SESSION_REWARD = 3;

// Payout for a cheat-free streak milestone, rising over the first few and
// then flattening. Spending resets the streak to zero, which drops the player
// back onto the fast part of this curve — so the loop refills itself instead
// of stranding anyone at nothing to spend and nothing to earn.
export function streakMilestoneReward(streak: number): number {
  const index = STREAK_MILESTONES.indexOf(streak);
  if (index < 0) return 0;
  return Math.min(index + 1, 3);
}

// How much of `amount` actually fits in the wallet. Callers show what was
// credited rather than what was offered, so nothing on screen promises tokens
// the player didn't get.
export function creditableAmount(tokens: number, amount: number): number {
  return Math.max(0, Math.min(amount, WALLET_CAP - tokens));
}
