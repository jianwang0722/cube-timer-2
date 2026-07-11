// @vitest-environment node
import { Alg } from "cubing/alg";
import { puzzles } from "cubing/puzzles";
import { expect, test } from "vitest";
import { nextScramble } from "./scramble";

// Real random-state scramble generation (worker + solver warm-up) is slow on
// first call; these are integration tests of the acceptance criteria.
const TIMEOUT = 60_000;

test(
  "produces non-trivial, distinct random-state scrambles",
  { timeout: TIMEOUT },
  async () => {
    const a = await nextScramble();
    const b = await nextScramble();
    // Random-state 3x3 scrambles are typically ~19-21 moves.
    expect(a.experimentalNumChildAlgNodes()).toBeGreaterThanOrEqual(15);
    expect(a.toString()).not.toBe(b.toString());
  },
);

test(
  "scramble text reproduces the exact cube state of the Alg",
  { timeout: TIMEOUT },
  async () => {
    const scramble = await nextScramble();
    const kpuzzle = await puzzles["3x3x3"].kpuzzle();

    const solved = kpuzzle.defaultPattern();
    const fromAlg = solved.applyAlg(scramble);
    // The scramble actually scrambles.
    expect(fromAlg.isIdentical(solved)).toBe(false);
    // Applying the displayed text yields the identical state, so the 3D
    // preview (fed the same alg) provably matches the shown text.
    const fromText = solved.applyAlg(Alg.fromString(scramble.toString()));
    expect(fromText.isIdentical(fromAlg)).toBe(true);
  },
);
