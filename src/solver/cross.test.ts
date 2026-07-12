// @vitest-environment node
import { expect, test } from "vitest";
import { crossTableStats, solveCross } from "./cross";
import {
  applyMoves,
  FACE_MOVES,
  faceletsFromMoves,
  isCrossSolved,
  SOLVED,
} from "./cube";

/** Deterministic pseudo-random scramble from our own move set. */
function pseudoScramble(seed: number, length = 30): string[] {
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  return Array.from({ length }, () => FACE_MOVES[Math.floor(rand() * FACE_MOVES.length)]);
}

test("cross coordinate table: 190,080 reachable states, God's number 8", () => {
  expect(crossTableStats()).toEqual({ reachable: 190_080, maxDistance: 8 });
});

test("a solved cube needs only the z2 convention move", () => {
  expect(solveCross(SOLVED).moves).toEqual(["z2"]);
});

test("a single-move scramble gets a single-move optimal cross", () => {
  expect(solveCross(faceletsFromMoves("F")).moves).toEqual(["z2", "F'"]);
});

test("100 pseudo-random scrambles: cross solved in ≤ 8 optimal face moves", () => {
  for (let seed = 1; seed <= 100; seed++) {
    const scramble = pseudoScramble(seed);
    const state = faceletsFromMoves(scramble);
    const { moves } = solveCross(state);
    expect(moves[0]).toBe("z2");
    expect(moves.length - 1).toBeLessThanOrEqual(8);
    const after = applyMoves(state, moves);
    expect(isCrossSolved(after), scramble.join(" ")).toBe(true);
  }
});
