import { expect, test } from "vitest";
import { formatInspection, formatTimeMs } from "./format";

test("formats sub-minute times without leading zeros", () => {
  expect(formatTimeMs(9580)).toBe("9.58");
  expect(formatTimeMs(59990)).toBe("59.99");
  expect(formatTimeMs(0)).toBe("0.00");
  expect(formatTimeMs(50)).toBe("0.05");
});

test("truncates to centiseconds, never rounds", () => {
  expect(formatTimeMs(59994)).toBe("59.99");
  expect(formatTimeMs(59999)).toBe("59.99");
  expect(formatTimeMs(10994)).toBe("10.99");
  expect(formatTimeMs(9999)).toBe("9.99");
});

test("formats minutes with zero-padded seconds", () => {
  expect(formatTimeMs(60000)).toBe("1:00.00");
  expect(formatTimeMs(60420)).toBe("1:00.42");
  expect(formatTimeMs(61000)).toBe("1:01.00");
  expect(formatTimeMs(12 * 60000 + 34560)).toBe("12:34.56");
});

test("guards against negative input", () => {
  expect(formatTimeMs(-5)).toBe("0.00");
});

test("one-decimal form truncates to tenths for the live timer", () => {
  expect(formatTimeMs(8372, 1)).toBe("8.3");
  expect(formatTimeMs(8379, 1)).toBe("8.3");
  expect(formatTimeMs(9580, 1)).toBe("9.5");
  expect(formatTimeMs(59994, 1)).toBe("59.9");
  expect(formatTimeMs(60420, 1)).toBe("1:00.4");
  expect(formatTimeMs(0, 1)).toBe("0.0");
  expect(formatTimeMs(-5, 1)).toBe("0.0");
});

test("inspection countdown shows seconds remaining, then +2, then DNF", () => {
  expect(formatInspection(0)).toBe("15");
  expect(formatInspection(1)).toBe("15");
  expect(formatInspection(1000)).toBe("14");
  expect(formatInspection(14001)).toBe("1");
  expect(formatInspection(14999)).toBe("1");
  expect(formatInspection(15000)).toBe("+2");
  expect(formatInspection(16999)).toBe("+2");
  expect(formatInspection(17000)).toBe("DNF");
  expect(formatInspection(30000)).toBe("DNF");
});
