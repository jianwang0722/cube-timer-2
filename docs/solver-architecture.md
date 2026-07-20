# CFOP Example-Solve Engine — Architecture

Living design doc for Phase 5 (docs/plan.md). Update the **Status** table and
**Decision log** as each stage lands; don't let this drift from the code.

## Goal & non-goals

Produce a **human-style CFOP example solve** for the current scramble: cross →
four F2L pairs → OLL → PLL, each stage labeled, totalling roughly 55–70 STM
like a real solver would turn. Non-goals: fewest-moves solving, alternative
methods (Roux is a Phase 7 stretch), speed-optimal algs per case, and **other
cube sizes** — the solver is and stays 3x3-only. Multi-event support (Phase 6)
gates the whole example-solve UI on the session's event being `333`, so no
solver code runs for 2x2/4x4/5x5.

## The three representations (decided)

One cube, three representations, each with a single job. Solver logic never
touches cubing.js internals; cubing.js never referees itself.

| Layer | Representation | Used by | Never used for |
|---|---|---|---|
| Solver internals | `Uint8Array(54)` facelet model + precomputed move-permutation tables (`src/solver/cube.ts`, stage 5.1) | cross search, F2L/OLL/PLL recognition | UI, verification |
| Referee | cubing.js **KPuzzle** (`puzzles["3x3x3"]`) | the 5.0 harness and tests only | solver logic |
| Boundary / UI | `Alg` strings | scramble in, annotated solution out, twisty-player playback (`alg` prop reserved since Phase 2) | search |

Rationale: IDA*/BFS needs tens of thousands of cheap state expansions —
KPuzzle allocates per move; a facelet permutation on a `Uint8Array` doesn't.
Keeping KPuzzle as an *independent* referee means a bug in either model is
caught by the harness instead of agreeing with itself.

Facelet conventions (5.1 will pin these down in code):
- Face order `U R F D L B`, indices `face * 9 + sticker`, stickers 0–8 in
  reading order per face (matches the common Kociemba facelet layout).
- Move set: `U D L R F B` each in `{1, ', 2}` (STM), plus rotations `x y z`
  for stage transitions. Wide moves are not generated.

## Verification contract (5.0 — the law)

`src/solver/verify.ts` is merged **before any solver code** and referees all
of it:

- `verifySolution(scramble, solution)` applies both to a KPuzzle and reports
  `{ solved: true } | { solved: false; reason }`. **Solved means solved up to
  whole-cube orientation** — CFOP solutions legitimately contain x/y/z
  rotations and may end anywhere.
- `assertSolves(scramble, solution)` — throwing form for tests.
- **Runtime guard**: 5.6 must `await verifySolution(...)` and refuse to
  render a solution that fails (show an error state instead — a wrong
  example solve is worse than none).
- **Acceptance corpus** (from docs/plan.md): 500 random scrambles → every
  generated solution verifies; every OLL and every PLL case hit at least
  once across the corpus.
- **Per-stage invariants** (each stage's tests assert these on the facelet
  model; the harness checks the end-to-end product):
  - after cross: the 4 cross-color edges are placed and oriented;
  - after F2L #k: cross intact + k corner/edge pairs solved;
  - after OLL: first two layers intact + last layer oriented;
  - after PLL + AUF: cube solved.

## Pipeline & module map (`src/solver/`)

| Stage | File | Contents |
|---|---|---|
| 5.0 | `verify.ts` | KPuzzle harness (above) |
| 5.1 | `cube.ts` | facelet model, move tables, `applyMoves`, solved-checks used by stage invariants |
| 5.2 | `cross.ts` | IDA* (depth ≤ 8) for the cross on the chosen color; returns annotated moves |
| 5.3 | `f2l.ts` | pair detection (slot + case classification) + standard case table; solves pairs one at a time |
| 5.4 | `oll.ts` | 57-case recognition from the last-layer orientation pattern, U-pre-rotation (AUF) handling, alg table |
| 5.5 | `pll.ts` | 21-case recognition from last-layer permutation, alg table + final AUF |
| 5.6 | `solve.ts` | pipeline orchestration, `Solution` types, runtime guard call |
| 5.7 | (edits across) | quality pass: pick best cross color/solution, drop trivial rotations, move-count tuning |

## Solution data shape (5.6)

```ts
interface SolutionStage {
  name: "cross" | "f2l-1" | "f2l-2" | "f2l-3" | "f2l-4" | "oll" | "pll" | "auf";
  moves: string;        // STM, space-separated, may start with a rotation
  annotation: string;   // e.g. "Cross (white)", "F2L pair 3", "OLL 27", "T-perm"
}

interface Solution {
  stages: SolutionStage[];
  totalMoves: number;   // STM count across stages
}
```

`stages.map(s => s.moves).join(" ")` must pass `verifySolution` against the
scramble — that exact string is also what twisty-player plays back.

## Interim milestone (ships early, behind a label)

While 5.2–5.5 are in progress, a **"Computer solution"** can ship using
cubing.js `experimentalSolve3x3x3IgnoringCenters` (`cubing/search`) — same
`Solution` shape with a single unlabeled stage. The 5.0 property tests already
exercise this machinery.

## Performance stance

Main thread first. Budget: **< 100 ms per full solve** (median, measured in
unit tests on the property corpus); the cross IDA* dominates. Only introduce a
worker if measurements say so — the scramble worker precedent (Phase 2) shows
how, but adds async plumbing we shouldn't pay for speculatively.

## Status

| Stage | State |
|---|---|
| 5.0 harness | done |
| 5.1 cube model | done |
| 5.2 cross | done |
| 5.3 F2L | done |
| 5.4 OLL | done |
| 5.5 PLL | done |
| 5.6 pipeline/UI | done |
| 5.7 quality | not started |

## Decision log

- **2026-07-11** — Solver uses its own facelet model; KPuzzle referees only
  (user decision). Rationale above.
- **2026-07-11** — "Solved" is orientation-invariant in the harness.
- **2026-07-11** — Main-thread solver until measurements demand a worker.
- **2026-07-12** — Solutions start with `z2`: white cross solved on the bottom
  (WCA scramble orientation is white-up/green-front; z2 keeps green on F).
- **2026-07-12** — F2L case table is generated at init by BFS over verified
  trigger gadgets (11 gadgets; tests prove net-preservation outside
  U-layer + FR slot and full 150-state reachability).
- **2026-07-12** — OLL/PLL recognition is generated from each alg's inverse
  pattern; tiling proofs pin completeness (57 orbits + solved = 216
  orientation patterns; 21 cases x pre/post-AUF orbits + solved = 288
  permutation states). Consequence: a transcribed alg that still passes the
  net-preservation and tiling checks can at worst carry a nonstandard case
  LABEL — it cannot produce a wrong solution.
- **2026-07-12** — Measured on the 500-scramble acceptance corpus: median
  solve 0.07 ms, mean 68.4 STM (already in the 55-70 target band before the
  5.7 quality pass).
- **2026-07-12** (5.6) — `solve.ts` is the shipping pipeline, extracted from the
  5.5 acceptance test's inline `solveCFOP`; `pipeline.test.ts` now drives it so
  the property corpus and production code can't drift. `solveVerified()` is the
  runtime guard (`await verifySolution`), returning `{ ok: false; reason }` so
  the UI shows an error rather than a wrong example solve.
- **2026-07-12** (5.6) — Final AUF is folded into the PLL stage's moves (as the
  solver emits it); there is no separate `auf` stage. Stage list is therefore
  cross, f2l-1..4, oll, pll.
- **2026-07-12** (5.6) — Presentation is **on-demand** ("Show solution" button):
  spoiler-safe, computes/verifies only when asked, and re-hides on a new
  scramble (`useSolution`). Playback reuses the shared preview's
  `<twisty-player>` via its built-in control bar (play/pause/step/scrub),
  enabled only while a solution alg is loaded.
- **2026-07-20** (Phase 6) — Multi-event support (2x2/4x4/5x5) landed with
  **zero solver changes**. The solver stays 3x3-only; `App` renders
  `SolutionPanel`/`SolutionModal` only when `currentEvent === "333"`. Because
  `useSolution` is reveal-triggered, not rendering those components means no
  solver code (and no `cubing/search` import) ever runs for other events.

## Open questions (decide in the stage that hits them)

- **Cross color** (5.2/5.7): white-only first; 5.7 may try all six and keep
  the shortest cross. Annotation must name the color either way.
- **Alg table sources** (5.3–5.5): standard printable CFOP tables, encoded as
  data files with case ids matching speedcubing convention (OLL 1–57,
  PLL letter names). Every table entry gets a harness-backed test.
- **F2L slot order** (5.3): fixed order vs. easiest-first; start fixed
  (FR, FL, BR, BL), revisit in 5.7.
