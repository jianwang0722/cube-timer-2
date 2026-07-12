import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useTimer, type InspectionWarning } from "./useTimer";

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "performance",
    ],
  });
});

afterEach(() => {
  vi.useRealTimers();
});

function key(type: "keydown" | "keyup", code = "Space") {
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent(type, { code, key: code === "Space" ? " " : code }),
    );
  });
}

function advance(ms: number) {
  act(() => vi.advanceTimersByTime(ms));
}

test("a custom holdMs delays arming readiness", () => {
  const { result } = renderHook(() =>
    useTimer({ inspectionEnabled: false, onSolve: () => {}, holdMs: 500 }),
  );
  key("keydown");
  advance(400);
  expect(result.current.state.status).toBe("armed"); // 300 default would be ready
  advance(100);
  expect(result.current.state.status).toBe("ready");
  key("keyup");
  expect(result.current.state.status).toBe("running");
});

test("inspection warnings fire once each at 8s and 12s", () => {
  const warnings: InspectionWarning[] = [];
  const { result } = renderHook(() =>
    useTimer({
      inspectionEnabled: true,
      onSolve: () => {},
      onInspectionWarning: (kind) => warnings.push(kind),
    }),
  );

  key("keydown");
  key("keyup"); // tap -> inspection starts
  expect(result.current.state.status).toBe("inspection");

  advance(7999);
  expect(warnings).toEqual([]);
  advance(1);
  expect(warnings).toEqual(["8s"]);

  // Holding and releasing mid-inspection must not re-fire the 8s warning.
  key("keydown");
  advance(100);
  key("keyup");
  advance(3800);
  expect(warnings).toEqual(["8s"]);

  advance(100); // crosses 12s
  expect(warnings).toEqual(["8s", "12s"]);
  advance(5000);
  expect(warnings).toEqual(["8s", "12s"]);
});

test("no warnings fire once the solve starts before 8s", () => {
  const warnings: InspectionWarning[] = [];
  const { result } = renderHook(() =>
    useTimer({
      inspectionEnabled: true,
      onSolve: () => {},
      onInspectionWarning: (kind) => warnings.push(kind),
    }),
  );
  key("keydown");
  key("keyup");
  advance(2000);
  key("keydown");
  advance(300);
  key("keyup"); // running at ~2.3s of inspection
  expect(result.current.state.status).toBe("running");
  advance(15000);
  expect(warnings).toEqual([]);
});
