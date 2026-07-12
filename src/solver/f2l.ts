/**
 * Stage 5.3 — F2L (docs/solver-architecture.md).
 *
 * Each pair is solved at the FR slot after y-alignment. The case table is
 * generated at init: BFS over human trigger gadgets, every one of which
 * net-preserves everything outside the U layer + FR slot (proven in tests
 * along with full reachability of the ~150 pair states). Pieces buried in
 * other slots are first popped out with an aligned R U R', with a U-parking
 * rule so the pop can never bury the pair's other piece.
 */
import {
  applyMoves,
  invertMoves,
  isF2LPairSolved,
  netPreservesOutside,
  netToMap,
  parseMoves,
  type F2LSlot,
  type Facelets,
  U_LAYER_POSITIONS,
} from "./cube";
import { CORNER_FACELETS, EDGE_FACELETS, FACE } from "./tables/facelets";

export const F2L_GADGETS: readonly string[] = [
  "U",
  "U'",
  "U2",
  "R U R'",
  "R U' R'",
  "R U2 R'",
  "F' U F",
  "F' U' F",
  "F' U2 F",
  "R' F R F'",
  "F R' F' R",
];

// Corner/edge positions a pair may legally occupy while solving at FR.
const CORNER_SLOTS = ["URF", "UFL", "ULB", "UBR", "DFR"] as const;
const EDGE_SLOTS = ["UR", "UF", "UL", "UB", "FR"] as const;
const ALL_CORNERS = Object.keys(CORNER_FACELETS);
const ALL_EDGES = Object.keys(EDGE_FACELETS);

const N_STATES = CORNER_SLOTS.length * 3 * EDGE_SLOTS.length * 2; // 150
const SOLVED_STATE = encodeState(CORNER_SLOTS.indexOf("DFR"), 0, EDGE_SLOTS.indexOf("FR"), 0);

// Facelet positions allowed to change under a gadget: U layer + FR slot.
const MUTABLE = new Set<number>([
  ...U_LAYER_POSITIONS,
  ...CORNER_FACELETS.DFR,
  ...EDGE_FACELETS.FR,
]);

function encodeState(ci: number, co: number, ei: number, ef: number): number {
  return (ci * 3 + co) * (EDGE_SLOTS.length * 2) + (ei * 2 + ef);
}

/** A gadget's net effect must fix every facelet outside U layer + FR slot. */
export function gadgetPreserves(gadget: string): boolean {
  return netPreservesOutside(gadget, MUTABLE);
}

/** Where a corner at (slotName, ori) lands under a move sequence. */
function mapCorner(to: Uint8Array, slotName: string, ori: number): [string, number] {
  const positions = CORNER_FACELETS[slotName].map((p) => to[p]);
  for (const name of ALL_CORNERS) {
    const target = CORNER_FACELETS[name];
    const k0 = target.indexOf(positions[0]);
    if (k0 !== -1 && target[(k0 + 1) % 3] === positions[1]) {
      // Sticker previously at triple index `ori` is now at index (k0 + ori) % 3.
      return [name, (k0 + ori) % 3];
    }
  }
  throw new Error(`corner from ${slotName} lost`);
}

function mapEdge(to: Uint8Array, slotName: string, flip: number): [string, number] {
  const [p, q] = EDGE_FACELETS[slotName].map((pos) => to[pos]);
  for (const name of ALL_EDGES) {
    const [a, b] = EDGE_FACELETS[name];
    if (a === p && b === q) return [name, flip];
    if (a === q && b === p) return [name, flip ^ 1];
  }
  throw new Error(`edge from ${slotName} lost`);
}

interface F2LTables {
  next: Int16Array; // state -> gadget index (or -1)
  nextState: Int16Array;
  depth: Uint8Array;
}

let tables: F2LTables | null = null;

function buildTables(): F2LTables {
  // Transition maps for the INVERSE of each gadget, at piece level.
  const invCorner: number[][] = [];
  const invEdge: number[][] = [];
  for (const gadget of F2L_GADGETS) {
    if (!gadgetPreserves(gadget)) {
      throw new Error(`F2L gadget violates preservation: ${gadget}`);
    }
    const to = netToMap(invertMoves(gadget));

    const cMap = new Array<number>(CORNER_SLOTS.length * 3).fill(-1);
    for (let ci = 0; ci < CORNER_SLOTS.length; ci++) {
      for (let co = 0; co < 3; co++) {
        const [name, ori] = mapCorner(to, CORNER_SLOTS[ci], co);
        const target = CORNER_SLOTS.indexOf(name as (typeof CORNER_SLOTS)[number]);
        if (target !== -1) cMap[ci * 3 + co] = target * 3 + ori;
      }
    }
    const eMap = new Array<number>(EDGE_SLOTS.length * 2).fill(-1);
    for (let ei = 0; ei < EDGE_SLOTS.length; ei++) {
      for (let ef = 0; ef < 2; ef++) {
        const [name, flip] = mapEdge(to, EDGE_SLOTS[ei], ef);
        const target = EDGE_SLOTS.indexOf(name as (typeof EDGE_SLOTS)[number]);
        if (target !== -1) eMap[ei * 2 + ef] = target * 2 + flip;
      }
    }
    invCorner.push(cMap);
    invEdge.push(eMap);
  }

  const next = new Int16Array(N_STATES).fill(-1);
  const nextState = new Int16Array(N_STATES).fill(-1);
  const depth = new Uint8Array(N_STATES).fill(255);
  depth[SOLVED_STATE] = 0;
  let frontier = [SOLVED_STATE];
  while (frontier.length > 0) {
    const upcoming: number[] = [];
    for (const state of frontier) {
      const c = Math.floor(state / (EDGE_SLOTS.length * 2));
      const e = state % (EDGE_SLOTS.length * 2);
      for (let g = 0; g < F2L_GADGETS.length; g++) {
        const pc = invCorner[g][c];
        const pe = invEdge[g][e];
        if (pc === -1 || pe === -1) continue;
        const prev = pc * (EDGE_SLOTS.length * 2) + pe;
        if (depth[prev] === 255) {
          depth[prev] = depth[state] + 1;
          next[prev] = g;
          nextState[prev] = state;
          upcoming.push(prev);
        }
      }
    }
    frontier = upcoming;
  }
  return { next, nextState, depth };
}

// --- Runtime pair solving ---------------------------------------------------

function centerColor(f: Facelets, face: number): number {
  return f[face * 9 + 4];
}

function findCorner(f: Facelets, colors: readonly number[]): { name: string; whiteAt: number } {
  const want = [...colors].sort().join(",");
  for (const name of ALL_CORNERS) {
    const positions = CORNER_FACELETS[name];
    const got = positions.map((p) => f[p]);
    if ([...got].sort().join(",") === want) {
      return { name, whiteAt: got.indexOf(colors[0]) };
    }
  }
  throw new Error("pair corner not found");
}

function findEdge(f: Facelets, colors: readonly [number, number]): { name: string; flip: number } {
  for (const name of ALL_EDGES) {
    const [p, q] = EDGE_FACELETS[name];
    if (f[p] === colors[0] && f[q] === colors[1]) return { name, flip: 0 };
    if (f[p] === colors[1] && f[q] === colors[0]) return { name, flip: 1 };
  }
  throw new Error("pair edge not found");
}

const E_SLOT_FACES: Record<string, [number, number]> = {
  FR: [FACE.F, FACE.R],
  FL: [FACE.F, FACE.L],
  BL: [FACE.B, FACE.L],
  BR: [FACE.B, FACE.R],
};
// The D-layer corner belonging to each E-slot.
const SLOT_CORNER: Record<string, string> = {
  FR: "DFR",
  FL: "DLF",
  BL: "DBL",
  BR: "DRB",
};

interface PairContext {
  state: Facelets;
  moves: string[];
}

function emit(ctx: PairContext, moves: string | string[]): void {
  const list = typeof moves === "string" ? parseMoves(moves) : [...moves];
  ctx.moves.push(...list);
  ctx.state = applyMoves(ctx.state, list);
}

/** y-rotate until the E-slot between centers {a,b} sits at FR. */
function alignSlotToFR(ctx: PairContext, a: number, b: number): void {
  const rotations = ["", "y", "y2", "y'"];
  for (const rot of rotations) {
    const probe = rot === "" ? ctx.state : applyMoves(ctx.state, rot);
    const f = centerColor(probe, FACE.F);
    const r = centerColor(probe, FACE.R);
    if ((f === a && r === b) || (f === b && r === a)) {
      if (rot !== "") emit(ctx, rot);
      return;
    }
  }
  throw new Error("cannot align slot to FR");
}

/** Slot (by center colors) currently holding a piece position name, if any. */
function eSlotOf(edgeName: string): string | null {
  return edgeName in E_SLOT_FACES ? edgeName : null;
}

function dCornerSlot(cornerName: string): string | null {
  for (const [slot, corner] of Object.entries(SLOT_CORNER)) {
    if (corner === cornerName) return slot;
  }
  return null;
}

export interface F2LPair {
  moves: string[];
}

export interface F2LSolution {
  pairs: F2LPair[];
}

/** Solve all four F2L pairs; input must have the cross solved (post-z2). */
export function solveF2L(afterCross: Facelets): F2LSolution {
  tables ??= buildTables();
  const ctx: PairContext = { state: afterCross, moves: [] };
  const white = centerColor(ctx.state, FACE.D);

  // Pair identities by side colors, in FR FL BR BL order at the start.
  const pairColors = (["FR", "FL", "BR", "BL"] as const).map((slot) => {
    const [fa, fb] = E_SLOT_FACES[slot];
    return [centerColor(ctx.state, fa), centerColor(ctx.state, fb)] as [number, number];
  });

  const pairs: F2LPair[] = [];
  for (const [a, b] of pairColors) {
    const start = ctx.moves.length;
    solvePair(ctx, white, a, b);
    pairs.push({ moves: ctx.moves.slice(start) });
  }
  return { pairs };
}

function solvePair(ctx: PairContext, white: number, a: number, b: number): void {
  const cornerColors = [white, a, b] as const;

  // Already solved in place: don't emit alignment rotations for nothing.
  if (isF2LPairSolved(ctx.state, currentTargetSlot(ctx.state, a, b) as F2LSlot)) {
    return;
  }

  // Pop buried pieces (in wrong slots) up to a safety bound.
  for (let guard = 0; ; guard++) {
    if (guard > 4) throw new Error("F2L pop loop did not terminate");
    const corner = findCorner(ctx.state, cornerColors);
    const edge = findEdge(ctx.state, [a, b]);
    const cornerSlot = dCornerSlot(corner.name);
    const edgeSlot = eSlotOf(edge.name);
    const target = currentTargetSlot(ctx.state, a, b);

    const buriedSlot =
      cornerSlot !== null && cornerSlot !== target
        ? cornerSlot
        : edgeSlot !== null && edgeSlot !== target
          ? edgeSlot
          : null;
    if (buriedSlot === null) break;

    // Bring the buried piece's slot to FR, park the other pair piece so the
    // pop's insertions (old URF corner / old UB edge) can't bury it, then pop.
    const [sa, sb] = E_SLOT_FACES[buriedSlot].map((face) => centerColor(ctx.state, face));
    alignSlotToFR(ctx, sa, sb);
    for (let parks = 0; parks < 4; parks++) {
      const c = findCorner(ctx.state, cornerColors);
      const e = findEdge(ctx.state, [a, b]);
      if (c.name !== "URF" && e.name !== "UB") break;
      emit(ctx, "U");
    }
    emit(ctx, "R U R'");
  }

  // Align the pair's own slot to FR and walk the generated table.
  alignSlotToFR(ctx, a, b);
  const { next, nextState, depth } = tables!;
  let state = extractPairState(ctx.state, white, a, b);
  if (depth[state] === 255) throw new Error("F2L state not covered by gadget table");
  while (state !== SOLVED_STATE) {
    const g = next[state];
    emit(ctx, F2L_GADGETS[g]);
    state = nextState[state];
  }
}

function currentTargetSlot(f: Facelets, a: number, b: number): string {
  for (const [slot, [fa, fb]] of Object.entries(E_SLOT_FACES)) {
    const ca = centerColor(f, fa);
    const cb = centerColor(f, fb);
    if ((ca === a && cb === b) || (ca === b && cb === a)) return slot;
  }
  throw new Error("pair has no target slot");
}

function extractPairState(f: Facelets, white: number, a: number, b: number): number {
  const corner = findCorner(f, [white, a, b]);
  const edge = findEdge(f, [a, b]);
  const ci = CORNER_SLOTS.indexOf(corner.name as (typeof CORNER_SLOTS)[number]);
  const ei = EDGE_SLOTS.indexOf(edge.name as (typeof EDGE_SLOTS)[number]);
  if (ci === -1 || ei === -1) throw new Error("pair pieces still buried");

  // Corner orientation: triple index of the white sticker (0 = solved-side).
  // Edge flip 0: the slot's primary facelet shows the color that belongs on
  // F once solved — the same convention the table's transition tracking uses.
  const co = corner.whiteAt;
  const [p] = EDGE_FACELETS[edge.name];
  const ef = f[p] === f[FACE.F * 9 + 4] ? 0 : 1;
  return encodeState(ci, co, ei, ef);
}

/** Exposed for tests. */
export function f2lTableStats(): { reachable: number; maxDepth: number } {
  tables ??= buildTables();
  let reachable = 0;
  let maxDepth = 0;
  for (const d of tables.depth) {
    if (d !== 255) {
      reachable++;
      if (d > maxDepth) maxDepth = d;
    }
  }
  return { reachable, maxDepth };
}
