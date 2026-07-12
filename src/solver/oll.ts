/**
 * Stage 5.4 — OLL (docs/solver-architecture.md).
 *
 * Recognition is GENERATED from the alg table: each case's pattern is the
 * last-layer orientation pattern produced by applying the alg's inverse to an
 * oriented cube. Runtime recognition tries the four AUFs and looks the
 * pattern up. oll.test.ts proves the 57 patterns' AUF-orbits plus the solved
 * pattern tile all 216 legal orientation patterns exactly.
 */
import {
  applyMoves,
  faceletsFromMoves,
  invertMoves,
  parseMoves,
  type Facelets,
} from "./cube";
import { CORNER_FACELETS, EDGE_FACELETS, FACE } from "./tables/facelets";
import { OLL_ALGS } from "./tables/oll";

const U_CORNERS = ["URF", "UFL", "ULB", "UBR"];
const U_EDGES = ["UR", "UF", "UL", "UB"];
const AUFS = ["", "U", "U2", "U'"];

/**
 * Orientation pattern of the last layer: 4 corner twists (base 3) and 4 edge
 * flips (base 2) packed into one id. 0 = oriented.
 */
export function llOrientationPattern(f: Facelets): number {
  const u = f[FACE.U * 9 + 4];
  let id = 0;
  for (const name of U_CORNERS) {
    const triple = CORNER_FACELETS[name];
    const ori = triple.findIndex((pos) => f[pos] === u);
    if (ori === -1) throw new Error("last layer corner missing U color");
    id = id * 3 + ori;
  }
  for (const name of U_EDGES) {
    const [primary] = EDGE_FACELETS[name];
    id = id * 2 + (f[primary] === u ? 0 : 1);
  }
  return id;
}

let recognition: Map<number, number> | null = null;

function buildRecognition(): Map<number, number> {
  const map = new Map<number, number>();
  const oriented = applyMoves(faceletsFromMoves("z2"), ""); // white D, LL oriented
  for (const [caseId, alg] of Object.entries(OLL_ALGS)) {
    const state = applyMoves(oriented, invertMoves(alg));
    const pattern = llOrientationPattern(state);
    const existing = map.get(pattern);
    if (existing !== undefined) {
      throw new Error(`OLL cases ${existing} and ${caseId} share a pattern`);
    }
    map.set(pattern, Number(caseId));
  }
  return map;
}

export interface OLLSolution {
  /** 0 when the last layer was already oriented. */
  caseId: number;
  /** Optional pre-AUF followed by the case algorithm. */
  moves: string[];
}

/** Orient the last layer of a cube whose first two layers are solved. */
export function solveOLL(afterF2L: Facelets): OLLSolution {
  recognition ??= buildRecognition();
  if (llOrientationPattern(afterF2L) === 0) {
    return { caseId: 0, moves: [] };
  }
  for (const auf of AUFS) {
    const state = auf === "" ? afterF2L : applyMoves(afterF2L, auf);
    const caseId = recognition.get(llOrientationPattern(state));
    if (caseId !== undefined) {
      const moves = [...(auf === "" ? [] : [auf]), ...parseMoves(OLL_ALGS[caseId])];
      return { caseId, moves };
    }
  }
  throw new Error("unrecognized OLL pattern — table incomplete");
}

/** Exposed for the tiling test. */
export function ollPatterns(): Map<number, number> {
  recognition ??= buildRecognition();
  return recognition;
}
