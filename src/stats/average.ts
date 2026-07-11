import { formatTimeMs } from "../timer";
import type { Penalty } from "../timer";

/** The inputs the stat math needs from a solve. */
export interface StatSolve {
  timeMs: number;
  penalty: Penalty;
}

/** A computed statistic: milliseconds, DNF, or null when not enough solves. */
export type StatResult = number | "DNF" | null;

/** Effective time per WCA rules: +2 adds 2000 ms before any average math. */
export function effectiveMs(solve: StatSolve): number | "DNF" {
  if (solve.penalty === "DNF") return "DNF";
  if (solve.penalty === "+2") return solve.timeMs + 2000;
  return solve.timeMs;
}

/** Averages are rounded (not truncated) to the centisecond per WCA regs. */
function roundToCentisecond(ms: number): number {
  return Math.round(ms / 10) * 10;
}

/** Plain mean of exactly 3 solves; any DNF makes the mean DNF. */
export function meanOf3(solves: readonly StatSolve[]): StatResult {
  if (solves.length < 3) return null;
  const window = solves.slice(-3);
  let sum = 0;
  for (const solve of window) {
    const ms = effectiveMs(solve);
    if (ms === "DNF") return "DNF";
    sum += ms;
  }
  return roundToCentisecond(sum / 3);
}

/**
 * WCA trimmed mean over the last `n` solves (ao5/ao12/ao100): drop the single
 * best and single worst, average the rest. A DNF counts as the worst; two or
 * more DNFs make the average DNF.
 */
export function trimmedAverage(
  solves: readonly StatSolve[],
  n: number,
): StatResult {
  if (solves.length < n) return null;
  const window = solves.slice(-n);

  let dnfCount = 0;
  let sum = 0;
  let best = Infinity;
  let worst = -Infinity;
  for (const solve of window) {
    const ms = effectiveMs(solve);
    if (ms === "DNF") {
      dnfCount++;
      continue;
    }
    sum += ms;
    if (ms < best) best = ms;
    if (ms > worst) worst = ms;
  }
  if (dnfCount >= 2) return "DNF";

  // Drop the single best; drop the single worst (a DNF, if present, is the worst).
  sum -= best;
  if (dnfCount === 0) sum -= worst;
  return roundToCentisecond(sum / (n - 2));
}

/** Human display for a stat: time, "DNF", or an em dash when unavailable. */
export function formatStat(result: StatResult): string {
  if (result === null) return "—";
  if (result === "DNF") return "DNF";
  return formatTimeMs(result);
}
