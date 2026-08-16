// @vitest-environment node
import { expect, test } from "vitest";
import {
  cancelMoves,
  stripTrailingRotations,
  tidyMoves,
  type TaggedMove,
} from "./cleanup";
import { faceletsFromMoves } from "./cube";

/** "R U2" with every move tagged to one stage. */
function tag(moves: string, stage = 0): TaggedMove[] {
  return moves
    .split(" ")
    .filter(Boolean)
    .map((move) => ({ move, stage }));
}

const text = (moves: readonly TaggedMove[]): string =>
  moves.map((m) => m.move).join(" ");

const stages = (moves: readonly TaggedMove[]): number[] => moves.map((m) => m.stage);

test("adjacent same-face turns combine mod 4", () => {
  expect(text(cancelMoves(tag("R R")))).toBe("R2");
  expect(text(cancelMoves(tag("R R'")))).toBe("");
  expect(text(cancelMoves(tag("R R2")))).toBe("R'");
  expect(text(cancelMoves(tag("R2 R2")))).toBe("");
  expect(text(cancelMoves(tag("R2 R'")))).toBe("R");
  expect(text(cancelMoves(tag("R' R'")))).toBe("R2");
  expect(text(cancelMoves(tag("R R R R")))).toBe("");
});

test("cancelling runs to a fixpoint, not a single pass", () => {
  // R U U' R' must collapse entirely: the inner cancellation exposes the outer.
  expect(text(cancelMoves(tag("R U U' R'")))).toBe("");
  expect(text(cancelMoves(tag("F R U U' R' F'")))).toBe("");
  expect(text(cancelMoves(tag("R U2 U2 R L")))).toBe("R2 L");
});

test("only exactly-adjacent, exactly-same-base moves merge", () => {
  // Commuting faces are left alone — we never slide turns past each other.
  expect(text(cancelMoves(tag("R L R")))).toBe("R L R");
  // A face and its wide form move different pieces.
  expect(text(cancelMoves(tag("R r")))).toBe("R r");
  expect(text(cancelMoves(tag("M M'")))).toBe("");
  expect(text(cancelMoves(tag("r2 r2")))).toBe("");
});

test("a survivor is attributed to the stage that started it", () => {
  const seam = [...tag("R U", 0), ...tag("U R2", 1)];
  const cleaned = cancelMoves(seam);
  // U + U -> U2 belongs to stage 0; R + R2 -> R' also folds back to stage 0.
  expect(text(cleaned)).toBe("R U2 R2");
  expect(stages(cleaned)).toEqual([0, 0, 1]);
});

test("stage tags stay non-decreasing, so stages remain contiguous", () => {
  const solution = [...tag("R U R'", 0), ...tag("R U2", 1), ...tag("U2 F", 2)];
  const cleaned = cancelMoves(solution);
  expect(stages(cleaned)).toEqual([...stages(cleaned)].sort((a, b) => a - b));
});

test("a stage can cancel away entirely", () => {
  const cleaned = cancelMoves([...tag("R", 0), ...tag("R'", 1), ...tag("U", 2)]);
  expect(text(cleaned)).toBe("U");
  expect(cleaned.filter((m) => m.stage === 1)).toEqual([]);
});

test("trailing rotations are dropped, interior ones kept", () => {
  expect(text(stripTrailingRotations(tag("R U y x'")))).toBe("R U");
  expect(text(stripTrailingRotations(tag("R y U")))).toBe("R y U");
  expect(text(stripTrailingRotations(tag("z2 y")))).toBe("");
});

test("the protected prefix is never merged away or stripped", () => {
  // The pipeline pins the leading z2 with protectPrefix = 1.
  expect(text(tidyMoves(tag("z2"), 1))).toBe("z2");
  expect(text(tidyMoves(tag("z2 z2"), 1))).toBe("z2");
  expect(text(tidyMoves(tag("z2 R R'"), 1))).toBe("z2");
  // Without the guard the whole thing would vanish.
  expect(text(tidyMoves(tag("z2 z2"), 0))).toBe("");
});

test("cancelling can expose a trailing rotation, so strip runs after", () => {
  expect(text(tidyMoves(tag("z2 R U U' R' y"), 1))).toBe("z2");
});

test("cleanup never changes what a sequence does to the cube", () => {
  const cases = [
    "R U U' R' F",
    "z2 R U R' U' R U2 R' y y' F R F'",
    "R U2 U2 R L M M' r r'",
    "F R U R' U' F' U' U R U R'",
  ];
  for (const alg of cases) {
    const cleaned = text(cancelMoves(tag(alg)));
    expect(faceletsFromMoves(cleaned), alg).toEqual(faceletsFromMoves(alg));
  }
});
