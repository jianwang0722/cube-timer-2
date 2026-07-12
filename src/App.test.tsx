import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { Alg } from "cubing/alg";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import App from "./App";
import { HOLD_MS } from "./timer";

// Deterministic scrambles: each advance() steps to the next canned alg.
const SCRAMBLES = ["R U R' U'", "F B F' B'", "L D L' D'"];
vi.mock("./scramble", async () => {
  const { useState } = await import("react");
  const { Alg } = await import("cubing/alg");
  return {
    useScramble: () => {
      const [i, setI] = useState(0);
      return {
        scramble: new Alg(SCRAMBLES[i % SCRAMBLES.length]),
        advance: () => setI((n) => n + 1),
      };
    },
  };
});

// The real viewer needs cubing/twisty + WebGL; assert on the props instead.
vi.mock("./components/TwistyViewer", () => ({
  TwistyViewer: ({ scramble }: { scramble: Alg | null }) => (
    <div data-testid="twisty" data-scramble={scramble?.toString() ?? ""} />
  ),
}));

beforeEach(() => {
  localStorage.clear();
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

function enableInspection() {
  fireEvent.click(screen.getByRole("button", { name: "settings" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "15s WCA inspection" }));
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
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
  expect(screen.getByRole("listitem")).toHaveTextContent("12.00 +2");

  fireEvent.click(screen.getByRole("button", { name: "DNF" }));
  expect(screen.getByRole("listitem")).toHaveTextContent("DNF");

  fireEvent.click(screen.getByRole("button", { name: "OK" }));
  expect(screen.getByRole("listitem")).toHaveTextContent("10.00");

  fireEvent.click(within(screen.getByRole("listitem")).getByRole("button"));
  fireEvent.click(screen.getByRole("button", { name: "Delete this solve" }));
  expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
});

test("space inside the settings dialog does not arm the timer", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "settings" }));
  const checkbox = screen.getByRole("checkbox", { name: "15s WCA inspection" });
  checkbox.focus();
  fireEvent.keyDown(checkbox, { code: "Space", key: " " });
  expect(timer()).toHaveAttribute("data-status", "idle");
  fireEvent.keyUp(checkbox, { code: "Space", key: " " });
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
});

test("with inspection enabled, a tap starts the countdown and warnings change color", () => {
  render(<App />);
  enableInspection();

  pressSpace();
  releaseSpace();
  expect(timer()).toHaveAttribute("data-status", "inspection");
  expect(timer()).toHaveTextContent("15");

  advance(8000);
  expect(timer()).toHaveClass("timer__digits--warn");
  advance(4000);
  expect(timer()).toHaveClass("timer__digits--plus2");

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
  expect(screen.getByRole("listitem")).toHaveTextContent("12.00 +2");
});

test("shows the scramble and advances to the prefetched one after a solve", () => {
  render(<App />);
  expect(screen.getByText("R U R' U'")).toBeInTheDocument();

  completeSolve(5000);
  // The solve records the scramble it was performed on...
  expect(
    within(screen.getByRole("listitem")).getByRole("button"),
  ).toHaveAttribute("title", "R U R' U'");
  // ...and the display moves to the next scramble.
  expect(screen.getByText("F B F' B'")).toBeInTheDocument();
});

test("N re-scrambles when idle but only stops the timer when running", () => {
  render(<App />);

  fireEvent.keyDown(document.body, { code: "KeyN", key: "n" });
  expect(screen.getByText("F B F' B'")).toBeInTheDocument();

  pressSpace();
  advance(HOLD_MS);
  releaseSpace();
  advance(2000);
  expect(timer()).toHaveAttribute("data-status", "running");

  fireEvent.keyDown(document.body, { code: "KeyN", key: "n" });
  fireEvent.keyUp(document.body, { code: "KeyN", key: "n" });
  expect(timer()).toHaveAttribute("data-status", "stopped");
  // Exactly one advance (from the recorded solve), not a second from the hotkey.
  expect(screen.getByText("L D L' D'")).toBeInTheDocument();
});

test("3D preview follows the scramble and can be hidden", () => {
  render(<App />);
  expect(screen.getByTestId("twisty")).toHaveAttribute(
    "data-scramble",
    "R U R' U'",
  );

  const preview = screen.getByRole("region", { name: "Preview" });
  fireEvent.click(within(preview).getByRole("button", { name: "collapse ▴" }));
  expect(screen.queryByTestId("twisty")).not.toBeInTheDocument();

  fireEvent.click(within(preview).getByRole("button", { name: "expand ▾" }));
  expect(screen.getByTestId("twisty")).toBeInTheDocument();
});

test("solves survive unmount and remount via localStorage", () => {
  const first = render(<App />);
  completeSolve(10000);
  expect(screen.getByRole("listitem")).toHaveTextContent("10.00");
  first.unmount();

  render(<App />);
  expect(screen.getByRole("listitem")).toHaveTextContent("10.00");
});

test("stats panel computes ao5 with a +2 per WCA rules", () => {
  render(<App />);
  // Effective times: 12 (10+2), 11, 12, 13, 9 -> drop 9 & 13 -> ao5 11.67
  completeSolve(10000);
  fireEvent.click(screen.getByRole("button", { name: "+2" }));
  for (const ms of [11000, 12000, 13000, 9000]) completeSolve(ms);

  const ao5 = document.querySelector('[data-stat="ao5-current"]');
  expect(ao5).toHaveTextContent("11.67");
  expect(document.querySelector('[data-stat="single-best"]')).toHaveTextContent(
    "9.00",
  );
});

test("a new PB single gets the highlight class", () => {
  render(<App />);
  completeSolve(12000);
  completeSolve(10000); // PB
  expect(document.querySelector('[data-stat="single-current"]')).toHaveClass(
    "statband__value--pb",
  );
  completeSolve(15000); // not a PB
  expect(
    document.querySelector('[data-stat="single-current"]'),
  ).not.toHaveClass("statband__value--pb");
});

test("sessions keep separate solves and switching works", () => {
  render(<App />);
  completeSolve(10000);

  fireEvent.click(screen.getByRole("button", { name: /Session 1/ }));
  fireEvent.click(screen.getByRole("button", { name: "New" }));
  expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  completeSolve(20000);
  expect(screen.getByRole("listitem")).toHaveTextContent("20.00");

  fireEvent.click(screen.getByRole("button", { name: /Session 2/ }));
  fireEvent.click(screen.getByRole("menuitemradio", { name: /Session 1/ }));
  expect(screen.getByRole("listitem")).toHaveTextContent("10.00");
});

test("solve detail dialog edits an older solve's penalty", () => {
  render(<App />);
  completeSolve(10000);
  completeSolve(11000);
  completeSolve(12000);

  // Open the oldest solve (last in the newest-first list).
  const items = screen.getAllByRole("listitem");
  fireEvent.click(within(items[items.length - 1]).getByRole("button"));

  const dialog = screen.getByRole("dialog", { name: "Solve detail" });
  expect(dialog).toHaveTextContent("10.00");
  expect(dialog).toHaveTextContent("R U R' U'");

  fireEvent.click(within(dialog).getByRole("button", { name: "DNF" }));
  expect(dialog).toHaveTextContent("DNF");
  // Stats reflect the edit: best single is now 11.00.
  expect(document.querySelector('[data-stat="single-best"]')).toHaveTextContent(
    "11.00",
  );

  fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("deleting from the detail dialog removes the solve and closes", () => {
  render(<App />);
  completeSolve(10000);
  completeSolve(11000);

  const items = screen.getAllByRole("listitem");
  fireEvent.click(within(items[items.length - 1]).getByRole("button"));
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Delete this solve",
    }),
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
});

test("a PB solve shows the badge with delta against the previous best", () => {
  render(<App />);
  completeSolve(10000); // first solve: PB but no previous best
  expect(screen.getByText("new personal best")).toBeInTheDocument();
  expect(screen.queryByText(/was /)).not.toBeInTheDocument();

  completeSolve(12000); // not a PB
  expect(screen.queryByText("new personal best")).not.toBeInTheDocument();

  completeSolve(8500); // PB, was 10.00, delta -1.50
  expect(screen.getByText("new personal best")).toBeInTheDocument();
  expect(screen.getByText("was 10.00 · −1.50")).toBeInTheDocument();
});

test("chrome recede phase follows the timer state", () => {
  render(<App />);
  const app = document.querySelector(".app")!;
  expect(app).toHaveAttribute("data-phase", "idle");

  pressSpace();
  expect(app).toHaveAttribute("data-phase", "armed");
  advance(HOLD_MS);
  expect(app).toHaveAttribute("data-phase", "armed");
  releaseSpace();
  expect(app).toHaveAttribute("data-phase", "running");

  fireEvent.keyDown(document.body, { code: "KeyJ", key: "j" });
  fireEvent.keyUp(document.body, { code: "KeyJ", key: "j" });
  expect(app).toHaveAttribute("data-phase", "idle");
});

test("inspection phase recedes chrome and hold duration honors settings", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "settings" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "15s WCA inspection" }));
  fireEvent.change(screen.getByRole("combobox", { name: /Hold to arm/ }), {
    target: { value: "500" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Close" }));

  pressSpace();
  releaseSpace();
  expect(document.querySelector(".app")).toHaveAttribute(
    "data-phase",
    "inspection",
  );

  // 500ms hold now required: 400ms is not enough...
  pressSpace();
  advance(400);
  expect(timer()).toHaveAttribute("data-status", "inspectionArmed");
  advance(100);
  expect(timer()).toHaveAttribute("data-status", "ready");
  releaseSpace();
  expect(timer()).toHaveAttribute("data-status", "running");
});
