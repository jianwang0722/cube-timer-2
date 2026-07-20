// @vitest-environment node
import { Alg } from "cubing/alg";
import { puzzles } from "cubing/puzzles";
import { expect, test } from "vitest";
import { nextScramble } from "./scramble";

// Real random-state scramble generation (worker + solver warm-up) is slow on
// first call; these are integration tests of the acceptance criteria. 4x4 is
// deliberately excluded — its solver init is multi-second, too slow for CI;
// the production build smoke test covers it.
const TIMEOUT = 60_000;

test(
  "333 produces non-trivial, distinct random-state scrambles",
  { timeout: TIMEOUT },
  async () => {
    const a = await nextScramble("333");
    const b = await nextScramble("333");
    // Random-state 3x3 scrambles are typically ~19-21 moves.
    expect(a.experimentalNumChildAlgNodes()).toBeGreaterThanOrEqual(15);
    expect(a.toString()).not.toBe(b.toString());
  },
);

test(
  "333 scramble text reproduces the exact cube state of the Alg",
  { timeout: TIMEOUT },
  async () => {
    const scramble = await nextScramble("333");
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

test(
  "222 produces distinct random-state scrambles that actually scramble",
  { timeout: TIMEOUT },
  async () => {
    const a = await nextScramble("222");
    const b = await nextScramble("222");
    // Random-state 2x2 scrambles are typically ~9-11 moves.
    expect(a.experimentalNumChildAlgNodes()).toBeGreaterThanOrEqual(5);
    expect(a.toString()).not.toBe(b.toString());

    const kpuzzle = await puzzles["2x2x2"].kpuzzle();
    const solved = kpuzzle.defaultPattern();
    expect(solved.applyAlg(a).isIdentical(solved)).toBe(false);
  },
);

test(
  "555 produces long random-move scrambles in wide notation",
  { timeout: TIMEOUT },
  async () => {
    // 5x5 has no random-state generator; cubing.js emits random moves
    // (official TNoodle behavior) — a long sequence including wide turns.
    const a = await nextScramble("555");
    const b = await nextScramble("555");
    expect(a.experimentalNumChildAlgNodes()).toBeGreaterThanOrEqual(40);
    expect(a.toString()).not.toBe(b.toString());
    expect(a.toString()).toMatch(/[URFDLB]w/);
  },
);
