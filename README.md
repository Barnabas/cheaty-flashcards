# Cheaty Flashcards

A single-page math flashcard game for kids. Pick a group (Addition & Subtraction, or Multiplication & Division) and practice a dynamically generated session of multiple-choice arithmetic questions, drawn from a per-player fact-family curriculum that unlocks gradually as mastery builds. There's a hint-token budget that lets you "ask Ziggy" to eliminate wrong answers or reveal the correct one — at the cost of mastery credit for that fact — hence the name.

Live logic lives entirely client-side; there's no backend. Mastery, curriculum progress, and session bests persist locally via Pinia + `localStorage`, with optional JSON export/import for backup.

## Quick start

```bash
pnpm install
pnpm dev       # start Vite dev server
pnpm test      # run the Vitest suite
pnpm check     # lint + format + type-check
```

See [docs/development.md](./docs/development.md) for the full command list, deployment, and PWA details.

## Documentation index

This file and [PLAN.md](./PLAN.md) are kept brief on purpose — load the linked doc only when the task needs it.

- [docs/architecture.md](./docs/architecture.md) — tech stack, project structure, routing
- [docs/development.md](./docs/development.md) — dev/build/test commands, Cloudflare Workers deployment, PWA
- [docs/visual-identity.md](./docs/visual-identity.md) — theme, Ziggy the Fox mascot, confetti/sound
- [docs/maintainer-notes.md](./docs/maintainer-notes.md) — gotchas for anyone (human or agent) touching this code
- [docs/toolchain.md](./docs/toolchain.md) — Vite+ toolchain reference
- [PLAN.md](./PLAN.md) — redesign plan, phase history, design decisions

## Markdown convention

Do not wrap paragraph lines in `.md` files — write long lines as single lines. If you touch a file that still has wrapped lines, unwrap them.
