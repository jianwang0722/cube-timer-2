// @vitest-environment node
import { Alg } from "cubing/alg";
import type { KPattern } from "cubing/kpuzzle";
import { puzzles } from "cubing/puzzles";
import { expect, test } from "vitest";
import {
  applyMoves,
  faceletsFromMoves,
  isCrossSolved,
  isF2LSolved,
  isLLOriented,
  isSolved,
  MOVE_NAMES,
  SOLVED,
  type Facelets,
} from "./cube";
import { CORNER_FACELETS, EDGE_FACELETS } from "./tables/facelets";

// cubing.js 3x3x3 orbit piece orders, probed and recorded in
// docs/wip-solver-core.md (names mapped onto our table keys).
const EDGE_ORDER = ["UF", "UR", "UB", "UL", "DF", "DR", "DB", "DL", "FR", "FL", "BR", "BL"];
const CORNER_ORDER = ["URF", "UBR", "ULB", "UFL", "DFR", "DLF", "DBL", "DRB"];
const CENTER_FACES = [0, 4, 2, 1, 5, 3]; // CENTERS orbit order U L F R B D -> face ids

const kpuzzlePromise = puzzles["3x3x3"].kpuzzle();

/**
 * Independent KPattern -> facelets converter (test-only). A disagreement
 * with the solver model means one of the two is wrong — the whole point of
 * keeping the referee separate.
 */
function kpatternToFacelets(pattern: KPattern): Facelets {
  const f = new Uint8Array(54);
  const data = pattern.patternData as Record<
    string,
    { pieces: number[]; orientation: number[] }
  >;

  data.CENTERS.pieces.forEach((piece, slot) => {
    f[CENTER_FACES[slot] * 9 + 4] = CENTER_FACES[piece];
  });

  data.EDGES.pieces.forEach((piece, slot) => {
    const o = data.EDGES.orientation[slot];
    const slots = EDGE_FACELETS[EDGE_ORDER[slot]];
    const colors = EDGE_FACELETS[EDGE_ORDER[piece]].map((pos) => Math.floor(pos / 9));
    for (let k = 0; k < 2; k++) f[slots[k]] = colors[(k + o) % 2];
  });

  data.CORNERS.pieces.forEach((piece, slot) => {
    const o = data.CORNERS.orientation[slot];
    const slots = CORNER_FACELETS[CORNER_ORDER[slot]];
    const colors = CORNER_FACELETS[CORNER_ORDER[piece]].map((pos) => Math.floor(pos / 9));
    for (let k = 0; k < 3; k++) f[slots[k]] = colors[(k - o + 3) % 3];
  });

  return f;
}

async function kpuzzleFacelets(alg: string): Promise<Facelets> {
  const kp = await kpuzzlePromise;
  return kpatternToFacelets(kp.defaultPattern().applyAlg(Alg.fromString(alg)));
}

test("converter maps the solved pattern to solved facelets", async () => {
  expect(await kpuzzleFacelets("")).toEqual(SOLVED);
});

test("all 27 move permutations match KPuzzle exactly", async () => {
  expect(MOVE_NAMES).toHaveLength(27);
  for (const move of MOVE_NAMES) {
    expect(faceletsFromMoves(move), `move ${move}`).toEqual(await kpuzzleFacelets(move));
  }
});

test("compound sequences with rotations match KPuzzle", async () => {
  const algs = [
    "R U R' U'",
    "z2",
    "x y z2 F2 B",
    "z2 D2 R' F B2 L' U2 R D' L2 F' B U R2 D",
    "y' L2 U' x F R2 B' D L' z F2",
  ];
  for (const alg of algs) {
    expect(faceletsFromMoves(alg), alg).toEqual(await kpuzzleFacelets(alg));
  }
});

test("move algebra: orders and inverses", () => {
  for (const base of ["U", "D", "L", "R", "F", "B", "x", "y", "z"]) {
    expect(faceletsFromMoves([base, base, base, base]), `${base}^4`).toEqual(SOLVED);
    expect(faceletsFromMoves([base, `${base}'`]), `${base} ${base}'`).toEqual(SOLVED);
    expect(faceletsFromMoves([`${base}2`, `${base}2`]), `${base}2^2`).toEqual(SOLVED);
    expect(faceletsFromMoves([base, base]), `${base}2 = ${base}·${base}`).toEqual(
      faceletsFromMoves(`${base}2`),
    );
  }
  const sexy6 = Array.from({ length: 6 }, () => "R U R' U'").join(" ");
  expect(faceletsFromMoves(sexy6)).toEqual(SOLVED);
  const tPerm = "R U R' U' R' F R2 U' R' U' R U R' F'";
  expect(faceletsFromMoves(`${tPerm} ${tPerm}`)).toEqual(SOLVED);
});

test("superflip: corners stay solved, edges all flipped, order 2", () => {
  const superflip = "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2";
  const f = faceletsFromMoves(superflip);
  expect(isSolved(f)).toBe(false);
  // Corners match their face centers everywhere.
  for (const [a, b, c] of Object.values(CORNER_FACELETS)) {
    for (const pos of [a, b, c]) {
      expect(f[pos]).toBe(f[Math.floor(pos / 9) * 9 + 4]);
    }
  }
  // Every edge is flipped: stickers swapped relative to their faces.
  for (const [p, q] of Object.values(EDGE_FACELETS)) {
    expect(f[p]).toBe(f[Math.floor(q / 9) * 9 + 4]);
    expect(f[q]).toBe(f[Math.floor(p / 9) * 9 + 4]);
  }
  expect(applyMoves(f, superflip)).toEqual(SOLVED);
});

test("stage invariants behave on known states", () => {
  expect(isSolved(SOLVED)).toBe(true);
  expect(isCrossSolved(SOLVED)).toBe(true);
  expect(isF2LSolved(SOLVED)).toBe(true);
  expect(isLLOriented(SOLVED)).toBe(true);

  // U only permutes the last layer: F2L intact, LL still oriented, not solved.
  const afterU = faceletsFromMoves("U");
  expect(isF2LSolved(afterU)).toBe(true);
  expect(isLLOriented(afterU)).toBe(true);
  expect(isSolved(afterU)).toBe(false);

  // R breaks the (center-relative) cross.
  expect(isCrossSolved(faceletsFromMoves("R"))).toBe(false);

  // Whole-cube rotations change nothing (all checks are center-relative).
  for (const rot of ["z2", "x", "y'", "x y z"]) {
    const f = faceletsFromMoves(rot);
    expect(isSolved(f), rot).toBe(true);
    expect(isCrossSolved(f), rot).toBe(true);
    expect(isF2LSolved(f), rot).toBe(true);
  }
});
