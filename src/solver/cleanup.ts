/**
 * Stage 5.7 — move cleanup.
 *
 * The CFOP stages are generated independently, so their seams leave turns a
 * human would never make: F2L finishing on R' while OLL's pre-AUF opens on R,
 * an OLL alg ending U' against a PLL pre-AUF of U. This pass merges adjacent
 * same-face turns across the whole solution, including across stage
 * boundaries, and drops rotations left dangling at the very end.
 *
 * Every merge is an identity on the cube, so cleanup can never change what a
 * solution does — only how many moves it takes to say it. Moves stay tagged
 * with their stage so the labelled stage list can be rebuilt afterwards.
 */
export interface TaggedMove {
  /** A single move in this solver's vocabulary, e.g. "R", "U2", "r'", "M". */
  move: string;
  /** Index of the SolutionStage this move came from. */
  stage: number;
}

const ROTATION = /^[xyz]/;

function parseMove(move: string): { base: string; amount: number } {
  if (move.endsWith("'")) return { base: move.slice(0, -1), amount: 3 };
  if (move.endsWith("2")) return { base: move.slice(0, -1), amount: 2 };
  return { base: move, amount: 1 };
}

/** Quarter turns mod 4 back to notation; null when the move vanishes. */
function formatMove(base: string, amount: number): string | null {
  switch (((amount % 4) + 4) % 4) {
    case 0:
      return null;
    case 1:
      return base;
    case 2:
      return `${base}2`;
    default:
      return `${base}'`;
  }
}

/**
 * Merge adjacent moves of the same base (`R R` → `R2`, `R R'` → nothing,
 * `R R2` → `R'`), to a fixpoint.
 *
 * Only exactly-adjacent, exactly-same-base moves merge. Turns are never slid
 * past each other, commuting faces (`R`/`L`) are left alone, and a face is
 * never merged with its wide form (`R`/`r`) — those move different pieces.
 *
 * A survivor inherits the *earlier* move's stage, which is how a human
 * reconstruction attributes a cancellation: the move belongs to the step that
 * started it.
 *
 * `protectPrefix` moves at the front are immovable. The pipeline passes 1 to
 * pin the leading `z2` orientation convention, without which an empty solve
 * cleans away to nothing.
 */
export function cancelMoves(
  moves: readonly TaggedMove[],
  protectPrefix = 0,
): TaggedMove[] {
  const out: TaggedMove[] = [];
  for (const entry of moves) {
    let pending: TaggedMove | null = entry;
    while (pending !== null && out.length > protectPrefix) {
      const top = out[out.length - 1];
      const a = parseMove(top.move);
      const b = parseMove(pending.move);
      if (a.base !== b.base) break;
      out.pop();
      const merged = formatMove(a.base, a.amount + b.amount);
      // Re-enter the loop: one cancellation can expose the next, which is
      // what makes this a fixpoint (R U U' R' collapses to nothing).
      pending = merged === null ? null : { move: merged, stage: top.stage };
    }
    if (pending !== null) out.push(pending);
  }
  return out;
}

/**
 * Drop whole-cube rotations left at the very end of a solution. Safe because
 * "solved" is orientation-invariant for both the KPuzzle referee
 * (`ignorePuzzleOrientation`) and the solver's own `isSolved` — a rotation
 * with no turn after it changes nothing but where the cube is pointing.
 */
export function stripTrailingRotations(
  moves: readonly TaggedMove[],
  protectPrefix = 0,
): TaggedMove[] {
  let end = moves.length;
  while (end > protectPrefix && ROTATION.test(moves[end - 1].move)) end--;
  return moves.slice(0, end);
}

/** Cancel, then strip. Order matters: cancelling can expose a trailing rotation. */
export function tidyMoves(
  moves: readonly TaggedMove[],
  protectPrefix = 0,
): TaggedMove[] {
  return stripTrailingRotations(cancelMoves(moves, protectPrefix), protectPrefix);
}
