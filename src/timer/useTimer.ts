import { useEffect, useReducer, useRef } from "react";
import {
  HOLD_MS,
  initialState,
  transition,
  type TimerConfig,
  type TimerEvent,
  type TimerState,
} from "./machine";
import type { Penalty } from "./solve";

export interface SolveResult {
  timeMs: number;
  penalty: Penalty;
}

export interface UseTimerOptions {
  inspectionEnabled: boolean;
  onSolve: (result: SolveResult) => void;
}

export interface TimerSurfaceProps {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
}

export interface UseTimerResult {
  state: TimerState;
  /** Elapsed ms while running; final time when stopped; 0 otherwise. */
  displayMs: number;
  /** ms since inspection started, or null when not inspecting. */
  inspectionElapsedMs: number | null;
  /** Spread onto the touch/click timing surface. */
  surfaceProps: TimerSurfaceProps;
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function reduce(
  state: TimerState,
  action: { event: TimerEvent; config: TimerConfig },
): TimerState {
  return transition(state, action.event, action.config);
}

export function useTimer({
  inspectionEnabled,
  onSolve,
}: UseTimerOptions): UseTimerResult {
  const [state, dispatch] = useReducer(reduce, initialState);

  // Refs so the stable window listeners always see current values.
  const stateRef = useRef(state);
  stateRef.current = state;
  const configRef = useRef<TimerConfig>({ inspectionEnabled });
  configRef.current = { inspectionEnabled };
  const onSolveRef = useRef(onSolve);
  onSolveRef.current = onSolve;

  const send = (event: TimerEvent) =>
    dispatch({ event, config: configRef.current });

  // Keyboard: space arms/releases; any key stops a running timer; Escape cancels.
  useEffect(() => {
    const sendEvent = (event: TimerEvent) =>
      dispatch({ event, config: configRef.current });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isEditableTarget(e.target)) return;
      if (e.key === "Escape") {
        sendEvent({ type: "CANCEL" });
        return;
      }
      const running = stateRef.current.status === "running";
      if (running || e.code === "Space") {
        e.preventDefault();
        sendEvent({ type: "PRESS", now: performance.now() });
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      // Space releases; after a stop, releasing whichever key stopped the
      // timer clears the re-arm guard.
      if (e.code === "Space" || stateRef.current.status === "stopped") {
        sendEvent({ type: "RELEASE", now: performance.now() });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Hold-to-arm: schedule HOLD_REACHED while a press is being held.
  const holdSince =
    state.status === "armed" || state.status === "inspectionArmed"
      ? state.since
      : null;
  useEffect(() => {
    if (holdSince === null) return;
    const timeout = setTimeout(() => {
      dispatch({
        event: { type: "HOLD_REACHED", now: performance.now() },
        config: configRef.current,
      });
    }, HOLD_MS);
    return () => clearTimeout(timeout);
  }, [holdSince]);

  // Report each finished solve exactly once, on the running -> stopped edge
  // (later stopped-state updates like clearing awaitingRelease must not refire).
  const prevStatusRef = useRef(state.status);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = state.status;
    if (state.status === "stopped" && prev !== "stopped") {
      onSolveRef.current({ timeMs: state.timeMs, penalty: state.penalty });
    }
  }, [state]);

  // rAF-driven re-render while the display is live (running or inspecting).
  // performance.now() deltas computed at render time are the source of truth.
  const [, tick] = useReducer((n: number) => n + 1, 0);
  const live =
    state.status === "running" ||
    state.status === "inspection" ||
    state.status === "inspectionArmed" ||
    (state.status === "ready" && state.inspectionStartedAt !== undefined);
  useEffect(() => {
    if (!live) return;
    let raf = requestAnimationFrame(function loop() {
      tick();
      raf = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(raf);
  }, [live]);

  const now = performance.now();
  const displayMs =
    state.status === "running"
      ? now - state.startedAt
      : state.status === "stopped"
        ? state.timeMs
        : 0;

  const inspectionStartedAt =
    state.status === "inspection" || state.status === "inspectionArmed"
      ? state.startedAt
      : state.status === "ready"
        ? (state.inspectionStartedAt ?? null)
        : null;
  const inspectionElapsedMs =
    inspectionStartedAt === null ? null : now - inspectionStartedAt;

  const surfaceProps: TimerSurfaceProps = {
    onPointerDown: (e) => {
      if (!e.isPrimary || isEditableTarget(e.target)) return;
      e.preventDefault();
      send({ type: "PRESS", now: performance.now() });
    },
    onPointerUp: (e) => {
      if (!e.isPrimary) return;
      send({ type: "RELEASE", now: performance.now() });
    },
    onPointerCancel: () => {
      send({ type: "CANCEL" });
    },
  };

  return { state, displayMs, inspectionElapsedMs, surfaceProps };
}
