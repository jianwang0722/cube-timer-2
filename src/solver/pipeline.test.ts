// @vitest-environment node
/**
 * Phase 5.5 acceptance: the full cross → F2L → OLL → PLL chain, composed here
 * in the test (the shipping pipeline module is stage 5.6), run against 500
 * real random-state scrambles and refereed by the 5.0 KPuzzle harness.
 */
import { expect, test } from "vitest";
import { nextScramble } from "../scramble";
import { solveCross } from "./cross";
import { applyMoves, faceletsFromMoves, isSolved, parseMoves } from "./cube";
import { solveF2L } from "./f2l";
import { solveOLL } from "./oll";
import { solvePLL } from "./pll";
import { assertSolves } from "./verify";

function solveCFOP(scramble: string): { moves: string[]; oll: number; pll: string | null } {
  let state = faceletsFromMoves(parseMoves(scramble));
  const moves: string[] = [];
  const push = (m: string[]) => {
    moves.push(...m);
    state = applyMoves(state, m);
  };
  push(solveCross(state).moves);
  for (const pair of solveF2L(state).pairs) push(pair.moves);
  const oll = solveOLL(state);
  push(oll.moves);
  const pll = solvePLL(state);
  push(pll.moves);
  if (!isSolved(state)) throw new Error(`chain left cube unsolved for: ${scramble}`);
  return { moves, oll: oll.caseId, pll: pll.caseName };
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
      const scramble = (await nextScramble()).toString();
      const t0 = performance.now();
      const { moves, oll, pll } = solveCFOP(scramble);
      times.push(performance.now() - t0);
      moveCounts.push(moves.filter((m) => !/^[xyz]/.test(m)).length);
      ollSeen.add(oll);
      if (pll !== null) pllSeen.add(pll);
      await assertSolves(scramble, moves.join(" "));
    }

    times.sort((a, b) => a - b);
    const median = times[Math.floor(times.length / 2)];
    const meanMoves = moveCounts.reduce((a, b) => a + b, 0) / moveCounts.length;
    console.info(
      `[pipeline] 500 solves · median ${median.toFixed(2)}ms · mean ${meanMoves.toFixed(1)} STM · ` +
        `OLL cases seen ${ollSeen.size}/57 · PLL cases seen ${pllSeen.size}/21`,
    );
    expect(median).toBeLessThan(100);
  },
);
