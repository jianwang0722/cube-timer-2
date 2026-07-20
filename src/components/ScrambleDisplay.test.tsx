import { act, fireEvent, render, screen } from "@testing-library/react";
import { Alg } from "cubing/alg";
import { expect, test, vi } from "vitest";
import type { EventId } from "../events";
import { ScrambleDisplay } from "./ScrambleDisplay";

function renderScramble(props: {
  scramble: Alg | null;
  onNew?: () => void;
  solveIndex?: number;
  event?: EventId;
  onEventChange?: (event: EventId) => void;
  eventDisabled?: boolean;
}) {
  return render(
    <ScrambleDisplay
      scramble={props.scramble}
      onNew={props.onNew ?? (() => {})}
      solveIndex={props.solveIndex ?? 1}
      event={props.event ?? "333"}
      onEventChange={props.onEventChange ?? (() => {})}
      eventDisabled={props.eventDisabled}
    />,
  );
}

test("shows a placeholder with copy disabled while generating", () => {
  renderScramble({ scramble: null });
  expect(screen.getByText("generating scramble…")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "copy" })).toBeDisabled();
});

test("shows the scramble text, move count, and copies to the clipboard", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

  renderScramble({ scramble: new Alg("R U R' U'"), solveIndex: 48 });
  expect(screen.getByText("R U R' U'")).toBeInTheDocument();
  expect(screen.getByText("4 moves · #048")).toBeInTheDocument();

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "copy" }));
  });
  expect(writeText).toHaveBeenCalledWith("R U R' U'");
  expect(screen.getByRole("button", { name: "copied" })).toBeInTheDocument();

  vi.unstubAllGlobals();
});

test("new scramble button calls onNew", () => {
  const onNew = vi.fn();
  renderScramble({ scramble: new Alg("R U R' U'"), onNew });
  fireEvent.click(screen.getByRole("button", { name: "new" }));
  expect(onNew).toHaveBeenCalledTimes(1);
});

test("the event picker shows all four events with the current one selected", () => {
  renderScramble({ scramble: new Alg("R U"), event: "444" });
  const picker = screen.getByRole("combobox", { name: "event" });
  expect(picker).toHaveValue("444");
  expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
    "2×2",
    "3×3",
    "4×4",
    "5×5",
  ]);
});

test("changing the picker calls onEventChange with the WCA id", () => {
  const onEventChange = vi.fn();
  renderScramble({ scramble: new Alg("R U"), onEventChange });
  fireEvent.change(screen.getByRole("combobox", { name: "event" }), {
    target: { value: "555" },
  });
  expect(onEventChange).toHaveBeenCalledWith("555");
});

test("the picker is disabled while a solve is in progress", () => {
  renderScramble({ scramble: new Alg("R U"), eventDisabled: true });
  expect(screen.getByRole("combobox", { name: "event" })).toBeDisabled();
});
