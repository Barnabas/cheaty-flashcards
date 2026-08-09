# Phase 13 — One economy: the token wallet

Full detail behind the one-line summary in PLAN.md. Follows [../game-vision.md](../game-vision.md), "One economy: hint tokens", where it conflicts with older docs.

The problem in one line: the app is named after cheating, and the design only ever punished it. Tokens appeared free at the start of every session and evaporated at the end of it, so spending them cost nothing real and saving them was pointless; meanwhile the streak treated a purchase as a moral failure, and the one thing that genuinely let a player skip the curriculum — the bonus fact — was free.

## The wallet

`src/wallet.ts` holds the numbers and nothing else: `WALLET_CAP = 10`, `STARTING_TOKENS = 5`, prices (`ELIMINATE_COST = 1`, `REVEAL_COST = 3`, `NEW_CARD_COST = 5`), payouts (`CLEAN_SESSION_REWARD = 3`, `streakMilestoneReward()`), and `creditableAmount()`. `src/stores/wallet.ts` is a thin persisted store over it — `spend()` refuses what it can't afford and returns a boolean, `earn()` clips at the cap and returns what was actually credited. Same pure-module-plus-store split as `mastery.ts`/`curriculum.ts`, for the same reason: these are the numbers most likely to want retuning after a kid plays.

Callers show what `earn()` returned rather than what they offered, which is the whole reason it returns anything. A session that would have paid 6 tokens into a wallet with 5 spare says "Earned 5", not "Earned 6" followed by a balance that disagrees.

No migration: an existing save has no `wallet` key, so the store falls back to its default of 5 — every current player simply opens their first post-upgrade session with the allowance they used to get anyway. The export format did need a version bump (2 → 3), since a v2 file has no wallet field to restore.

## Earning is the streak's new job

`streakMilestoneReward()` pays 1, 2, then 3 tokens across the existing `STREAK_MILESTONES` and flattens there. The interesting property is the interaction with `recordCheat()`: buying help resets the streak, which puts a player who just spent back onto the cheap early milestones. The loop refills itself, so an empty wallet is never a dead end — which matters because the player most likely to run dry is the one who needs help most.

A clean session (nothing bought during it) pays a flat 3, deliberately not scaled by score. Tying it to accuracy would mean the struggling player who never asks for help earns least, which inverts the point.

Buying a card at the intro doesn't count against the clean-session bonus — `begin()` resets the counter, and the purchase happens before it. Net-net a bought card still costs 5 against a maximum 3 income, so it can't be farmed. It also doesn't reset the streak: the streak counts answers the player got without Ziggy, and buying a card isn't an answer.

## What playing it actually showed

A real-browser pass (Playwright against `vp preview`, 390×844 and 1280×800) turned up one thing worth recording: **a competent player pins to the cap fast.** Two clean sessions plus the 5- and 10-answer streak milestones is more than 10 tokens of income — both verification sessions ended with their payouts clipped by the cap, the first one from a starting balance of 5. That's not obviously wrong — being at the cap means Ziggy owes you favours, and income only accrues while you aren't spending — but it does mean tokens are not scarce for a strong player. Logged in [../open-questions.md](../open-questions.md) rather than tuned blind; the numbers all live in one file for exactly this.

## Copy: priced, not shamed

The help modal is the rules, so it changed most: prices for all three purchases, "buying is fair play", and Ziggy's own payout terms stated as terms. The play screen's buttons dropped "Ask Ziggy to…" / "Beg Ziggy to…" for "Hide 2" and "Show me the answer" with the price attached — begging isn't commerce. What did _not_ soften: a bought answer still earns no mastery credit and still resets the streak, and Ziggy still says the card stays his. The trade is real on both sides; it's the tone that stopped moralising.

`TokenCount.vue` is one small component for every token number on screen — a price on a button, a line on Ziggy's menu, a balance in a pocket. There's one currency in the game, so it gets one look, and the intro can list all three prices next to the player's balance without inventing a second visual language for money.

## A test gotcha that cost real time

`vi.useRealTimers()` after a component has rendered under fake timers **kills its click handlers**. Vue skips an event whose `timeStamp` predates the listener's `attached` time, and switching back to the real clock rewinds time under everything already mounted — so `trigger("click")` dispatches, the native listener fires, and Vue's handler never runs. No error, no warning; the assertion just quietly tests nothing.

It had already bitten this file before this phase: "does not carry a stale milestone toast into a replayed session" switched to real timers before clicking Replay, so the replay never happened and the assertion passed against the outro screen, where the toast isn't rendered anyway. That test now stays on fake timers and asserts it actually reached the new session. Promoted to PLAN.md's gotchas.

## Verification

`vp check` clean, `vp test` green (21 files, 212 tests — 23 new), `pnpm build` (vue-tsc + Vite + PWA) clean.

Real-browser pass at 390×844 and 1280×800, no console errors and no horizontal overflow at either width:

- Home shows the balance; a fresh player has 5.
- Intro lists all three prices plus the balance before anything is bought.
- Buying a new card: 5 → 0 tokens, a fifth seat at the table, and the button disables itself for the next one.
- Reload → still 0, so a purchase can't be undone by walking away and coming back.
- Clean 10-question session → "Earned 5 from Ziggy — you never asked him for a thing", pocket 10 (payout clipped by the cap, and reported clipped).
- Session with one Hide 2 bought → no clean bonus, and the outro names the rule that would have paid.
