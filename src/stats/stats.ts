import {
  effectiveMs,
  meanOf3,
  trimmedAverage,
  type StatResult,
  type StatSolve,
} from "./average";

export type StatKey = "single" | "mo3" | "ao5" | "ao12" | "ao100";

export interface StatPair {
  current: StatResult;
  best: StatResult;
}

export interface SessionStats {
  count: number;
  worstSingle: StatResult;
  single: StatPair;
  mo3: StatPair;
  ao5: StatPair;
  ao12: StatPair;
  ao100: StatPair;
}

export type PbFlags = Record<StatKey, boolean>;

function isBetter(candidate: StatResult, incumbent: StatResult): boolean {
  if (typeof candidate !== "number") return false;
  return typeof incumbent !== "number" || candidate < incumbent;
}

/** Best numeric result over every window of size n; DNF only if no numeric window. */
function bestWindow(
  solves: readonly StatSolve[],
  n: number,
  compute: (window: readonly StatSolve[]) => StatResult,
): StatResult {
  if (solves.length < n) return null;
  let best: StatResult = "DNF";
  for (let end = n; end <= solves.length; end++) {
    const result = compute(solves.slice(end - n, end));
    if (isBetter(result, best)) best = result;
  }
  return best;
}

function singles(solves: readonly StatSolve[]): (number | "DNF")[] {
  return solves.map(effectiveMs);
}

export function computeStats(solves: readonly StatSolve[]): SessionStats {
  const times = singles(solves);
  const numeric = times.filter((t): t is number => t !== "DNF");

  const single: StatPair = {
    current: times.at(-1) ?? null,
    best:
      solves.length === 0 ? null : numeric.length === 0 ? "DNF" : Math.min(...numeric),
  };
  const worstSingle: StatResult =
    solves.length === 0 ? null : numeric.length === 0 ? "DNF" : Math.max(...numeric);

  const pair = (
    n: number,
    compute: (window: readonly StatSolve[]) => StatResult,
  ): StatPair => ({
    current: compute(solves),
    best: bestWindow(solves, n, compute),
  });

  return {
    count: solves.length,
    worstSingle,
    single,
    mo3: pair(3, (w) => meanOf3(w.slice(-3))),
    ao5: pair(5, (w) => trimmedAverage(w, 5)),
    ao12: pair(12, (w) => trimmedAverage(w, 12)),
    ao100: pair(100, (w) => trimmedAverage(w, 100)),
  };
}

/**
 * Which stats did the most recent solve turn into new personal bests?
 * A PB requires a numeric current value strictly better than the best over
 * all windows not including the latest solve.
 */
export function computePbFlags(solves: readonly StatSolve[]): PbFlags {
  const none: PbFlags = { single: false, mo3: false, ao5: false, ao12: false, ao100: false };
  if (solves.length === 0) return none;
  const now = computeStats(solves);
  const before = computeStats(solves.slice(0, -1));
  const flags = { ...none };
  for (const key of ["single", "mo3", "ao5", "ao12", "ao100"] as const) {
    flags[key] = isBetter(now[key].current, before[key].best);
  }
  return flags;
}
