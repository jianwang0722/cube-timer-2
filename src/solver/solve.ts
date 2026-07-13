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
import { solveCross } from "./cross";
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
 * Build a human-style CFOP example solve for `scramble`. Pure and synchronous —
 * the cross search plus F2L/OLL/PLL work stays well under the 100 ms budget.
 */
export function solve(scramble: string): Solution {
  let state: Facelets = faceletsFromMoves(parseMoves(scramble));
  const stages: SolutionStage[] = [];
  const advance = (moves: readonly string[]) => {
    state = applyMoves(state, [...moves]);
  };

  const cross = solveCross(state);
  stages.push(makeStage("cross", "Cross (white)", cross.moves));
  advance(cross.moves);

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
