import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { Solution } from "../solver";
import { SolutionPanel } from "./SolutionPanel";

const SOLUTION: Solution = { stages: [], totalMoves: 42 };

test("idle shows a launcher that opens the solve", () => {
  const onOpen = vi.fn();
  render(<SolutionPanel status="idle" solution={null} onOpen={onOpen} />);
  fireEvent.click(screen.getByRole("button", { name: "Show solution" }));
  expect(onOpen).toHaveBeenCalledOnce();
});

test("launcher is disabled while there is no scramble", () => {
  render(
    <SolutionPanel status="idle" solution={null} onOpen={() => {}} disabled />,
  );
  expect(screen.getByRole("button", { name: "Show solution" })).toBeDisabled();
});

test("loading shows a disabled solving button", () => {
  render(<SolutionPanel status="loading" solution={null} onOpen={() => {}} />);
  expect(screen.getByRole("button", { name: "solving…" })).toBeDisabled();
});

test("ready shows the total and a View solve button", () => {
  const onOpen = vi.fn();
  render(<SolutionPanel status="ready" solution={SOLUTION} onOpen={onOpen} />);
  expect(screen.getByText("42 STM")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "View solve" }));
  expect(onOpen).toHaveBeenCalledOnce();
});

test("error surfaces an alert", () => {
  render(<SolutionPanel status="error" solution={null} onOpen={() => {}} />);
  expect(screen.getByRole("alert")).toHaveTextContent(
    /couldn.t generate a valid solve/,
  );
});
