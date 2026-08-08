# Game vision — what the finished game is

Written 2026-08-08, after a whole-app review of Phases 0–10 concluded that the app has a working learning engine and a strong character but no game on top of them: Ziggy talks like an opponent yet never acts like one, real progress is nearly invisible to the player, the cheat mechanic the app is named for is something the design only punishes, and every session is structurally identical. This document is the north star for Act 2 (Phases 11+ in [../PLAN.md](../PLAN.md)). Where an older doc conflicts with this one, this one wins.

## The pitch

Ziggy the fox knows every math fact and he is insufferable about it. The facts are literally his: a hand of cards he guards. You win cards off him by proving you know them cold, he sells you help when you're stuck (he always pays himself first), and he snatches a card straight back if you get sloppy with it. The game — for one operator group — is over when Ziggy's paw is empty and every card is yours.

The app already says all of this in Ziggy's dialogue ("The rest still belong to me"). Act 2's job is to make the systems keep the promises the writing already makes.

## Who it's for

One kid first: the niece it was built for, roughly 7–9, playing on a tablet or phone in stretches of a few minutes, sometimes with a grown-up nearby and sometimes not. Everything the kid reads is short sentences; every number the kid sees is a count of concrete things ("3 cards", "8 in a row"), never a decimal percentage or a milliseconds table. Grown-up-facing detail can exist, but folded away.

## The premise, made literal: the card table

- Every fact family in a group is a **card** (36 per group). Cards are the single unit of progress; everything the player sees is cards moving.
- A card is always in exactly one visible place: **Ziggy's face-down pile** (not yet introduced — visible as a shrinking stack, so the horizon exists without reading as debt), **Ziggy's hand** (in play, still his), **your side** (won), or **gold** (locked in — even Ziggy has given up on winning it back).
- You **win** a card when its family reaches the curriculum's unlock stage (currently Leitner stage 3). This is deliberately the same rule that gates dealing: **win every card at the table and Ziggy deals a new one from his pile.** One rule, learnable in one session.
- A won card turns **gold** at max mastery (stage 5).
- **Ziggy steals a card back** when wrong answers drop a won card below the winning stage. Gold cards can be lost too — they just take more misses to fall. A steal is a dramatized on-screen moment with a Ziggy reaction, not a silent stat change.
- **Ziggy never takes anything while you're away.** Cards only move during play, in front of the player. Absence can put cards _at risk_ (below), but only your own wrong answers lose them.

The Leitner engine underneath does not change — cards, winning, gold, and steals are the existing stages made visible and dramatic. Act 2 dramatizes the engine; it does not replace it.

## One economy: hint tokens

Hint tokens are the only currency, held in a **persistent wallet** instead of resetting every session.

- **Earn by skill**: cheat-free streak milestones and clean sessions pay out. The streak stops being a separate guilt meter — it's the earning engine ("outfox Ziggy 10 in a row: +1 token").
- **Spend on Ziggy's help**: eliminate two answers (cheap), reveal the answer (expensive), and — new — having Ziggy deal a bonus card early (priced; it is currently free, which made cheating the curriculum cost nothing while cheating an answer cost everything).
- **Cheating is legitimate play, priced, not shamed.** A paid-for answer simply doesn't move the card — Ziggy keeps it and says so in character. The player who spends tokens made a real trade, not a moral error.
- The wallet is capped (around 10) so tokens stay scarce enough to be a decision. No other meters, currencies, or scores exist.

## Sessions

- A session seats a **table of 4–6 cards**, chosen by need: at-risk cards first, then Ziggy's-hand cards, then light review of yours. Never the whole active set — the old all-active-families target made sessions unboundedly long and, past 10 active families, mathematically impossible to complete.
- **End condition**: a clean both-operator pass on the seated cards. A typical session is about 2 minutes and stays that length forever, no matter how large the collection grows. The hard cap remains as a rare fallback, not the normal ending.
- **A question ends after a right answer or a second miss.** On the second miss Ziggy shows the answer himself for free, keeps the card, and play moves on — tapping every choice is never a strategy.
- The **intro** is Ziggy presenting today's table. The **outro** is a celebration first: cards won, defended, or lost this session, big and concrete; times and percentages fold behind a grown-ups disclosure. Every answer gets feedback, including the final one of the session.

## Why you come back tomorrow

- Cards not defended in a while become **at risk**: Ziggy eyes them and names them ("I'm coming for your 7s") on the home screen and in intros. At-risk cards are seated first.
- The threat only resolves at the table — he steals through your wrong answers, never through your absence.
- The long arc is always visible: his pile shrinking, your side growing, gold accumulating. A kid can point at the screen and say exactly how close they are to beating him.

## Ziggy's rules

- He is an **opponent with a stake**, not a narrator. Every appearance is him wanting to keep his cards.
- He acts on meaningful beats only — deal, steal, win, streak milestone, at-risk callout — at most one reaction between questions, never blocking input.
- First person, short lines, confident, never mean about the player's ability. He mocks his own impending loss, not the kid: "That one was supposed to be mine."
- One Ziggy per moment (the Phase 9 rule stands), painted art only, no emoji.

## Feedback principles

- Kid-facing numbers are counts of cards and streaks. No decimals, no telemetry.
- Celebration scales with meaning: winning a card > clean session > correct answer.
- No visible countdown or timer pressure (unchanged); speed is measured silently and feeds mastery.

## Unchanged constraints

- Fully static and backend-free; progress is local-only with JSON export/import; PWA, installable and offline; no accounts, ads, analytics, or leaderboards.
- Current stack (Vue 3, Vite+, Pinia, Tailwind/daisyUI) and visual identity (ziggy theme, painted mascot, Feather icons).
- Existing localStorage schemas may be broken without migration while the only player is family (precedent set in Phase 8).

## What this game is not

- Not a shop or cosmetics metagame — tokens buy Ziggy's help, nothing else.
- Not a typed-answer drill app — multiple choice stays; distractor quality and the two-miss rule carry the rigor.
- Not multiplayer, social, or account-based.

## How we know it worked

- A first-time player understands the contest inside one session without reading anything: the fox has the cards, I take them.
- After any session, the kid can say what they won or lost — and wants a specific card back.
- Perfect play always visibly moves something; "0 of 8 facts down" after a flawless session can never happen again.
- Sessions are ~2 minutes whether 4 cards are in play or all 36.
- The core play screen is comfortable on a 390px phone and a desktop alike.
