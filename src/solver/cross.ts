/**
 * Stage 5.2 — optimal white cross (docs/solver-architecture.md).
 *
 * Solutions start with z2 (white cross on the bottom, human-style); the
 * remaining moves are found by walking an exact BFS distance table over the
 * 4 white edges' (slot, flip) coordinate — 12^4 x 2^4 indices of which
 * 12·11·10·9 · 16 = 190,080 are reachable. Cross God's number is 8, so the
 * result is always optimal and ≤ 8 face moves after the z2.
 *
 * The cross color is white and only white — a deliberate scope decision, not
 * a stepping stone (docs/solver-architecture.md decision log).
 */
import {
  applyMoves,
  FACE_MOVES,
  permFor,
  type Facelets,
} from "./cube";
import { EDGE_FACELETS, FACE } from "./tables/facelets";

const SLOT_NAMES = ["UR", "UF", "UL", "UB", "DR", "DF", "DL", "DB", "FR", "FL", "BL", "BR"];
const SLOTS = SLOT_NAMES.map((name) => EDGE_FACELETS[name]);
// Cross edges keyed by side color's face, in target-slot order DF DR DB DL.
const TARGET_SIDE_FACES = [FACE.F, FACE.R, FACE.B, FACE.L];
const TARGET_SLOTS = ["DF", "DR", "DB", "DL"].map((n) => SLOT_NAMES.indexOf(n));

const N_INDEX = 12 ** 4 * 16;

interface MoveTables {
  slotMap: Uint8Array[]; // per move: slot -> slot'
  flipMap: Uint8Array[]; // per move: slot -> flip delta
  dist: Uint8Array;
}

let tables: MoveTables | null = null;

function buildTables(): MoveTables {
  const slotMap: Uint8Array[] = [];
  const flipMap: Uint8Array[] = [];
  for (const move of FACE_MOVES) {
    const perm = permFor(move);
    // to[src] = dst for this move's facelet permutation
    const to = new Uint8Array(54);
    for (let dst = 0; dst < 54; dst++) to[perm[dst]] = dst;

    const sMap = new Uint8Array(12);
    const fMap = new Uint8Array(12);
    for (let s = 0; s < 12; s++) {
      const [p, q] = SLOTS[s];
      const tp = to[p];
      const tq = to[q];
      const target = SLOTS.findIndex(
        ([a, b]) => (a === tp && b === tq) || (a === tq && b === tp),
      );
      sMap[s] = target;
      fMap[s] = SLOTS[target][0] === tp ? 0 : 1;
    }
    slotMap.push(sMap);
    flipMap.push(fMap);
  }

  // BFS over the cross coordinate from the solved state.
  const dist = new Uint8Array(N_INDEX).fill(255);
  const solved = encode(TARGET_SLOTS, [0, 0, 0, 0]);
  dist[solved] = 0;
  let frontier = [solved];
  while (frontier.length > 0) {
    const next: number[] = [];
    for (const index of frontier) {
      const d = dist[index];
      const { slots, flips } = decode(index);
      for (let m = 0; m < FACE_MOVES.length; m++) {
        const sMap = slotMap[m];
        const fMap = flipMap[m];
        const ns = [0, 0, 0, 0];
        const nf = [0, 0, 0, 0];
        for (let e = 0; e < 4; e++) {
          ns[e] = sMap[slots[e]];
          nf[e] = flips[e] ^ fMap[slots[e]];
        }
        const ni = encode(ns, nf);
        if (dist[ni] === 255) {
          dist[ni] = d + 1;
          next.push(ni);
        }
      }
    }
    frontier = next;
  }

  return { slotMap, flipMap, dist };
}

function encode(slots: readonly number[], flips: readonly number[]): number {
  const s = ((slots[0] * 12 + slots[1]) * 12 + slots[2]) * 12 + slots[3];
  const f = flips[0] | (flips[1] << 1) | (flips[2] << 2) | (flips[3] << 3);
  return s * 16 + f;
}

function decode(index: number): { slots: number[]; flips: number[] } {
  const f = index % 16;
  let s = Math.floor(index / 16);
  const slots = [0, 0, 0, 0];
  for (let e = 3; e >= 0; e--) {
    slots[e] = s % 12;
    s = Math.floor(s / 12);
  }
  return { slots, flips: [f & 1, (f >> 1) & 1, (f >> 2) & 1, (f >> 3) & 1] };
}

/** Read the cross coordinate off a facelet state (post-z2 orientation). */
function extract(f: Facelets): number {
  const white = f[FACE.D * 9 + 4];
  const sideColor = TARGET_SIDE_FACES.map((face) => f[face * 9 + 4]);
  const slots = [-1, -1, -1, -1];
  const flips = [0, 0, 0, 0];
  for (let s = 0; s < 12; s++) {
    const [p, q] = SLOTS[s];
    let other: number;
    let flip: number;
    if (f[p] === white) {
      other = f[q];
      flip = 0;
    } else if (f[q] === white) {
      other = f[p];
      flip = 1;
    } else {
      continue;
    }
    const edge = sideColor.indexOf(other);
    slots[edge] = s;
    flips[edge] = flip;
  }
  return encode(slots, flips);
}

export interface CrossSolution {
  /** Always starts with "z2"; the rest are ≤ 8 optimal face moves. */
  moves: string[];
}

/** Every move that steps one closer to a solved cross. */
function descend(index: number, t: MoveTables): { move: string; index: number }[] {
  const target = t.dist[index] - 1;
  const { slots, flips } = decode(index);
  const out: { move: string; index: number }[] = [];
  for (let m = 0; m < FACE_MOVES.length; m++) {
    const ns = [0, 0, 0, 0];
    const nf = [0, 0, 0, 0];
    for (let e = 0; e < 4; e++) {
      ns[e] = t.slotMap[m][slots[e]];
      nf[e] = flips[e] ^ t.flipMap[m][slots[e]];
    }
    const ni = encode(ns, nf);
    if (t.dist[ni] === target) out.push({ move: FACE_MOVES[m], index: ni });
  }
  return out;
}

/**
 * Up to `limit` distinct **optimal** cross solutions, each "z2" followed by
 * ≤ 8 face moves.
 *
 * A cross state usually has many shortest solutions, and they are not
 * interchangeable: each leaves the other 16 pieces somewhere different, so
 * the choice decides how much work F2L then has. 5.7 solves the whole cube
 * once per candidate and keeps the best (see solve.ts) instead of taking
 * whichever one the search happened to reach first.
 *
 * Enumeration is a DFS down the distance gradient in FACE_MOVES order, so the
 * first result is exactly what the original greedy walk produced and the
 * output is deterministic. Truncation at `limit` therefore favours branches
 * starting with U/F moves — a sampling bias, not a correctness issue.
 */
export function optimalCrossSolutions(scrambled: Facelets, limit = 1): string[][] {
  const t = (tables ??= buildTables());
  const start = extract(applyMoves(scrambled, "z2"));
  if (t.dist[start] === 255) {
    throw new Error("Cross state unreachable — corrupt cube state");
  }

  const found: string[][] = [];
  const path: string[] = [];
  const walk = (index: number): void => {
    if (t.dist[index] === 0) {
      found.push(["z2", ...path]);
      return;
    }
    for (const step of descend(index, t)) {
      if (found.length >= limit) return;
      path.push(step.move);
      walk(step.index);
      path.pop();
    }
  };
  walk(start);

  if (found.length === 0) throw new Error("Cross walk stuck — distance table corrupt");
  return found;
}

export function solveCross(scrambled: Facelets): CrossSolution {
  return { moves: optimalCrossSolutions(scrambled, 1)[0] };
}

/** Exposed for tests: reachable-state count and max distance. */
export function crossTableStats(): { reachable: number; maxDistance: number } {
  tables ??= buildTables();
  let reachable = 0;
  let maxDistance = 0;
  for (const d of tables.dist) {
    if (d !== 255) {
      reachable++;
      if (d > maxDistance) maxDistance = d;
    }
  }
  return { reachable, maxDistance };
}
