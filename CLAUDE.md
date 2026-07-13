# SpeedCubeTimer — Speedcubing Timer

React + TypeScript + Vite speedcubing timer with WCA-compliant
3x3 scrambles, 3D cube preview, and session statistics.

## Commands

- Dev server: `npm run dev`
- Build: `npm run build`
- Type check: `npm run typecheck`
- Tests: `npm run test` (Vitest)
- Lint: `npm run lint`

## Architecture

- `src/timer/` — timing engine (state machine: idle → armed → inspection → running → stopped)
- `src/scramble/` — scramble generation, wraps cubing.js
- `src/solver/` — CFOP example-solve engine (cross, F2L, OLL, PLL)
- `src/stats/` — session storage, averages, PB tracking
- `src/components/` — UI components; TwistyViewer wraps <twisty-player>

## Domain rules (WCA compliance — do not deviate)

- Scrambles MUST be random-state, generated via `cubing/scramble`
  (randomScrambleForEvent("333")). Never generate random-move scrambles.
- Use `performance.now()` for all timing. Never `Date.now()` or setInterval math.
- ao5/ao12/ao100 use WCA trimmed means: drop best and worst, average the rest.
  A DNF counts as worst; two DNFs in an ao5 make the average DNF.
- Inspection: 15s; start between 15–17s = +2; after 17s = DNF.
- Timer display truncates to centiseconds (10.99, not 10.994 or rounding up).

## Working rules

- Use cubing.js `<twisty-player>` for 3D rendering; don't hand-roll Three.js.
- Solver changes must pass the verification harness: apply scramble +
  solution to the cube model and assert the solved state.
- Make minimal changes; don't refactor unrelated code.
- Run `npm run typecheck` after every code change.
- When unsure between two approaches, present both and let me choose.

## References

- Detailed solver design: @docs/solver-architecture.md
- WCA regulations summary: @docs/wca-rules.md
