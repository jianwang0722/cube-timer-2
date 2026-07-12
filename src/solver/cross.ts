/**
 * Stage 5.2 — optimal white cross (docs/solver-architecture.md).
 *
 * Solutions start with z2 (white cross on the bottom, human-style); the
 * remaining moves are found by walking an exact BFS distance table over the
 * 4 white edges' (slot, flip) coordinate — 12^4 x 2^4 indices of which
 * 12·11·10·9 · 16 = 190,080 are reachable. Cross God's number is 8, so the
 * result is always optimal and ≤ 8 face moves after the z2.
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

export function solveCross(scrambled: Facelets): CrossSolution {
  tables ??= buildTables();
  const { slotMap, flipMap, dist } = tables;

  let state = applyMoves(scrambled, "z2");
  const moves: string[] = ["z2"];
  let index = extract(state);
  if (dist[index] === 255) {
    throw new Error("Cross state unreachable — corrupt cube state");
  }
  while (dist[index] > 0) {
    const d = dist[index];
    let advanced = false;
    for (let m = 0; m < FACE_MOVES.length; m++) {
      const { slots, flips } = decode(index);
      const ns = slots.map((s) => slotMap[m][s]);
      const nf = flips.map((fl, e) => fl ^ flipMap[m][slots[e]]);
      const ni = encode(ns, nf);
      if (dist[ni] === d - 1) {
        moves.push(FACE_MOVES[m]);
        state = applyMoves(state, FACE_MOVES[m]);
        index = ni;
        advanced = true;
        break;
      }
    }
    if (!advanced) throw new Error("Cross walk stuck — distance table corrupt");
  }
  return { moves };
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
