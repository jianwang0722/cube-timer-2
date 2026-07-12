import { Alg } from "cubing/alg";
import type { KPuzzle } from "cubing/kpuzzle";

/**
 * Verification harness (Phase 5.0) — the referee for all solver output.
 *
 * Applies scramble + candidate solution to a cubing.js KPuzzle (deliberately
 * NOT the solver's own facelet model, so the two implementations cross-check
 * each other; see docs/solver-architecture.md) and reports whether the cube
 * ends solved. "Solved" is orientation-invariant: CFOP solutions contain
 * x/y/z rotations and may finish in any whole-cube orientation.
 *
 * Contract: no solver-generated solution may be shown to the user without a
 * passing verifySolution() (the Phase 5.6 runtime guard).
 */
export type VerifyResult = { solved: true } | { solved: false; reason: string };

let kpuzzlePromise: Promise<KPuzzle> | null = null;

async function kpuzzle(): Promise<KPuzzle> {
  kpuzzlePromise ??= import("cubing/puzzles").then((m) => m.puzzles["3x3x3"].kpuzzle());
  return kpuzzlePromise;
}

function parse(alg: Alg | string, label: string): Alg | { reason: string } {
  if (typeof alg !== "string") return alg;
  try {
    return Alg.fromString(alg);
  } catch (err) {
    return { reason: `${label} does not parse: ${err instanceof Error ? err.message : err}` };
  }
}

export async function verifySolution(
  scramble: Alg | string,
  solution: Alg | string,
): Promise<VerifyResult> {
  const scrambleAlg = parse(scramble, "scramble");
  if (!(scrambleAlg instanceof Alg)) return { solved: false, ...scrambleAlg };
  const solutionAlg = parse(solution, "solution");
  if (!(solutionAlg instanceof Alg)) return { solved: false, ...solutionAlg };

  let pattern;
  try {
    const kp = await kpuzzle();
    pattern = kp.defaultPattern().applyAlg(scrambleAlg).applyAlg(solutionAlg);
  } catch (err) {
    return {
      solved: false,
      reason: `could not apply algs: ${err instanceof Error ? err.message : err}`,
    };
  }

  const solved = pattern.experimentalIsSolved({
    ignorePuzzleOrientation: true,
    ignoreCenterOrientation: true,
  });
  return solved
    ? { solved: true }
    : { solved: false, reason: "end state is not solved (up to orientation)" };
}

/** Test-ergonomic form: rejects with scramble/solution/reason on failure. */
export async function assertSolves(
  scramble: Alg | string,
  solution: Alg | string,
): Promise<void> {
  const result = await verifySolution(scramble, solution);
  if (!result.solved) {
    throw new Error(
      `Solution failed verification: ${result.reason}\n  scramble: ${scramble}\n  solution: ${solution}`,
    );
  }
}
