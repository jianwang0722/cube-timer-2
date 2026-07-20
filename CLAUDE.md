# SpeedCubeTimer — Speedcubing Timer

React + TypeScript + Vite speedcubing timer with WCA scrambles for
2x2/3x3/4x4/5x5, a 3D cube preview, and per-session statistics.

## Commands

- Dev server: `npm run dev`
- Build: `npm run build`
- Type check: `npm run typecheck`
- Tests: `npm run test` (Vitest)
- Lint: `npm run lint`

## Architecture

- `src/timer/` — timing engine (state machine: idle → armed → inspection → running → stopped)
- `src/events.ts` — the WCA event ids (`222`/`333`/`444`/`555`), display labels, and twisty puzzle mapping; single source of truth
- `src/scramble/` — per-event scramble generation + prefetch queue, wraps cubing.js
- `src/solver/` — CFOP example-solve engine (cross, F2L, OLL, PLL); **3x3 only**
- `src/stats/` — session storage, averages, PB tracking; each session is tagged with one event
- `src/components/` — UI components; TwistyViewer wraps <twisty-player>

## Domain rules (WCA compliance — do not deviate)

- Scrambles MUST come from `cubing/scramble`
  (`randomScrambleForEvent(eventId)`) for the session's event. Never hand-roll
  scramble moves.
- Scramble type follows official WCA/TNoodle behavior, which cubing.js
  implements: 2x2, 3x3, and 4x4 are **random-state**; 5x5 is **random-moves**
  (no random-state 5x5 generator exists). Do not "fix" 5x5 to random-state,
  and do not downgrade the random-state events to random-moves.
- The CFOP example solve is **3x3 only**; its UI renders only when the
  session's event is `333`.
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
