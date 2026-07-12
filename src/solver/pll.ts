/**
 * Stage 5.5 — PLL (docs/solver-architecture.md).
 *
 * Recognition is generated from each alg's inverse (like OLL): the pattern is
 * the ring of last-layer side-sticker colors, expressed relative to the side
 * centers so rotations can't confuse it. Runtime tries the four pre-AUFs,
 * applies the matched alg, then appends the final AUF that leaves the cube
 * fully solved.
 */
import {
  applyMoves,
  faceletsFromMoves,
  invertMoves,
  isSolved,
  parseMoves,
  type Facelets,
} from "./cube";
import { CORNER_FACELETS, EDGE_FACELETS, FACE } from "./tables/facelets";
import { PLL_ALGS } from "./tables/pll";

const U_CORNERS = ["URF", "UFL", "ULB", "UBR"];
const U_EDGES = ["UR", "UF", "UL", "UB"];
const AUFS = ["", "U", "U2", "U'"];
const SIDE_FACES = [FACE.R, FACE.F, FACE.L, FACE.B];

/**
 * Permutation pattern of an oriented last layer: the 12 side stickers
 * (2 per corner, 1 per edge) mapped to side-face indices, packed base-4.
 */
export function llPermutationPattern(f: Facelets): number {
  const colorToSide = new Map<number, number>();
  SIDE_FACES.forEach((face, i) => colorToSide.set(f[face * 9 + 4], i));

  let id = 0;
  const push = (color: number) => {
    const side = colorToSide.get(color);
    if (side === undefined) throw new Error("last layer not oriented");
    id = id * 4 + side;
  };
  for (const name of U_CORNERS) {
    const [, s1, s2] = CORNER_FACELETS[name];
    push(f[s1]);
    push(f[s2]);
  }
  for (const name of U_EDGES) {
    const [, side] = EDGE_FACELETS[name];
    push(f[side]);
  }
  return id;
}

let recognition: Map<number, string> | null = null;
let solvedPattern = -1;

function buildRecognition(): Map<number, string> {
  const oriented = faceletsFromMoves("z2");
  solvedPattern = llPermutationPattern(oriented);
  const map = new Map<number, string>();
  for (const [name, alg] of Object.entries(PLL_ALGS)) {
    // A case solves every state U^-k · alg^-1 (the final AUF absorbs U^k), so
    // index all four post-AUF variants of the inverse pattern.
    for (const post of AUFS) {
      const state = applyMoves(oriented, [
        ...(post === "" ? [] : parseMoves(post)),
        ...invertMoves(alg),
      ]);
      const pattern = llPermutationPattern(state);
      const existing = map.get(pattern);
      if (existing !== undefined && existing !== name) {
        throw new Error(`PLL cases ${existing} and ${name} share a pattern`);
      }
      if (pattern === solvedPattern) {
        throw new Error(`PLL ${name} pattern equals the solved pattern`);
      }
      map.set(pattern, name);
    }
  }
  return map;
}

export interface PLLSolution {
  /** null when the layer was already permuted (AUF-only or nothing). */
  caseName: string | null;
  /** Pre-AUF + algorithm + final AUF, as executed. */
  moves: string[];
}

/** Permute the (oriented) last layer and align it — finishes the solve. */
export function solvePLL(afterOLL: Facelets): PLLSolution {
  recognition ??= buildRecognition();

  const finish = (state: Facelets, moves: string[]): string[] => {
    for (const auf of AUFS) {
      const done = auf === "" ? state : applyMoves(state, auf);
      if (isSolved(done)) return auf === "" ? moves : [...moves, auf];
    }
    throw new Error("PLL alg did not leave an AUF-solvable cube");
  };

  // Already permuted: only the final AUF (possibly nothing) remains.
  for (const auf of AUFS) {
    const state = auf === "" ? afterOLL : applyMoves(afterOLL, auf);
    if (isSolved(state)) {
      return { caseName: null, moves: auf === "" ? [] : [auf] };
    }
  }

  for (const auf of AUFS) {
    const state = auf === "" ? afterOLL : applyMoves(afterOLL, auf);
    const caseName = recognition.get(llPermutationPattern(state));
    if (caseName !== undefined) {
      const algMoves = parseMoves(PLL_ALGS[caseName]);
      const moves = [...(auf === "" ? [] : [auf]), ...algMoves];
      return { caseName, moves: finish(applyMoves(state, algMoves), moves) };
    }
  }
  throw new Error("unrecognized PLL pattern — table incomplete");
}

/** Exposed for the tiling test. */
export function pllPatterns(): { map: Map<number, string>; solved: number } {
  recognition ??= buildRecognition();
  return { map: recognition, solved: solvedPattern };
}
