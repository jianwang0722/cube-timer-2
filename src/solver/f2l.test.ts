// @vitest-environment node
import { expect, test } from "vitest";
import { solveCross } from "./cross";
import {
  applyMoves,
  FACE_MOVES,
  faceletsFromMoves,
  isCrossSolved,
  isF2LSolved,
  SOLVED,
} from "./cube";
import { F2L_GADGETS, f2lTableStats, gadgetPreserves, solveF2L } from "./f2l";

function pseudoScramble(seed: number, length = 30): string[] {
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  return Array.from({ length }, () => FACE_MOVES[Math.floor(rand() * FACE_MOVES.length)]);
}

test("every trigger gadget net-preserves the cube outside U layer + FR slot", () => {
  for (const gadget of F2L_GADGETS) {
    expect(gadgetPreserves(gadget), gadget).toBe(true);
  }
  // A known non-preserving sequence is rejected (the check has teeth).
  expect(gadgetPreserves("R U")).toBe(false);
  expect(gadgetPreserves("F")).toBe(false);
});

test("the gadget table reaches all 150 pair states", () => {
  const stats = f2lTableStats();
  expect(stats.reachable).toBe(150);
  expect(stats.maxDepth).toBeGreaterThan(0);
  expect(stats.maxDepth).toBeLessThanOrEqual(8);
});

test("a solved cube yields four empty pairs", () => {
  const afterCross = applyMoves(SOLVED, "z2");
  const { pairs } = solveF2L(afterCross);
  expect(pairs).toHaveLength(4);
  for (const pair of pairs) expect(pair.moves).toEqual([]);
});

test("cross + F2L solve the first two layers on 60 pseudo-random scrambles", () => {
  for (let seed = 1; seed <= 60; seed++) {
    const scramble = pseudoScramble(seed);
    let state = faceletsFromMoves(scramble);
    const cross = solveCross(state);
    state = applyMoves(state, cross.moves);
    expect(isCrossSolved(state)).toBe(true);

    const { pairs } = solveF2L(state);
    expect(pairs).toHaveLength(4);
    for (const pair of pairs) {
      state = applyMoves(state, pair.moves);
      // The cross must survive every single pair.
      expect(isCrossSolved(state), `seed ${seed}: ${pair.moves.join(" ")}`).toBe(true);
    }
    expect(isF2LSolved(state), `seed ${seed}`).toBe(true);
  }
});
