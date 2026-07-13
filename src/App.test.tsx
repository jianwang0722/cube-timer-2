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
  TwistyViewer: ({ scramble, alg }: { scramble: Alg | null; alg?: Alg }) => (
    <div
      data-testid="twisty"
      data-scramble={scramble?.toString() ?? ""}
      data-alg={alg?.toString() ?? ""}
    />
  ),
}));

// A deterministic example solve; the real cross/F2L/OLL/PLL search + KPuzzle
// verification are covered by the solver's own tests. `solutionAlg` stays real.
const { FAKE_SOLUTION } = vi.hoisted(() => ({
  FAKE_SOLUTION: {
    stages: [
      { name: "cross", annotation: "Cross (white)", moves: "z2 F R U", moveCount: 3 },
      { name: "f2l-1", annotation: "F2L pair 1", moves: "U R U' R'", moveCount: 4 },
      { name: "f2l-2", annotation: "F2L pair 2", moves: "y' U' R' U R", moveCount: 4 },
      { name: "f2l-3", annotation: "F2L pair 3", moves: "", moveCount: 0 },
      { name: "f2l-4", annotation: "F2L pair 4", moves: "U R U' R'", moveCount: 4 },
      { name: "oll", annotation: "OLL 27", moves: "R U R' U R U2 R'", moveCount: 7 },
      {
        name: "pll",
        annotation: "T-perm",
        moves: "R U R' U' R' F R2 U' R' U' R U R' F'",
        moveCount: 14,
      },
    ],
    totalMoves: 36,
  },
}));

vi.mock("./solver", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./solver")>();
  const { useState, useCallback } = await import("react");
  return {
    ...actual,
    useSolution: () => {
      const [revealed, setRevealed] = useState(false);
      return {
        status: revealed ? "ready" : "idle",
        solution: revealed ? FAKE_SOLUTION : null,
        reason: null,
        reveal: useCallback(() => setRevealed(true), []),
      };
    },
  };
});

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

function startInspection() {
  enableInspection();
  pressSpace();
  releaseSpace();
  expect(timer()).toHaveAttribute("data-status", "inspection");
}

function inspectionSolve(durationMs: number) {
  pressSpace();
  releaseSpace(); // tap starts inspection
  advance(2000);
  pressSpace();
  advance(HOLD_MS);
  releaseSpace(); // hold -> ready -> running
  advance(durationMs);
  fireEvent.keyDown(document.body, { code: "KeyJ", key: "j" });
  fireEvent.keyUp(document.body, { code: "KeyJ", key: "j" });
}

test("clicking +2/DNF after an inspection solve does not restart inspection", () => {
  render(<App />);
  enableInspection();
  inspectionSolve(10000);
  expect(timer()).toHaveAttribute("data-status", "stopped");

  // Pointer interaction on the penalty pill (the real repro — jsdom click
  // alone never fired pointer events, which is why the bug slipped through).
  const plus2 = screen.getByRole("button", { name: "+2" });
  fireEvent.pointerDown(plus2, { isPrimary: true });
  fireEvent.pointerUp(plus2, { isPrimary: true });
  fireEvent.click(plus2);

  expect(timer()).toHaveAttribute("data-status", "stopped");
  expect(screen.getByRole("listitem")).toHaveTextContent("12.00 +2");
});

test("inspection can be cancelled with the cancel button (misclick escape)", () => {
  render(<App />);
  startInspection();

  fireEvent.click(screen.getByRole("button", { name: "cancel" }));
  expect(timer()).toHaveAttribute("data-status", "idle");
});

test("Escape also cancels a running inspection", () => {
  render(<App />);
  startInspection();
  fireEvent.keyDown(document.body, { code: "Escape", key: "Escape" });
  expect(timer()).toHaveAttribute("data-status", "idle");
});

test("the running timer shows a single decimal; stopped shows centiseconds", () => {
  render(<App />);
  pressSpace();
  advance(HOLD_MS);
  releaseSpace();
  advance(1234);
  expect(timer()).toHaveAttribute("data-status", "running");
  expect(timer().textContent).toBe("1.2");

  fireEvent.keyDown(document.body, { code: "KeyJ", key: "j" });
  fireEvent.keyUp(document.body, { code: "KeyJ", key: "j" });
  expect(timer().textContent).toBe("1.23");
});

test("the topbar inspection chip toggles inspection in one click", () => {
  render(<App />);
  const chip = () => screen.getByRole("button", { name: /^inspection/ });
  expect(chip()).toHaveAccessibleName("inspection off");
  expect(chip()).toHaveAttribute("aria-pressed", "false");

  // One click flips inspection on — no dialog is opened.
  fireEvent.click(chip());
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(chip()).toHaveAccessibleName("inspection 15s");
  expect(chip()).toHaveAttribute("aria-pressed", "true");

  // ...and it now governs the timer: a quick tap starts the countdown.
  pressSpace();
  releaseSpace();
  expect(timer()).toHaveAttribute("data-status", "inspection");

  // Cancel out, then a second click flips it back off.
  fireEvent.keyDown(document.body, { code: "Escape", key: "Escape" });
  fireEvent.click(chip());
  expect(chip()).toHaveAccessibleName("inspection off");
});

test("Show solution opens a modal with the CFOP breakdown and cube playback", () => {
  render(<App />);

  // Rail preview shows only the scramble (no solution alg); no modal yet.
  expect(screen.getByTestId("twisty")).toHaveAttribute("data-alg", "");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Show solution" }));

  // The modal opens with labeled stages + total move count.
  const dialog = screen.getByRole("dialog", { name: "Example solve" });
  expect(within(dialog).getByText("36 STM")).toBeInTheDocument();
  expect(within(dialog).getByText("Cross (white)")).toBeInTheDocument();
  expect(within(dialog).getByText("OLL 27")).toBeInTheDocument();
  expect(within(dialog).getByText("T-perm")).toBeInTheDocument();

  // The verified solution alg is loaded onto the modal's cube for playback.
  expect(
    within(dialog).getByTestId("twisty").getAttribute("data-alg") ?? "",
  ).toMatch(/^z2/);

  // Closing returns to the rail launcher, now offering to reopen.
  fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "View solve" })).toBeInTheDocument();
});
