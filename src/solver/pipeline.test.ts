// @vitest-environment node
/**
 * Phase 5.6 acceptance: the shipping `solve()` pipeline (cross → F2L → OLL →
 * PLL) run against 500 real random-state scrambles and refereed by the 5.0
 * KPuzzle harness. This drives the same module the UI ships, so the property
 * corpus and production code can never drift apart.
 */
import { expect, test } from "vitest";
import { nextScramble } from "../scramble";
import { solutionAlg, solve } from "./solve";
import { assertSolves } from "./verify";

/** Recover the OLL number / PLL name from the stage annotations. */
function casesOf(solution: ReturnType<typeof solve>): {
  oll: number;
  pll: string | null;
} {
  // A stage whose moves cancelled away entirely is tagged "(cancelled)"; the
  // case was still recognized, so it still counts for coverage.
  const strip = (a: string) => a.replace(/ \(cancelled\)$/, "");
  const oll = strip(solution.stages.find((s) => s.name === "oll")!.annotation);
  const pll = strip(solution.stages.find((s) => s.name === "pll")!.annotation);
  const ollNum = /^OLL (\d+)$/.exec(oll);
  const pllName = /^(.+)-perm$/.exec(pll);
  return {
    oll: ollNum ? Number(ollNum[1]) : 0,
    pll: pllName ? pllName[1] : null,
  };
}

test(
  "property: 500 random scrambles solve, verified by the KPuzzle harness, median < 100ms",
  { timeout: 300_000 },
  async () => {
    const times: number[] = [];
    const moveCounts: number[] = [];
    const ollSeen = new Set<number>();
    const pllSeen = new Set<string>();

    for (let i = 0; i < 500; i++) {
      const scramble = (await nextScramble("333")).toString();
      const t0 = performance.now();
      const solution = solve(scramble);
      times.push(performance.now() - t0);
      moveCounts.push(solution.totalMoves);
      const { oll, pll } = casesOf(solution);
      ollSeen.add(oll);
      if (pll !== null) pllSeen.add(pll);
      await assertSolves(scramble, solutionAlg(solution));
    }

    times.sort((a, b) => a - b);
    const median = times[Math.floor(times.length / 2)];
    const meanMoves = moveCounts.reduce((a, b) => a + b, 0) / moveCounts.length;
    console.info(
      `[pipeline] 500 solves · median ${median.toFixed(2)}ms · mean ${meanMoves.toFixed(1)} STM · ` +
        `OLL cases seen ${ollSeen.size}/57 · PLL cases seen ${pllSeen.size}/21`,
    );
    expect(median).toBeLessThan(100);

    // 5.7 acceptance: solutions should read like a good human's CFOP solve —
    // the 55-70 STM band in docs/plan.md. Bounded on BOTH sides on purpose.
    // The upper bound catches a quality regression; the lower one catches
    // "improvements" that search their way out of the bottom of the band and
    // stop looking human. Measured 56.0 with 500 samples (standard error
    // ~0.4 STM), so these bounds are ~10 sigma out and won't flake.
    expect(meanMoves).toBeGreaterThan(52);
    expect(meanMoves).toBeLessThan(60);
  },
);
