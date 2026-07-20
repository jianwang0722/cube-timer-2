// @vitest-environment node
import { Alg } from "cubing/alg";
import { expect, test } from "vitest";
import { nextScramble } from "../scramble";
import { assertSolves, verifySolution } from "./verify";

const TIMEOUT = 120_000;

test("a scramble followed by its inverse verifies as solved", async () => {
  const scramble = new Alg("R U R' U' F2 D B L' D2");
  expect(await verifySolution(scramble, scramble.invert())).toEqual({ solved: true });
});

test("empty scramble and empty solution is solved", async () => {
  expect(await verifySolution("", "")).toEqual({ solved: true });
});

test("trailing whole-cube rotations still count as solved", async () => {
  const scramble = new Alg("L2 F D' R B2 U'");
  const solution = `${scramble.invert().toString()} y x'`;
  expect(await verifySolution(scramble, solution)).toEqual({ solved: true });
});

test("an off-by-AUF solution is not solved", async () => {
  const scramble = new Alg("L2 F D' R B2 U'");
  const solution = `${scramble.invert().toString()} U`;
  const result = await verifySolution(scramble, solution);
  expect(result.solved).toBe(false);
});

test("a wrong solution reports unsolved with a reason, without throwing", async () => {
  const result = await verifySolution("R U R' U'", "F B L");
  expect(result).toEqual({
    solved: false,
    reason: "end state is not solved (up to orientation)",
  });
});

test("invalid notation is reported with a reason, not thrown", async () => {
  // "QQ" parses as alg syntax but is not a 3x3x3 move; either failure mode
  // must surface as a reason rather than a throw.
  const bad = await verifySolution("R U QQ", "R'");
  expect(bad.solved).toBe(false);
  if (!bad.solved) expect(bad.reason).toMatch(/does not parse|Invalid move/);

  const badSolution = await verifySolution("R U", "!!! not moves");
  expect(badSolution.solved).toBe(false);
  if (!badSolution.solved) {
    expect(badSolution.reason).toMatch(/does not parse|Invalid move/);
  }
});

test("assertSolves rejects with the failing solution in the message", async () => {
  await expect(assertSolves("R U R' U'", "F2")).rejects.toThrow(
    /failed verification[\s\S]*solution: F2/,
  );
  await expect(assertSolves("R U", "U' R'")).resolves.toBeUndefined();
});

test(
  "real solver solutions for random scrambles all verify (property test)",
  { timeout: TIMEOUT },
  async () => {
    const { experimentalSolve3x3x3IgnoringCenters } = await import("cubing/search");
    const { puzzles } = await import("cubing/puzzles");
    const kpuzzle = await puzzles["3x3x3"].kpuzzle();

    for (let i = 0; i < 15; i++) {
      const scramble = await nextScramble("333");
      const pattern = kpuzzle.defaultPattern().applyAlg(scramble);
      const solution = await experimentalSolve3x3x3IgnoringCenters(pattern);
      await assertSolves(scramble, solution);
    }
  },
);
