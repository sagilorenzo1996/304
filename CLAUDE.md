# CLAUDE.md

Guidance for Claude Code when working in this repository (a React +
TypeScript + Vite implementation of the 304 card game — see README.md).

## Development rules

1. **Always run the test suite before deploying or pushing.** Run
   `npm test` (and `npm run build`, which type-checks) and make sure both
   pass before any push, deploy, or PR. Never ship with failing or skipped
   tests.
2. **Always write tests for new features.** Any new game rule, engine
   transition, AI behavior, or bug fix must land together with vitest
   coverage in `src/game/*.test.ts` (or a new test file next to the code).
   For game logic, prefer seeded full-round simulations plus targeted unit
   tests, following the patterns in `src/game/game.test.ts`.

## Commands

- `npm run dev` — start the dev server
- `npm test` — run the vitest suite
- `npm run build` — type-check (`tsc -b`) and produce a production build

## Architecture notes

- `src/game/` is a pure, framework-free module: keep engine changes free of
  React/DOM imports so the logic stays headless-testable and reusable for a
  future multiplayer server.
- UI state flows through the reducer in `src/hooks/useGame.ts`; components
  only render state and dispatch intents.
