import { useCallback, useEffect, useState } from "react";
import type { Alg } from "cubing/alg";
import { solveVerified, type Solution, type SolveResult } from "./solve";

export type SolutionStatus = "idle" | "loading" | "ready" | "error";

export interface UseSolutionResult {
  status: SolutionStatus;
  solution: Solution | null;
  reason: string | null;
  /** Compute + verify the example solve for the current scramble (on demand). */
  reveal: () => void;
}

/**
 * On-demand CFOP example solve for `scramble`. The solve stays hidden until
 * {@link UseSolutionResult.reveal} is called (spoiler-safe), and a new scramble
 * re-hides it. Only a solution the 5.0 harness verifies is ever exposed;
 * otherwise the status is `"error"`.
 */
export function useSolution(scramble: Alg | null): UseSolutionResult {
  const scrambleStr = scramble?.toString() ?? null;
  const [requestedFor, setRequestedFor] = useState<string | null>(null);
  const [result, setResult] = useState<{
    scramble: string;
    value: SolveResult;
  } | null>(null);

  // A reveal only counts for the scramble it was requested on, so advancing to
  // a new scramble drops back to idle (status is derived, not stored).
  const active = requestedFor !== null && requestedFor === scrambleStr;
  const ready = active && result !== null && result.scramble === scrambleStr;

  useEffect(() => {
    if (!active || scrambleStr === null || ready) return;
    let cancelled = false;
    void solveVerified(scrambleStr).then((value) => {
      if (!cancelled) setResult({ scramble: scrambleStr, value });
    });
    return () => {
      cancelled = true;
    };
  }, [active, scrambleStr, ready]);

  const reveal = useCallback(() => setRequestedFor(scrambleStr), [scrambleStr]);

  if (!active) return { status: "idle", solution: null, reason: null, reveal };
  if (!ready) return { status: "loading", solution: null, reason: null, reveal };
  return result!.value.ok
    ? { status: "ready", solution: result!.value.solution, reason: null, reveal }
    : { status: "error", solution: null, reason: result!.value.reason, reveal };
}
