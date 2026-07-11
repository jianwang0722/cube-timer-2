import { expect, test } from "vitest";
import type { StatSolve } from "./average";
import { computePbFlags, computeStats } from "./stats";

function ok(timeMs: number): StatSolve {
  return { timeMs, penalty: "OK" };
}
const dnf: StatSolve = { timeMs: 9999, penalty: "DNF" };

test("empty session has null stats", () => {
  const stats = computeStats([]);
  expect(stats.count).toBe(0);
  expect(stats.single).toEqual({ current: null, best: null });
  expect(stats.worstSingle).toBeNull();
  expect(stats.ao5.best).toBeNull();
});

test("single current/best/worst track effective times", () => {
  const stats = computeStats([
    ok(12000),
    ok(9000),
    { timeMs: 9000, penalty: "+2" },
  ]);
  expect(stats.single.current).toBe(11000); // +2 applied
  expect(stats.single.best).toBe(9000);
  expect(stats.worstSingle).toBe(12000);
});

test("an all-DNF session has DNF best/worst singles", () => {
  const stats = computeStats([dnf, dnf]);
  expect(stats.single.best).toBe("DNF");
  expect(stats.worstSingle).toBe("DNF");
  expect(stats.single.current).toBe("DNF");
});

test("best ao5 scans every window and ignores DNF windows", () => {
  // First five average 12 (drop 10, 50); last five (11,12,13,50,9) -> drop 9,50 -> 12
  // Middle window (12,13,50,9,8)? windows: use explicit sequence where an
  // early window is best.
  const solves = [
    ok(10000),
    ok(11000),
    ok(12000),
    ok(13000),
    ok(50000),
    dnf,
    dnf,
  ];
  const stats = computeStats(solves);
  // current ao5 window (13000, 50000, dnf, dnf) has two DNFs -> DNF
  expect(stats.ao5.current).toBe("DNF");
  // but the best window (first five) is numeric
  expect(stats.ao5.best).toBe(12000);
});

test("mo3 best picks the best consecutive triple", () => {
  const solves = [ok(20000), ok(10000), ok(10000), ok(10000), ok(30000)];
  const stats = computeStats(solves);
  expect(stats.mo3.best).toBe(10000);
  // mean(10, 10, 30) = 16.666... rounds to 16.67
  expect(stats.mo3.current).toBe(16670);
});

test("a new best single flags a PB, ties do not", () => {
  expect(computePbFlags([ok(12000), ok(11000)]).single).toBe(true);
  expect(computePbFlags([ok(11000), ok(11000)]).single).toBe(false);
  expect(computePbFlags([ok(11000), ok(12000)]).single).toBe(false);
  // The very first solve is a PB.
  expect(computePbFlags([ok(11000)]).single).toBe(true);
});

test("a new best ao5 flags a PB only once the window improves", () => {
  const base = [ok(10000), ok(11000), ok(12000), ok(13000), ok(14000)]; // ao5 12
  // 6th solve 9s: new window (11,12,13,14,9) -> drop 9,14 -> 12 -> tie, no PB
  expect(computePbFlags([...base, ok(9000)]).ao5).toBe(false);
  // 6th solve fast enough to improve: (11,12,13,14,8)->12? still 12. Use 7th:
  const better = [...base, ok(9000), ok(9000)]; // window (12,13,14,9,9)->drop 9,14->11.33
  expect(computePbFlags(better).ao5).toBe(true);
});

test("a DNF latest solve never flags a PB", () => {
  expect(computePbFlags([ok(11000), dnf]).single).toBe(false);
});

test("1000-solve sessions compute quickly", () => {
  const solves = Array.from({ length: 1000 }, (_, i) =>
    ok(10000 + (i % 97) * 25),
  );
  const start = performance.now();
  computeStats(solves);
  computePbFlags(solves);
  const elapsed = performance.now() - start;
  expect(elapsed).toBeLessThan(500);
});
