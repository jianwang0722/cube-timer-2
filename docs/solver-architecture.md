# CFOP Example-Solve Engine — Architecture

Living design doc for Phase 5 (docs/plan.md). Update the **Status** table and
**Decision log** as each stage lands; don't let this drift from the code.

## Goal & non-goals

Produce a **human-style CFOP example solve** for the current scramble: cross →
four F2L pairs → OLL → PLL, each stage labeled, totalling roughly 55–70 STM
like a real solver would turn. That band is a **target, not a floor**: 5.7
gates it on both sides, because a solver that searches its way below 55 has
stopped producing the thing this feature is for. Non-goals: fewest-moves
solving, alternative methods (Roux is a Phase 7 stretch), speed-optimal algs
per case, cross colors other than white, and **other cube sizes** — the solver
is and stays 3x3-only. Multi-event support (Phase 6)
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

Rationale: the searches need cheap state expansion by the hundred thousand —
the cross table alone BFSes 190,080 states over 18 moves at first use.
KPuzzle allocates per move; a facelet permutation on a `Uint8Array` doesn't.
Keeping KPuzzle as an *independent* referee means a bug in either model is
caught by the harness instead of agreeing with itself.

Facelet conventions (5.1 will pin these down in code):
- Face order `U R F D L B`, indices `face * 9 + sticker`, stickers 0–8 in
  reading order per face (matches the common Kociemba facelet layout).
- Move set: 18 bases each in `{1, ', 2}` — outer `U D L R F B`, wide
  `r l u d f b`, slice `M S E`, rotations `x y z`. Wide and slice moves are
  **representable but never generated**: they exist so the OLL/PLL tables can
  hold the standard printed algs, and `FACE_MOVES` (the search vocabulary for
  cross and F2L) is an explicit 18-move outer-turn allowlist that excludes
  them. Each is derived by composition (`r = x L`, `M = x' L' R`, …) and
  cross-checked against KPuzzle.

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
| 5.2 | `cross.ts` | exact BFS distance table over the 4 white edges' (slot, flip) coordinate — 190,080 reachable states, cross God's number 8 — then gradient descent, so the cross is *provably optimal*, not merely depth-bounded. 5.7 added `optimalCrossSolutions` to enumerate the ties |
| 5.3 | `f2l.ts` | pair detection (slot + case classification) + standard case table; solves pairs one at a time |
| 5.4 | `oll.ts` | 57-case recognition from the last-layer orientation pattern, U-pre-rotation (AUF) handling, alg table |
| 5.5 | `pll.ts` | 21-case recognition from last-layer permutation, alg table + final AUF |
| 5.6 | `solve.ts` | pipeline orchestration, `Solution` types, runtime guard call |
| 5.7 | `cleanup.ts` | adjacent-move cancellation over stage-tagged moves + trailing-rotation strip |
| 5.7 | `cleanup.ts` + edits across | quality pass: best-of-N optimal crosses, easiest-first F2L, adjacent-move cancellation across stage seams, wide moves in the alg tables |

## Solution data shape (5.6)

```ts
interface SolutionStage {
  name: "cross" | "f2l-1" | "f2l-2" | "f2l-3" | "f2l-4" | "oll" | "pll";
  moves: string;        // space-separated, may start with a rotation
  annotation: string;   // e.g. "Cross (white)", "F2L pair 3", "OLL 27", "T-perm"
  moveCount: number;    // turns in this stage; rotations excluded
}

interface Solution {
  stages: SolutionStage[];
  totalMoves: number;   // STM count across stages
}
```

There is no `auf` stage — the final AUF is folded into `pll` (see the decision
log). Since 5.7 an annotation may carry a `" (cancelled)"` suffix when seam
cancellation consumed that stage's moves entirely.

`stages.map(s => s.moves).join(" ")` must pass `verifySolution` against the
scramble — that exact string is also what twisty-player plays back.

## Interim milestone (ships early, behind a label)

While 5.2–5.5 are in progress, a **"Computer solution"** can ship using
cubing.js `experimentalSolve3x3x3IgnoringCenters` (`cubing/search`) — same
`Solution` shape with a single unlabeled stage. The 5.0 property tests already
exercise this machinery.

## Performance stance

Main thread first. Budget: **< 100 ms per full solve** (median, measured in
unit tests on the property corpus). Since 5.7 the cost is dominated by solving
the whole cube once per candidate cross — measured median **0.84 ms**, still
~100x inside budget, so `CROSS_CANDIDATES` is limited by solution *quality*
(staying in the 55–70 STM band), not by time. The one-off cost is building the
190,080-state cross distance table at first use. Only introduce a worker if
measurements say so — the scramble worker precedent (Phase 2) shows how, but
adds async plumbing we shouldn't pay for speculatively.

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
| 5.7 quality | done |

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
- **2026-08-16** (5.7) — **Cross color is white, permanently** (user
  decision). "Prefer shorter cross solutions" is therefore reinterpreted: the
  cross is already optimal, so the quality lever is *which* optimal cross.
  `optimalCrossSolutions` enumerates the ties and `solve()` runs the full
  pipeline once per candidate, keeping the fewest turns (tiebreak: fewer
  rotations, then generation order, so `solve()` stays deterministic).
- **2026-08-16** (5.7) — `CROSS_CANDIDATES = 6`, tuned rather than maximized.
  Mean STM by candidate count: 1 → 60.4, 2 → 58.5, 4 → 56.7, 6 → 56.0,
  8 → 55.4, 16 → 54.7, 32 → 54.2. Searching harder walks out the *bottom* of
  the 55–70 band; the goal is a solve that reads like a good human's, not the
  shortest one findable. Six keeps ~70% of the gain and stays inside the band.
- **2026-08-16** (5.7) — F2L is easiest-first: trial-solve every open pair,
  commit the cheapest (turns, with a half-move nudge against y-alignment).
  Trials are free because `applyMoves` never mutates in place. This is the
  single biggest win (F2L 37.3 → 30.6 STM) and it mostly eliminates pops on
  its own — a buried pair scores badly and waits until it comes free.
- **2026-08-16** (5.7) — Cancellation crosses stage seams (user decision).
  Consequence accepted: a printed alg can appear abridged (26% of solves cut
  ≥1 move from a last-layer stage, mean 0.5). A survivor is attributed to the
  *earlier* stage, which keeps stage tags non-decreasing and therefore each
  stage's moves contiguous. The leading `z2` is pinned, without which an
  already-solved cube cleans away to an empty alg.
- **2026-08-16** (5.7) — Wide and slice moves became first-class in the
  facelet model so the alg tables hold standard printed algs. The tables were
  converted mechanically with every rewrite rule and every resulting alg
  checked permutation-equal, so no algorithm changed meaning. Mean rotations
  per solve 7.8 → 5.8.
- **2026-08-16** (5.7) — Measured end state on the 500-scramble corpus:
  **mean 56.0 STM** (was 68.4), median solve 0.84 ms (was 0.07 ms; still
  ~100x inside the 100 ms budget). `pipeline.test.ts` gates the mean on both
  sides, 52 < mean < 60.
- **2026-07-20** (Phase 6) — Multi-event support (2x2/4x4/5x5) landed with
  **zero solver changes**. The solver stays 3x3-only; `App` renders
  `SolutionPanel`/`SolutionModal` only when `currentEvent === "333"`. Because
  `useSolution` is reveal-triggered, not rendering those components means no
  solver code (and no `cubing/search` import) ever runs for other events.

## Open questions (decide in the stage that hits them)

- **Alg table sources** (5.3–5.5): standard printable CFOP tables, encoded as
  data files with case ids matching speedcubing convention (OLL 1–57,
  PLL letter names). Every table entry gets a harness-backed test.

Resolved:

- ~~**Cross color** (5.2/5.7)~~ — white only, permanently (5.7, user
  decision). Not a stepping stone: the six-color search is dropped, not
  deferred. 5.7 instead picks the best among equally-optimal *white* crosses.
- ~~**F2L slot order** (5.3)~~ — easiest-first (5.7). Was fixed FR/FL/BR/BL.
