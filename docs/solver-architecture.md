# CFOP Example-Solve Engine — Architecture

Living design doc for Phase 5 (docs/plan.md). Update the **Status** table and
**Decision log** as each stage lands; don't let this drift from the code.

## Goal & non-goals

Produce a **human-style CFOP example solve** for the current scramble: cross →
four F2L pairs → OLL → PLL, each stage labeled, totalling roughly 55–70 STM
like a real solver would turn. Non-goals: fewest-moves solving, alternative
methods (Roux is a Phase 6 stretch), speed-optimal algs per case.

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
| 5.2 cross | not started |
| 5.3 F2L | not started |
| 5.4 OLL | not started |
| 5.5 PLL | not started |
| 5.6 pipeline/UI | not started |
| 5.7 quality | not started |

## Decision log

- **2026-07-11** — Solver uses its own facelet model; KPuzzle referees only
  (user decision). Rationale above.
- **2026-07-11** — "Solved" is orientation-invariant in the harness.
- **2026-07-11** — Main-thread solver until measurements demand a worker.

## Open questions (decide in the stage that hits them)

- **Cross color** (5.2/5.7): white-only first; 5.7 may try all six and keep
  the shortest cross. Annotation must name the color either way.
- **Alg table sources** (5.3–5.5): standard printable CFOP tables, encoded as
  data files with case ids matching speedcubing convention (OLL 1–57,
  PLL letter names). Every table entry gets a harness-backed test.
- **F2L slot order** (5.3): fixed order vs. easiest-first; start fixed
  (FR, FL, BR, BL), revisit in 5.7.
