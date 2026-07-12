# WIP — Phase 5.1–5.5 solver core (branch `phase-5-solver-core`)

Status snapshot, 2026-07-12. Delete this file when 5.5 lands.
The approved stage-by-stage plan lives in the plan file / conversation; the
design contract is `docs/solver-architecture.md`.

## Done (committed here)

- `src/solver/tables/facelets.ts` — Kociemba corner/edge facelet constants.
- `src/solver/cube.ts` — complete 5.1 facelet model: U/x/y hand-written
  generators, all 27 move perms derived by composition, apply/parse helpers,
  and the center-relative stage invariants (`isCrossSolved`,
  `isF2LPairSolved`, `isF2LSolved`, `isLLOriented`, `isSolved`).
  **Compiles and lints; NOT yet test-verified — treat move tables as
  unproven until cube.test.ts exists.** docs/plan.md checkbox 5.1 stays
  unchecked for exactly this reason.

## Half-done / immediate next step

Write `src/solver/cube.test.ts` (the 5.1 gate):

1. Test-only `kpatternToFacelets` converter, then assert **all 27 move perms
   match KPuzzle exactly** (apply move to both models, compare facelets).
2. Algebra checks: m⁴ = id, m2 = m·m, (R U R' U')⁶ = id, T-perm² = id,
   superflip pattern.
3. Invariant helpers on known states.

### Probed cubing.js 3x3x3 orbit conventions (verified by console probes — do not re-derive)

- `EDGES` piece order: `[UF, UR, UB, UL, DF, DR, DB, DL, FR, FL, BR, BL]`
- `CORNERS` piece order: `[UFR, UBR, UBL, UFL, DFR, DFL, DBL, DBR]`
- `CENTERS` piece order: `[U, L, F, R, B, D]`
- `patternData.ORBIT.pieces[slot] = piece now in that slot`; orientation is
  per-slot. Corner-orientation direction (whether converter uses
  `(k + ori) % 3` or `(k − ori) % 3` against the clockwise facelet triples in
  `tables/facelets.ts`) was NOT pinned down — write the converter one way and
  let the 27-move agreement test decide; flip if it fails systematically.

## Then (per approved plan, one commit per stage)

- **5.2 cross**: coordinate BFS over the 4 white edges (index by 4 slots ∈
  0..11 as 12⁴ × 2⁴ flips ≈ 332k array; BFS from solved over the 18 face
  moves; walk the gradient for optimal ≤8 cross; output starts with `z2`).
- **5.3 F2L**: pop buried pieces (`y`-align slot → `R U R'`, safety-bounded),
  y-align target slot to FR, then table lookup — table BFS-generated at init
  over trigger gadgets (each gadget test-proven to net-preserve everything
  outside U-layer + FR slot; exhaustive ~150-state reachability test).
- **5.4 OLL / 5.5 PLL**: alg data files; recognition generated from alg⁻¹
  patterns, canonicalized over AUF; tiling proofs (57 orbits + solved = 216
  orientation patterns; 21 orbits + solved = 288 permutation patterns);
  net-preservation checks on iota arrays catch alg typos non-circularly
  (a typo'd-but-valid alg only mislabels the case number — correctness is
  still guaranteed; note this caveat in the architecture doc when closing).
- **5.5 finale**: 500-scramble cross→F2L→OLL→PLL property test composed in
  the test file (shipping pipeline is 5.6), every solution through
  `assertSolves` (5.0 harness), median < 100 ms budget assertion.
