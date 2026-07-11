import { expect, test } from "vitest";
import { displayTime } from "./solve";

test("displays clean solves as the truncated time", () => {
  expect(displayTime({ timeMs: 12345, penalty: "OK" })).toBe("12.34");
});

test("displays +2 with the two seconds added and a trailing plus", () => {
  expect(displayTime({ timeMs: 12345, penalty: "+2" })).toBe("14.34+");
  expect(displayTime({ timeMs: 58500, penalty: "+2" })).toBe("1:00.50+");
});

test("displays DNF regardless of time", () => {
  expect(displayTime({ timeMs: 12345, penalty: "DNF" })).toBe("DNF");
});
