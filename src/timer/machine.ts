import type { Penalty } from "./solve";

export const HOLD_MS = 300;
export const INSPECTION_MS = 15000;
export const PLUS2_CUTOFF_MS = 17000;

export type TimerState =
  | { status: "idle" }
  | { status: "armed"; since: number }
  | { status: "inspection"; startedAt: number }
  | { status: "inspectionArmed"; startedAt: number; since: number }
  | { status: "ready"; inspectionStartedAt?: number }
  | { status: "running"; startedAt: number; inspectionPenalty: Penalty }
  | {
      status: "stopped";
      timeMs: number;
      penalty: Penalty;
      awaitingRelease: boolean;
    };

export type TimerEvent =
  | { type: "PRESS"; now: number }
  | { type: "RELEASE"; now: number }
  | { type: "HOLD_REACHED"; now: number }
  | { type: "CANCEL" };

export interface TimerConfig {
  inspectionEnabled: boolean;
}

export const initialState: TimerState = { status: "idle" };

function inspectionPenaltyAt(
  inspectionStartedAt: number,
  now: number,
): Penalty {
  const elapsed = now - inspectionStartedAt;
  if (elapsed >= PLUS2_CUTOFF_MS) return "DNF";
  if (elapsed >= INSPECTION_MS) return "+2";
  return "OK";
}

function startRunning(now: number, inspectionStartedAt?: number): TimerState {
  return {
    status: "running",
    startedAt: now,
    inspectionPenalty:
      inspectionStartedAt === undefined
        ? "OK"
        : inspectionPenaltyAt(inspectionStartedAt, now),
  };
}

export function transition(
  state: TimerState,
  event: TimerEvent,
  config: TimerConfig,
): TimerState {
  switch (state.status) {
    case "idle":
      if (event.type === "PRESS") {
        return { status: "armed", since: event.now };
      }
      return state;

    case "armed":
      switch (event.type) {
        case "HOLD_REACHED":
          // With inspection on, arming happens during inspection instead; a
          // long hold from idle still just tap-starts the countdown on release.
          return config.inspectionEnabled ? state : { status: "ready" };
        case "RELEASE":
          return config.inspectionEnabled
            ? { status: "inspection", startedAt: event.now }
            : { status: "idle" };
        case "CANCEL":
          return { status: "idle" };
        default:
          return state;
      }

    case "inspection":
      switch (event.type) {
        case "PRESS":
          return {
            status: "inspectionArmed",
            startedAt: state.startedAt,
            since: event.now,
          };
        case "CANCEL":
          return { status: "idle" };
        default:
          return state;
      }

    case "inspectionArmed":
      switch (event.type) {
        case "HOLD_REACHED":
          return { status: "ready", inspectionStartedAt: state.startedAt };
        case "RELEASE":
          return { status: "inspection", startedAt: state.startedAt };
        case "CANCEL":
          return { status: "idle" };
        default:
          return state;
      }

    case "ready":
      switch (event.type) {
        case "RELEASE":
          return startRunning(event.now, state.inspectionStartedAt);
        case "CANCEL":
          return { status: "idle" };
        default:
          return state;
      }

    case "running":
      if (event.type === "PRESS") {
        return {
          status: "stopped",
          timeMs: event.now - state.startedAt,
          penalty: state.inspectionPenalty,
          awaitingRelease: true,
        };
      }
      return state;

    case "stopped":
      // CANCEL clears the guard like RELEASE does: a cancelled pointer (the
      // browser taking a swipe over to scroll) never sends a RELEASE, so the
      // guard would strand here and swallow the next press.
      if (event.type === "RELEASE" || event.type === "CANCEL") {
        return { ...state, awaitingRelease: false };
      }
      if (event.type === "PRESS" && !state.awaitingRelease) {
        return { status: "armed", since: event.now };
      }
      return state;
  }
}
