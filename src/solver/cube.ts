/**
 * Solver-internal facelet cube model (stage 5.1, docs/solver-architecture.md).
 *
 * A cube state is a Uint8Array(54) of color ids (0-5 = solved face U R F D L B);
 * moves are precomputed facelet permutations. Only the generators U, x, y are
 * written by hand; every other move is derived by composition and the whole
 * table is cross-validated against cubing.js's KPuzzle in cube.test.ts.
 */
import { CORNER_FACELETS, EDGE_FACELETS, FACE } from "./tables/facelets";

export type Facelets = Uint8Array;
export type Perm = Uint8Array; // result[i] = source[perm[i]]

export const SOLVED: Facelets = Uint8Array.from({ length: 54 }, (_, i) =>
  Math.floor(i / 9),
);

function identity(): Perm {
  return Uint8Array.from({ length: 54 }, (_, i) => i);
}

/** Build a permutation from "sticker at `from` moves to `to`" pairs. */
function permFromMoves(pairs: [number, number][]): Perm {
  const perm = identity();
  for (const [from, to] of pairs) perm[to] = from;
  return perm;
}

/** Apply `a` then `b` as a single permutation. */
function compose(a: Perm, b: Perm): Perm {
  const out = new Uint8Array(54);
  for (let i = 0; i < 54; i++) out[i] = a[b[i]];
  return out;
}

function inverse(a: Perm): Perm {
  const out = new Uint8Array(54);
  for (let i = 0; i < 54; i++) out[a[i]] = i;
  return out;
}

/** Clockwise rotation of a face's own 9 stickers. */
function ownFaceCw(base: number): [number, number][] {
  return [
    [base + 0, base + 2],
    [base + 2, base + 8],
    [base + 8, base + 6],
    [base + 6, base + 0],
    [base + 1, base + 5],
    [base + 5, base + 7],
    [base + 7, base + 3],
    [base + 3, base + 1],
  ];
}

function ownFaceCcw(base: number): [number, number][] {
  return ownFaceCw(base).map(([from, to]) => [to, from]);
}

function rowMap(fromBase: number, toBase: number, mirror = false): [number, number][] {
  return Array.from({ length: 9 }, (_, i): [number, number] => [
    fromBase + i,
    toBase + (mirror ? 8 - i : i),
  ]);
}

// --- Hand-written generators ---------------------------------------------

// U: own face cw; side top rows cycle F -> L -> B -> R -> F.
const U_PERM = permFromMoves([
  ...ownFaceCw(0),
  [18, 36],
  [19, 37],
  [20, 38],
  [36, 45],
  [37, 46],
  [38, 47],
  [45, 9],
  [46, 10],
  [47, 11],
  [9, 18],
  [10, 19],
  [11, 20],
]);

// x (whole cube, R direction): F->U, U->B (mirrored), B->D (mirrored), D->F;
// R spins cw, L ccw.
const X_PERM = permFromMoves([
  ...rowMap(18, 0),
  ...rowMap(0, 45, true),
  ...rowMap(45, 27, true),
  ...rowMap(27, 18),
  ...ownFaceCw(9),
  ...ownFaceCcw(36),
]);

// y (whole cube, U direction): side faces cycle F -> L -> B -> R -> F with
// indices preserved; U spins cw, D ccw.
const Y_PERM = permFromMoves([
  ...rowMap(18, 36),
  ...rowMap(36, 45),
  ...rowMap(45, 9),
  ...rowMap(9, 18),
  ...ownFaceCw(0),
  ...ownFaceCcw(27),
]);

// --- Derived moves --------------------------------------------------------

function seq(...perms: Perm[]): Perm {
  return perms.reduce(compose);
}

function buildMoveTable(): Map<string, Perm> {
  const x = X_PERM;
  const y = Y_PERM;
  const xp = inverse(x);
  const yp = inverse(y);
  const x2 = compose(x, x);

  const base: Record<string, Perm> = {
    U: U_PERM,
    x,
    y,
    F: seq(x, U_PERM, xp),
    B: seq(xp, U_PERM, x),
    D: seq(x2, U_PERM, x2),
    z: seq(x, y, xp),
  };
  base.R = seq(y, base.F, yp);
  base.L = seq(yp, base.F, y);

  const table = new Map<string, Perm>();
  for (const [name, perm] of Object.entries(base)) {
    table.set(name, perm);
    table.set(`${name}2`, compose(perm, perm));
    table.set(`${name}'`, inverse(perm));
  }
  return table;
}

const MOVE_TABLE = buildMoveTable();

/** All 27 supported move names (U D L R F B x y z × {1, ', 2}). */
export const MOVE_NAMES: readonly string[] = [...MOVE_TABLE.keys()];

/** The 18 face moves (search vocabulary — no rotations). */
export const FACE_MOVES: readonly string[] = MOVE_NAMES.filter(
  (m) => !/^[xyz]/.test(m),
);

export function permFor(move: string): Perm {
  const perm = MOVE_TABLE.get(move);
  if (!perm) throw new Error(`Unknown move: ${move}`);
  return perm;
}

export function applyPerm(f: Facelets, perm: Perm, out?: Uint8Array): Facelets {
  const dst = out ?? new Uint8Array(54);
  for (let i = 0; i < 54; i++) dst[i] = f[perm[i]];
  return dst;
}

export function parseMoves(moves: string): string[] {
  return moves.trim().split(/\s+/).filter(Boolean);
}

export function applyMoves(f: Facelets, moves: string | readonly string[]): Facelets {
  const list = typeof moves === "string" ? parseMoves(moves) : moves;
  let state = f;
  for (const move of list) state = applyPerm(state, permFor(move));
  return state;
}

export function faceletsFromMoves(moves: string | readonly string[]): Facelets {
  return applyMoves(SOLVED, moves);
}

export function invertMoves(moves: string | readonly string[]): string[] {
  const list = typeof moves === "string" ? parseMoves(moves) : [...moves];
  return list
    .reverse()
    .map((m) => (m.endsWith("'") ? m.slice(0, -1) : m.endsWith("2") ? m : `${m}'`));
}

/** Net destination map of a move sequence: to[src] = dst. */
export function netToMap(moves: string | readonly string[]): Uint8Array {
  const list = typeof moves === "string" ? parseMoves(moves) : moves;
  let perm: Perm | null = null;
  for (const move of list) {
    const p = permFor(move);
    if (perm === null) {
      perm = Uint8Array.from(p);
    } else {
      const next = new Uint8Array(54);
      for (let i = 0; i < 54; i++) next[i] = perm[p[i]];
      perm = next;
    }
  }
  const to = new Uint8Array(54);
  for (let dst = 0; dst < 54; dst++) to[perm ? perm[dst] : dst] = dst;
  return to;
}

/** True when the sequence's net effect fixes every facelet outside `mutable`. */
export function netPreservesOutside(
  moves: string | readonly string[],
  mutable: ReadonlySet<number>,
): boolean {
  const to = netToMap(moves);
  for (let p = 0; p < 54; p++) {
    if (!mutable.has(p) && to[p] !== p) return false;
  }
  return true;
}

/** Facelet positions of the U layer (U face + the four top side rows). */
export const U_LAYER_POSITIONS: ReadonlySet<number> = new Set([
  ...Array.from({ length: 9 }, (_, i) => i),
  9, 10, 11,
  18, 19, 20,
  36, 37, 38,
  45, 46, 47,
]);

// --- Stage invariants (center-relative, so rotations never confuse them) ---

const SIDE_FACES = [FACE.R, FACE.F, FACE.L, FACE.B] as const;
const E_SLOTS = ["FR", "FL", "BL", "BR"] as const;
export type F2LSlot = (typeof E_SLOTS)[number];
export const F2L_SLOTS = E_SLOTS;

function center(f: Facelets, face: number): number {
  return f[face * 9 + 4];
}

/** The four cross edges sit on D with side stickers matching their centers. */
export function isCrossSolved(f: Facelets): boolean {
  const d = center(f, FACE.D);
  for (const slot of ["DR", "DF", "DL", "DB"] as const) {
    const [primary, side] = EDGE_FACELETS[slot];
    if (f[primary] !== d) return false;
    if (f[side] !== f[Math.floor(side / 9) * 9 + 4]) return false;
  }
  return true;
}

const SLOT_PIECES: Record<F2LSlot, { corner: keyof typeof CORNER_FACELETS }> = {
  FR: { corner: "DFR" },
  FL: { corner: "DLF" },
  BL: { corner: "DBL" },
  BR: { corner: "DRB" },
};

export function isF2LPairSolved(f: Facelets, slot: F2LSlot): boolean {
  for (const pos of CORNER_FACELETS[SLOT_PIECES[slot].corner]) {
    if (f[pos] !== f[Math.floor(pos / 9) * 9 + 4]) return false;
  }
  for (const pos of EDGE_FACELETS[slot]) {
    if (f[pos] !== f[Math.floor(pos / 9) * 9 + 4]) return false;
  }
  return true;
}

export function isF2LSolved(f: Facelets): boolean {
  if (!isCrossSolved(f)) return false;
  return F2L_SLOTS.every((slot) => isF2LPairSolved(f, slot));
}

/** Last layer oriented: the whole U face shows the U-center color. */
export function isLLOriented(f: Facelets): boolean {
  const u = center(f, FACE.U);
  for (let i = 0; i < 9; i++) if (f[i] !== u) return false;
  return true;
}

/** Fully solved up to whole-cube orientation: every face uniform. */
export function isSolved(f: Facelets): boolean {
  for (let face = 0; face < 6; face++) {
    const c = center(f, face);
    for (let i = 0; i < 9; i++) if (f[face * 9 + i] !== c) return false;
  }
  return true;
}

// Referenced by invariant docs; exported for stage modules' recognition code.
export { SIDE_FACES };
