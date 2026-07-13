import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { Solution } from "../solver";
import { SolutionPanel } from "./SolutionPanel";

const SOLUTION: Solution = {
  stages: [
    { name: "cross", annotation: "Cross (white)", moves: "z2 F R U", moveCount: 3 },
    { name: "f2l-1", annotation: "F2L pair 1", moves: "U R U' R'", moveCount: 4 },
    { name: "f2l-2", annotation: "F2L pair 2", moves: "y' U' R' U R", moveCount: 4 },
    { name: "f2l-3", annotation: "F2L pair 3", moves: "", moveCount: 0 },
    { name: "f2l-4", annotation: "F2L pair 4", moves: "U R U' R'", moveCount: 4 },
    { name: "oll", annotation: "OLL 27", moves: "R U R' U R U2 R'", moveCount: 7 },
    { name: "pll", annotation: "T-perm", moves: "R U R'", moveCount: 3 },
  ],
  totalMoves: 25,
};

test("idle shows a reveal button that fires onReveal", () => {
  const onReveal = vi.fn();
  render(<SolutionPanel status="idle" solution={null} onReveal={onReveal} />);
  fireEvent.click(screen.getByRole("button", { name: "Show solution" }));
  expect(onReveal).toHaveBeenCalledOnce();
});

test("reveal button is disabled while there is no scramble", () => {
  render(
    <SolutionPanel status="idle" solution={null} onReveal={() => {}} disabled />,
  );
  expect(screen.getByRole("button", { name: "Show solution" })).toBeDisabled();
});

test("loading shows a solving note", () => {
  render(<SolutionPanel status="loading" solution={null} onReveal={() => {}} />);
  expect(screen.getByText("solving…")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("error shows an alert instead of a solution", () => {
  render(<SolutionPanel status="error" solution={null} onReveal={() => {}} />);
  expect(screen.getByRole("alert")).toHaveTextContent(
    /couldn.t generate a valid solve/,
  );
  expect(screen.queryByText("Cross (white)")).not.toBeInTheDocument();
});

test("ready lists every stage with counts, total, and a marked skip row", () => {
  render(<SolutionPanel status="ready" solution={SOLUTION} onReveal={() => {}} />);

  expect(screen.getByText("25 STM")).toBeInTheDocument();
  expect(screen.getByText("Cross (white)")).toBeInTheDocument();
  expect(screen.getByText("OLL 27")).toBeInTheDocument();
  expect(screen.getByText("T-perm")).toBeInTheDocument();
  expect(screen.getAllByRole("listitem")).toHaveLength(7);

  // The empty (already-solved) F2L pair renders as a marked skip row.
  const skipRow = screen.getByText("F2L pair 3").closest("li")!;
  expect(skipRow).toHaveAttribute("data-skip");
  expect(within(skipRow).getByText("—")).toBeInTheDocument();
});
