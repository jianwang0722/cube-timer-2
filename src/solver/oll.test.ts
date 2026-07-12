// @vitest-environment node
import { expect, test } from "vitest";
import { solveCross } from "./cross";
import {
  applyMoves,
  FACE_MOVES,
  faceletsFromMoves,
  invertMoves,
  isF2LSolved,
  isLLOriented,
  netPreservesOutside,
  U_LAYER_POSITIONS,
} from "./cube";
import { solveF2L } from "./f2l";
import { llOrientationPattern, ollPatterns, solveOLL } from "./oll";
import { OLL_ALGS } from "./tables/oll";

const ORIENTED = faceletsFromMoves("z2");

function pseudoScramble(seed: number, length = 30): string[] {
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  return Array.from({ length }, () => FACE_MOVES[Math.floor(rand() * FACE_MOVES.length)]);
}

test("there are 57 algs and each net-preserves everything below the last layer", () => {
  expect(Object.keys(OLL_ALGS)).toHaveLength(57);
  for (const [caseId, alg] of Object.entries(OLL_ALGS)) {
    expect(netPreservesOutside(alg, U_LAYER_POSITIONS), `OLL ${caseId}: ${alg}`).toBe(true);
  }
});

test("the 57 case patterns plus solved tile all 216 orientation patterns", () => {
  // All legal LL orientation patterns: corner twists summing to 0 mod 3,
  // edge flips summing to 0 mod 2, packed like llOrientationPattern.
  const legal = new Set<number>();
  for (let c = 0; c < 81; c++) {
    const twists = [Math.floor(c / 27) % 3, Math.floor(c / 9) % 3, Math.floor(c / 3) % 3, c % 3];
    if (twists.reduce((a, b) => a + b, 0) % 3 !== 0) continue;
    for (let e = 0; e < 16; e++) {
      const flips = [(e >> 3) & 1, (e >> 2) & 1, (e >> 1) & 1, e & 1];
      if (flips.reduce((a, b) => a + b, 0) % 2 !== 0) continue;
      const id = twists.reduce((a, t) => a * 3 + t, 0) * 16 + (flips[0] << 3 | flips[1] << 2 | flips[2] << 1 | flips[3]);
      legal.add(id);
    }
  }
  expect(legal.size).toBe(216);

  const covered = new Set<number>([0]); // solved pattern
  for (const [caseId, alg] of Object.entries(OLL_ALGS)) {
    let state = applyMoves(ORIENTED, invertMoves(alg));
    for (let k = 0; k < 4; k++) {
      const pattern = llOrientationPattern(state);
      expect(legal.has(pattern), `OLL ${caseId} AUF ${k} produced an illegal pattern`).toBe(true);
      covered.add(pattern);
      state = applyMoves(state, "U");
    }
  }
  const missing = [...legal].filter((p) => !covered.has(p));
  expect(missing, `missing patterns: ${missing.join(", ")}`).toHaveLength(0);
  expect(covered.size).toBe(216);
});

test("every case round-trips: setup via inverse, recognize, orient, keep F2L", () => {
  for (const [caseIdStr, alg] of Object.entries(OLL_ALGS)) {
    const caseId = Number(caseIdStr);
    const base = applyMoves(ORIENTED, invertMoves(alg));
    expect(solveOLL(base).caseId, `exact match for OLL ${caseId}`).toBe(caseId);

    for (const extra of ["", "U", "U2", "U'"]) {
      const state = extra === "" ? base : applyMoves(base, extra);
      const solution = solveOLL(state);
      expect(solution.caseId).toBeGreaterThan(0);
      const after = applyMoves(state, solution.moves);
      expect(isLLOriented(after), `OLL ${caseId} +${extra}`).toBe(true);
      expect(isF2LSolved(after), `OLL ${caseId} +${extra}`).toBe(true);
    }
  }
});

test("an oriented last layer is a no-op", () => {
  expect(solveOLL(ORIENTED)).toEqual({ caseId: 0, moves: [] });
  expect(solveOLL(applyMoves(ORIENTED, "U2"))).toEqual({ caseId: 0, moves: [] });
});

test("recognition patterns are unique per case", () => {
  expect(ollPatterns().size).toBe(57);
});

test("cross + F2L + OLL orient the last layer on 40 pseudo-random scrambles", () => {
  for (let seed = 101; seed <= 140; seed++) {
    let state = faceletsFromMoves(pseudoScramble(seed));
    state = applyMoves(state, solveCross(state).moves);
    for (const pair of solveF2L(state).pairs) state = applyMoves(state, pair.moves);
    const oll = solveOLL(state);
    state = applyMoves(state, oll.moves);
    expect(isLLOriented(state), `seed ${seed}`).toBe(true);
    expect(isF2LSolved(state), `seed ${seed}`).toBe(true);
  }
});
