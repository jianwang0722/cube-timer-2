import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import App from "./App";
import { HOLD_MS } from "./timer";

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "performance",
      "Date",
    ],
  });
});

afterEach(() => {
  vi.useRealTimers();
});

function timer() {
  return screen.getByRole("timer");
}

function pressSpace() {
  fireEvent.keyDown(document.body, { code: "Space", key: " " });
}

function releaseSpace() {
  fireEvent.keyUp(document.body, { code: "Space", key: " " });
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

test("renders the idle timer shell", () => {
  render(<App />);
  expect(timer()).toHaveTextContent("0.00");
  expect(timer()).toHaveAttribute("data-status", "idle");
});

test("releasing space before the hold threshold does not start the timer", () => {
  render(<App />);
  pressSpace();
  advance(HOLD_MS - 1);
  releaseSpace();
  advance(1000);
  expect(timer()).toHaveAttribute("data-status", "idle");
  expect(timer()).toHaveTextContent("0.00");
});

test("hold to ready, release to run, any key stops and records the solve", () => {
  render(<App />);

  pressSpace();
  expect(timer()).toHaveAttribute("data-status", "armed");
  advance(HOLD_MS);
  expect(timer()).toHaveAttribute("data-status", "ready");

  releaseSpace();
  expect(timer()).toHaveAttribute("data-status", "running");
  advance(1234);

  fireEvent.keyDown(document.body, { code: "KeyJ", key: "j" });
  expect(timer()).toHaveAttribute("data-status", "stopped");
  expect(timer()).toHaveTextContent("1.23");
  fireEvent.keyUp(document.body, { code: "KeyJ", key: "j" });

  expect(screen.getByRole("listitem")).toHaveTextContent("1.23");
});

function completeSolve(durationMs: number) {
  pressSpace();
  advance(HOLD_MS);
  releaseSpace();
  advance(durationMs);
  fireEvent.keyDown(document.body, { code: "KeyJ", key: "j" });
  fireEvent.keyUp(document.body, { code: "KeyJ", key: "j" });
}

test("penalty controls edit and delete the last solve", () => {
  render(<App />);
  completeSolve(10000);

  fireEvent.click(screen.getByRole("button", { name: "+2" }));
  expect(screen.getByRole("listitem")).toHaveTextContent("12.00+");

  fireEvent.click(screen.getByRole("button", { name: "DNF" }));
  expect(screen.getByRole("listitem")).toHaveTextContent("DNF");

  fireEvent.click(screen.getByRole("button", { name: "OK" }));
  expect(screen.getByRole("listitem")).toHaveTextContent("10.00");

  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
});

test("space pressed while focused on an input does not arm the timer", () => {
  render(<App />);
  const checkbox = screen.getByRole("checkbox", { name: "15s inspection" });
  checkbox.focus();
  fireEvent.keyDown(checkbox, { code: "Space", key: " " });
  expect(timer()).toHaveAttribute("data-status", "idle");
  fireEvent.keyUp(checkbox, { code: "Space", key: " " });
});

test("with inspection enabled, a tap starts the countdown and warnings change color", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("checkbox", { name: "15s inspection" }));

  pressSpace();
  releaseSpace();
  expect(timer()).toHaveAttribute("data-status", "inspection");
  expect(timer()).toHaveTextContent("15");

  advance(8000);
  expect(timer()).toHaveClass("timer-display--warning8");
  advance(4000);
  expect(timer()).toHaveClass("timer-display--warning12");

  // Start 15.5s in: solve carries a +2.
  advance(3500 - HOLD_MS);
  pressSpace();
  advance(HOLD_MS);
  expect(timer()).toHaveAttribute("data-status", "ready");
  releaseSpace();
  expect(timer()).toHaveAttribute("data-status", "running");

  advance(10000);
  fireEvent.keyDown(document.body, { code: "KeyJ", key: "j" });
  fireEvent.keyUp(document.body, { code: "KeyJ", key: "j" });
  expect(screen.getByRole("listitem")).toHaveTextContent("12.00+");
});
