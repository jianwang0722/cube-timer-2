// @vitest-environment node
import { expect, test } from "vitest";
import { solutionAlg, solve, solveVerified } from "./solve";

const SCRAMBLES = [
  "R U R' U'",
  "F B F' B'",
  "R U2 F' L D2 B R' F U R2 D' L2 F2 B2 U2 D' L2 U2 R2",
  "R L U2 F U' D F2 R2 B2 L U2 F' B' U R2 D F2 U R2 U", // superflip-ish
];

const ROTATION = /^[xyz]/;
const STAGE_ORDER = ["cross", "f2l-1", "f2l-2", "f2l-3", "f2l-4", "oll", "pll"];

test.each(SCRAMBLES)(
  "solve(%s) is well-formed and passes the runtime guard",
  async (scramble) => {
    const solution = solve(scramble);

    // Every CFOP stage, in order.
    expect(solution.stages.map((s) => s.name)).toEqual(STAGE_ORDER);

    // Annotations name the color / pair / case as the UI will show them.
    expect(solution.stages[0].annotation).toBe("Cross (white)");
    for (let i = 1; i <= 4; i++) {
      expect(solution.stages[i].annotation).toBe(`F2L pair ${i}`);
    }
    expect(solution.stages[5].annotation).toMatch(/^OLL (\d+|skip)$/);
    expect(solution.stages[6].annotation).toMatch(/(-perm|^PLL skip)$/);

    // moveCount excludes rotations and matches the stage's own move string.
    for (const s of solution.stages) {
      const turns = s.moves.split(" ").filter((m) => m && !ROTATION.test(m)).length;
      expect(s.moveCount).toBe(turns);
    }
    expect(solution.totalMoves).toBe(
      solution.stages.reduce((n, s) => n + s.moveCount, 0),
    );

    // The cross always opens with the z2 reorientation.
    expect(solution.stages[0].moves.startsWith("z2")).toBe(true);

    // Verified end-to-end by the KPuzzle harness.
    const result = await solveVerified(scramble);
    expect(result).toEqual({ ok: true, solution });
  },
);

test("an already-solved cube skips the last layer with a zero-turn solve", async () => {
  const solution = solve("");
  expect(solution.stages[5].annotation).toBe("OLL skip");
  expect(solution.stages[6].annotation).toBe("PLL skip");
  expect(solution.totalMoves).toBe(0);
  expect(solutionAlg(solution)).toBe("z2");

  const result = await solveVerified("");
  expect(result.ok).toBe(true);
});

test("stage seams cancel, and a stage cancelled away says so", async () => {
  // Here OLL 26 runs straight into an Na-perm that opens with its inverse, so
  // the whole OLL stage annihilates at the seam (~0.05% of last-layer stages).
  // The UI draws any zero-move stage as a skip, so the label must not still
  // read a bare "OLL 26" — that would claim a case while showing nothing.
  const scramble =
    "U' U B' F B' B2 U' F D' D2 R' F F' F' U2 U L' L2 U' B2 B D2 F R2 D2 F' F2 R' F F2";
  const solution = solve(scramble);
  const oll = solution.stages.find((s) => s.name === "oll")!;
  const pll = solution.stages.find((s) => s.name === "pll")!;

  expect(oll.moveCount).toBe(0);
  expect(oll.annotation).toBe("OLL 26 (cancelled)");
  // The work didn't vanish, only the moves did — PLL still finishes the cube.
  expect(pll.moveCount).toBeGreaterThan(0);
  await expect(solveVerified(scramble)).resolves.toMatchObject({ ok: true });
});
