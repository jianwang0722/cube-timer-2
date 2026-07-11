import { expect, test } from "vitest";
import {
  HOLD_MS,
  initialState,
  transition,
  type TimerConfig,
  type TimerEvent,
  type TimerState,
} from "./machine";

const noInspection: TimerConfig = { inspectionEnabled: false };
const withInspection: TimerConfig = { inspectionEnabled: true };

function run(config: TimerConfig, events: TimerEvent[], from: TimerState = initialState) {
  return events.reduce((state, event) => transition(state, event, config), from);
}

test("press arms the timer", () => {
  const state = run(noInspection, [{ type: "PRESS", now: 1000 }]);
  expect(state).toEqual({ status: "armed", since: 1000 });
});

test("releasing before the hold threshold returns to idle without starting", () => {
  const state = run(noInspection, [
    { type: "PRESS", now: 1000 },
    { type: "RELEASE", now: 1000 + HOLD_MS - 1 },
  ]);
  expect(state.status).toBe("idle");
});

test("holding to threshold turns ready; release starts the timer", () => {
  const ready = run(noInspection, [
    { type: "PRESS", now: 1000 },
    { type: "HOLD_REACHED", now: 1000 + HOLD_MS },
  ]);
  expect(ready.status).toBe("ready");

  const running = run(noInspection, [{ type: "RELEASE", now: 2000 }], ready);
  expect(running).toEqual({ status: "running", startedAt: 2000, inspectionPenalty: "OK" });
});

test("any press stops a running timer and records the elapsed time", () => {
  const running: TimerState = { status: "running", startedAt: 2000, inspectionPenalty: "OK" };
  const stopped = run(noInspection, [{ type: "PRESS", now: 12345 }], running);
  expect(stopped).toEqual({
    status: "stopped",
    timeMs: 10345,
    penalty: "OK",
    awaitingRelease: true,
  });
});

test("re-arming after a stop requires releasing the stopping key first", () => {
  const stopped: TimerState = {
    status: "stopped",
    timeMs: 10345,
    penalty: "OK",
    awaitingRelease: true,
  };
  // Press while the stopping key is still down is ignored.
  expect(run(noInspection, [{ type: "PRESS", now: 13000 }], stopped)).toEqual(stopped);
  // After release, a new press arms normally.
  const rearmed = run(
    noInspection,
    [
      { type: "RELEASE", now: 13000 },
      { type: "PRESS", now: 14000 },
    ],
    stopped,
  );
  expect(rearmed).toEqual({ status: "armed", since: 14000 });
});

test("cancel aborts an armed hold", () => {
  const state = run(noInspection, [{ type: "PRESS", now: 1000 }, { type: "CANCEL" }]);
  expect(state.status).toBe("idle");
});

test("with inspection enabled, a tap of any length starts the countdown", () => {
  const quickTap = run(withInspection, [
    { type: "PRESS", now: 1000 },
    { type: "RELEASE", now: 1050 },
  ]);
  expect(quickTap).toEqual({ status: "inspection", startedAt: 1050 });

  // Even a long hold from idle only starts inspection on release.
  const longHold = run(withInspection, [
    { type: "PRESS", now: 1000 },
    { type: "HOLD_REACHED", now: 1000 + HOLD_MS },
    { type: "RELEASE", now: 2000 },
  ]);
  expect(longHold).toEqual({ status: "inspection", startedAt: 2000 });
});

test("during inspection, hold to ready then release to start", () => {
  const state = run(withInspection, [
    { type: "PRESS", now: 1000 },
    { type: "RELEASE", now: 1050 }, // inspection starts at 1050
    { type: "PRESS", now: 5000 },
    { type: "HOLD_REACHED", now: 5000 + HOLD_MS },
    { type: "RELEASE", now: 6000 },
  ]);
  expect(state).toEqual({ status: "running", startedAt: 6000, inspectionPenalty: "OK" });
});

test("releasing a short hold during inspection keeps the countdown running", () => {
  const state = run(withInspection, [
    { type: "PRESS", now: 1000 },
    { type: "RELEASE", now: 1050 },
    { type: "PRESS", now: 5000 },
    { type: "RELEASE", now: 5100 },
  ]);
  expect(state).toEqual({ status: "inspection", startedAt: 1050 });
});

test.each([
  [14999, "OK"],
  [15001, "+2"],
  [16999, "+2"],
  [17001, "DNF"],
] as const)("starting %ims into inspection gives penalty %s", (elapsed, penalty) => {
  const startedAt = 1000;
  const startNow = startedAt + elapsed;
  const state = run(withInspection, [
    { type: "PRESS", now: startNow - HOLD_MS - 100 },
    { type: "HOLD_REACHED", now: startNow - 100 },
    { type: "RELEASE", now: startNow },
  ], { status: "inspection", startedAt });
  expect(state).toEqual({ status: "running", startedAt: startNow, inspectionPenalty: penalty });
});

test("cancel aborts inspection", () => {
  const state = run(withInspection, [
    { type: "PRESS", now: 1000 },
    { type: "RELEASE", now: 1050 },
    { type: "CANCEL" },
  ]);
  expect(state.status).toBe("idle");
});

test("an inspection penalty is carried onto the recorded solve", () => {
  const running: TimerState = { status: "running", startedAt: 20000, inspectionPenalty: "+2" };
  const stopped = run(withInspection, [{ type: "PRESS", now: 30000 }], running);
  expect(stopped).toMatchObject({ status: "stopped", timeMs: 10000, penalty: "+2" });
});
