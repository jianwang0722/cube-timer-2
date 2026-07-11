import { expect, test } from "vitest";
import {
  effectiveMs,
  formatStat,
  meanOf3,
  trimmedAverage,
  type StatSolve,
} from "./average";

function ok(timeMs: number): StatSolve {
  return { timeMs, penalty: "OK" };
}
function plus2(timeMs: number): StatSolve {
  return { timeMs, penalty: "+2" };
}
const dnf: StatSolve = { timeMs: 9999, penalty: "DNF" };

test("effectiveMs adds 2000ms for +2 before any math and propagates DNF", () => {
  expect(effectiveMs(ok(10000))).toBe(10000);
  expect(effectiveMs(plus2(10000))).toBe(12000);
  expect(effectiveMs(dnf)).toBe("DNF");
});

test("meanOf3 is a plain mean of the last three solves", () => {
  expect(meanOf3([ok(10000), ok(11000), ok(12000)])).toBe(11000);
  // Uses only the last 3.
  expect(meanOf3([ok(50000), ok(10000), ok(11000), ok(12000)])).toBe(11000);
  // +2 applied before the mean: (12+11+13)/3 = 12.
  expect(meanOf3([plus2(10000), ok(11000), ok(13000)])).toBe(12000);
});

test("meanOf3 is DNF if any solve is a DNF, null when under 3 solves", () => {
  expect(meanOf3([ok(10000), dnf, ok(12000)])).toBe("DNF");
  expect(meanOf3([ok(10000), ok(11000)])).toBeNull();
});

test("ao5 drops the single best and single worst", () => {
  // 10, 11, 12, 13, 50 -> mean(11, 12, 13) = 12
  expect(
    trimmedAverage([ok(10000), ok(11000), ok(12000), ok(13000), ok(50000)], 5),
  ).toBe(12000);
});

test("ao5 applies +2 before trimming", () => {
  // Effective: 12, 11, 12, 13, 9 -> drop 9 and 13 -> mean(12, 11, 12) = 11.666...67
  expect(
    trimmedAverage(
      [plus2(10000), ok(11000), ok(12000), ok(13000), ok(9000)],
      5,
    ),
  ).toBe(11670);
});

test("one DNF counts as the worst and is dropped", () => {
  // DNF dropped as worst, 10 dropped as best -> mean(11, 12, 13) = 12
  expect(
    trimmedAverage([ok(10000), ok(11000), ok(12000), ok(13000), dnf], 5),
  ).toBe(12000);
});

test("two DNFs make the average DNF", () => {
  expect(trimmedAverage([ok(10000), ok(11000), ok(12000), dnf, dnf], 5)).toBe(
    "DNF",
  );
  // ...even in a bigger window.
  const eleven = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((s) =>
    ok(s * 1000),
  );
  expect(trimmedAverage([...eleven, dnf, dnf], 12)).toBe("DNF");
});

test("averages round to the centisecond, not truncate", () => {
  // mean(10.994, 10.994, 10.994) = 10.994 -> rounds to 10.99
  expect(meanOf3([ok(10994), ok(10994), ok(10994)])).toBe(10990);
  // mean(10.996, 10.996, 10.998) = 10.99666... -> rounds to 11.00
  expect(meanOf3([ok(10996), ok(10996), ok(10998)])).toBe(11000);
  // ao5 trimmed set mean(11, 11, 11.005) = 11.00166... -> 11.00
  expect(
    trimmedAverage([ok(9000), ok(11000), ok(11000), ok(11005), ok(90000)], 5),
  ).toBe(11000);
});

test("windows use only the most recent n solves", () => {
  const old = [ok(1000), ok(1000), ok(1000), ok(1000), ok(1000)];
  const recent = [ok(10000), ok(11000), ok(12000), ok(13000), ok(14000)];
  expect(trimmedAverage([...old, ...recent], 5)).toBe(12000);
});

test("ao12 and ao100 window sizes", () => {
  const twelve = Array.from({ length: 12 }, (_, i) => ok((10 + i) * 1000));
  // drop 10 and 21 -> mean(11..20) = 15.5
  expect(trimmedAverage(twelve, 12)).toBe(15500);
  expect(trimmedAverage(twelve, 100)).toBeNull();
  const hundred = Array.from({ length: 100 }, (_, i) => ok(10000 + i * 10));
  // 10.00..10.99: drop ends -> mean of 10.01..10.98 = 10.495 -> rounds 10.50
  expect(trimmedAverage(hundred, 100)).toBe(10500);
});

test("insufficient solves give null", () => {
  expect(trimmedAverage([ok(1), ok(2), ok(3), ok(4)], 5)).toBeNull();
});

test("formatStat renders times, DNF, and missing", () => {
  expect(formatStat(11670)).toBe("11.67");
  expect(formatStat("DNF")).toBe("DNF");
  expect(formatStat(null)).toBe("—");
});
