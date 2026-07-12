// @vitest-environment node
import { expect, test } from "vitest";
import { solveCross } from "./cross";
import {
  applyMoves,
  FACE_MOVES,
  faceletsFromMoves,
  invertMoves,
  isSolved,
  netPreservesOutside,
  U_LAYER_POSITIONS,
} from "./cube";
import { solveF2L } from "./f2l";
import { solveOLL } from "./oll";
import { llPermutationPattern, pllPatterns, solvePLL } from "./pll";
import { PLL_ALGS } from "./tables/pll";

const ORIENTED = faceletsFromMoves("z2");

function pseudoScramble(seed: number, length = 30): string[] {
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  return Array.from({ length }, () => FACE_MOVES[Math.floor(rand() * FACE_MOVES.length)]);
}

test("there are 21 algs and each net-preserves everything below the last layer", () => {
  expect(Object.keys(PLL_ALGS)).toHaveLength(21);
  for (const [name, alg] of Object.entries(PLL_ALGS)) {
    expect(netPreservesOutside(alg, U_LAYER_POSITIONS), `PLL ${name}: ${alg}`).toBe(true);
  }
});

test("the 21 case orbits plus the solved orbit tile all 288 permutation states", () => {
  // Abstract enumeration of every legal oriented-LL permutation state.
  const CORNER_SIDES: [number, number][] = [
    [0, 1], // URF -> R,F
    [1, 2], // UFL -> F,L
    [2, 3], // ULB -> L,B
    [3, 0], // UBR -> B,R
  ];
  const EDGE_SIDES = [0, 1, 2, 3]; // UR UF UL UB -> R F L B

  const perms: number[][] = [];
  const build = (rest: number[], acc: number[]) => {
    if (rest.length === 0) {
      perms.push(acc);
      return;
    }
    for (let i = 0; i < rest.length; i++) {
      build([...rest.slice(0, i), ...rest.slice(i + 1)], [...acc, rest[i]]);
    }
  };
  build([0, 1, 2, 3], []);
  const parity = (p: number[]) => {
    let swaps = 0;
    for (let i = 0; i < p.length; i++) {
      for (let j = i + 1; j < p.length; j++) if (p[i] > p[j]) swaps++;
    }
    return swaps % 2;
  };

  const legal = new Set<number>();
  for (const cp of perms) {
    for (const ep of perms) {
      if (parity(cp) !== parity(ep)) continue;
      let id = 0;
      for (const piece of cp) {
        id = id * 4 + CORNER_SIDES[piece][0];
        id = id * 4 + CORNER_SIDES[piece][1];
      }
      for (const piece of ep) id = id * 4 + EDGE_SIDES[piece];
      legal.add(id);
    }
  }
  expect(legal.size).toBe(288);

  const owner = new Map<number, string>();
  const claim = (pattern: number, name: string) => {
    const existing = owner.get(pattern);
    expect(
      existing === undefined || existing === name,
      `${existing} and ${name} overlap on pattern ${pattern}`,
    ).toBe(true);
    owner.set(pattern, name);
  };
  let state = ORIENTED;
  for (let k = 0; k < 4; k++) {
    claim(llPermutationPattern(state), "solved");
    state = applyMoves(state, "U");
  }
  for (const [name, alg] of Object.entries(PLL_ALGS)) {
    for (const post of ["", "U", "U2", "U'"]) {
      let s = applyMoves(ORIENTED, [
        ...(post === "" ? [] : [post]),
        ...invertMoves(alg),
      ]);
      for (let k = 0; k < 4; k++) {
        const pattern = llPermutationPattern(s);
        expect(legal.has(pattern), `PLL ${name} post ${post} AUF ${k}: illegal pattern`).toBe(true);
        claim(pattern, name);
        s = applyMoves(s, "U");
      }
    }
  }
  const missing = [...legal].filter((p) => !owner.has(p));
  expect(missing, `missing patterns: ${missing.length}`).toHaveLength(0);
  expect(owner.size).toBe(288);
});

test("every case round-trips through recognition, alg, and final AUF", () => {
  // 21 cases x up to 4 post-AUF variants, minus symmetric-case coincidences.
  expect(pllPatterns().map.size).toBeGreaterThanOrEqual(21);
  for (const [name, alg] of Object.entries(PLL_ALGS)) {
    const base = applyMoves(ORIENTED, invertMoves(alg));
    expect(solvePLL(base).caseName, `exact match for PLL ${name}`).toBe(name);

    for (const extra of ["", "U", "U2", "U'"]) {
      const state = extra === "" ? base : applyMoves(base, extra);
      const solution = solvePLL(state);
      expect(solution.caseName).not.toBeNull();
      expect(isSolved(applyMoves(state, solution.moves)), `PLL ${name} +${extra}`).toBe(true);
    }
  }
});

test("an already-permuted layer needs at most the final AUF", () => {
  expect(solvePLL(ORIENTED)).toEqual({ caseName: null, moves: [] });
  expect(solvePLL(applyMoves(ORIENTED, "U'"))).toEqual({ caseName: null, moves: ["U"] });
});

test("full CFOP chain solves 30 pseudo-random scrambles", () => {
  for (let seed = 201; seed <= 230; seed++) {
    let state = faceletsFromMoves(pseudoScramble(seed));
    state = applyMoves(state, solveCross(state).moves);
    for (const pair of solveF2L(state).pairs) state = applyMoves(state, pair.moves);
    state = applyMoves(state, solveOLL(state).moves);
    state = applyMoves(state, solvePLL(state).moves);
    expect(isSolved(state), `seed ${seed}`).toBe(true);
  }
});
