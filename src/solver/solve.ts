/**
 * Stage 5.6 — the shipping CFOP pipeline. Composes the verified cross → F2L →
 * OLL → PLL stages (5.2–5.5) into a single annotated {@link Solution} and
 * carries the runtime guard: {@link solveVerified} refuses to hand back a
 * solution the 5.0 KPuzzle harness can't confirm.
 *
 * The move sequence here is exactly the one exercised by the 500-scramble
 * acceptance corpus (`pipeline.test.ts`); this module is what the test now
 * drives, so shipping code and the property test never diverge.
 */
import { optimalCrossSolutions } from "./cross";
import { applyMoves, faceletsFromMoves, parseMoves, type Facelets } from "./cube";
import { solveF2L } from "./f2l";
import { solveOLL } from "./oll";
import { solvePLL } from "./pll";
import { verifySolution } from "./verify";

export interface SolutionStage {
  name: "cross" | "f2l-1" | "f2l-2" | "f2l-3" | "f2l-4" | "oll" | "pll";
  /** STM, space-separated; may start with a rotation (cross opens with z2). */
  moves: string;
  /** Human label, e.g. "Cross (white)", "F2L pair 3", "OLL 27", "T-perm". */
  annotation: string;
  /** Turn count for this stage, rotations (x/y/z) excluded. */
  moveCount: number;
}

export interface Solution {
  stages: SolutionStage[];
  /** STM across all stages (rotations excluded), matching real CFOP counting. */
  totalMoves: number;
}

const ROTATION = /^[xyz]/;

/** STM count: whole-cube rotations don't count as turns. */
function countTurns(moves: readonly string[]): number {
  return moves.filter((m) => !ROTATION.test(m)).length;
}

function makeStage(
  name: SolutionStage["name"],
  annotation: string,
  moves: readonly string[],
): SolutionStage {
  return { name, annotation, moves: moves.join(" "), moveCount: countTurns(moves) };
}

/**
 * The exact string handed to the verifier / twisty-player. Per the architecture
 * doc this is `stages.map(s => s.moves).join(" ")`; empty (skipped) stages are
 * dropped so the alg text stays clean.
 */
export function solutionAlg(solution: Solution): string {
  return solution.stages
    .map((s) => s.moves)
    .filter((m) => m.length > 0)
    .join(" ");
}

/**
 * How many optimal crosses to try before committing (5.7). Every candidate
 * costs a full F2L/OLL/PLL pass, which is tens of microseconds; 32 keeps the
 * median solve near 1 ms against a 100 ms budget.
 */
const CROSS_CANDIDATES = 32;

/** Rotations aren't turns, but fewer of them reads better — used only to break ties. */
function countRotations(stages: readonly SolutionStage[]): number {
  return stages.reduce(
    (n, s) => n + s.moves.split(" ").filter((m) => m && ROTATION.test(m)).length,
    0,
  );
}

/** Everything after the cross, for one candidate cross. */
function solveFromCross(scrambled: Facelets, crossMoves: readonly string[]): Solution {
  const stages: SolutionStage[] = [makeStage("cross", "Cross (white)", crossMoves)];
  let state = applyMoves(scrambled, [...crossMoves]);
  const advance = (moves: readonly string[]) => {
    state = applyMoves(state, [...moves]);
  };

  solveF2L(state).pairs.forEach((pair, i) => {
    const name = `f2l-${i + 1}` as SolutionStage["name"];
    stages.push(makeStage(name, `F2L pair ${i + 1}`, pair.moves));
    advance(pair.moves);
  });

  const oll = solveOLL(state);
  stages.push(
    makeStage("oll", oll.caseId === 0 ? "OLL skip" : `OLL ${oll.caseId}`, oll.moves),
  );
  advance(oll.moves);

  const pll = solvePLL(state);
  stages.push(
    makeStage("pll", pll.caseName ? `${pll.caseName}-perm` : "PLL skip", pll.moves),
  );

  const totalMoves = stages.reduce((sum, s) => sum + s.moveCount, 0);
  return { stages, totalMoves };
}

/**
 * Build a human-style CFOP example solve for `scramble`. Pure and synchronous —
 * the cross search plus F2L/OLL/PLL work stays well under the 100 ms budget.
 *
 * The cross is always optimal, but which optimal cross you pick decides where
 * the other 16 pieces land, so 5.7 solves the cube once per candidate cross
 * and keeps the shortest result.
 */
export function solve(scramble: string): Solution {
  const scrambled: Facelets = faceletsFromMoves(parseMoves(scramble));

  let best: Solution | null = null;
  let bestRotations = Infinity;
  for (const crossMoves of optimalCrossSolutions(scrambled, CROSS_CANDIDATES)) {
    const candidate = solveFromCross(scrambled, crossMoves);
    const rotations = countRotations(candidate.stages);
    // Fewest turns wins; fewer rotations breaks the tie; first-generated
    // breaks that, keeping solve() deterministic.
    if (
      best === null ||
      candidate.totalMoves < best.totalMoves ||
      (candidate.totalMoves === best.totalMoves && rotations < bestRotations)
    ) {
      best = candidate;
      bestRotations = rotations;
    }
  }
  return best!;
}

export type SolveResult =
  | { ok: true; solution: Solution }
  | { ok: false; reason: string };

/**
 * Runtime guard (5.0 contract): produce the solve, then referee it with the
 * KPuzzle harness. A solution that doesn't verify is returned as `ok: false` so
 * the UI can show an error instead of a wrong example solve.
 */
export async function solveVerified(scramble: string): Promise<SolveResult> {
  let solution: Solution;
  try {
    solution = solve(scramble);
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
  const result = await verifySolution(scramble, solutionAlg(solution));
  return result.solved ? { ok: true, solution } : { ok: false, reason: result.reason };
}
