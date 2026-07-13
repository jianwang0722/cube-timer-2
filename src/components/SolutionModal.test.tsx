import { fireEvent, render, screen, within } from "@testing-library/react";
import { Alg } from "cubing/alg";
import { expect, test, vi } from "vitest";
import type { Solution } from "../solver";
import { SolutionModal } from "./SolutionModal";

// The real cube needs cubing/twisty + WebGL; assert on the props instead.
vi.mock("./TwistyViewer", () => ({
  TwistyViewer: ({ scramble, alg }: { scramble: Alg | null; alg?: Alg }) => (
    <div
      data-testid="twisty"
      data-scramble={scramble?.toString() ?? ""}
      data-alg={alg?.toString() ?? ""}
    />
  ),
}));

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

const base = {
  scramble: new Alg("R U R' U'"),
  alg: new Alg("z2 F R U R' U'"),
  onClose: () => {},
};

test("renders nothing when closed", () => {
  render(
    <SolutionModal open={false} status="ready" solution={SOLUTION} {...base} />,
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("loading shows a solving note without cube or stages", () => {
  render(<SolutionModal open status="loading" solution={null} {...base} />);
  expect(screen.getByText("solving…")).toBeInTheDocument();
  expect(screen.queryByTestId("twisty")).not.toBeInTheDocument();
  expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
});

test("error shows an alert instead of a solution", () => {
  render(<SolutionModal open status="error" solution={null} {...base} />);
  expect(screen.getByRole("alert")).toHaveTextContent(
    /couldn.t generate a valid solve/,
  );
  expect(screen.queryByTestId("twisty")).not.toBeInTheDocument();
});

test("ready shows the cube, every stage, total, and a marked skip row", () => {
  render(<SolutionModal open status="ready" solution={SOLUTION} {...base} />);

  expect(screen.getByText("25 STM")).toBeInTheDocument();
  expect(screen.getAllByRole("listitem")).toHaveLength(7);
  expect(screen.getByText("Cross (white)")).toBeInTheDocument();
  expect(screen.getByText("T-perm")).toBeInTheDocument();

  // The solution alg is loaded onto the modal's cube for playback.
  expect(screen.getByTestId("twisty").getAttribute("data-alg")).toMatch(/^z2 /);

  const skip = screen.getByText("F2L pair 3").closest("li")!;
  expect(skip).toHaveAttribute("data-skip");
  expect(within(skip).getByText("—")).toBeInTheDocument();
});

test("the close button fires onClose", () => {
  const onClose = vi.fn();
  render(
    <SolutionModal
      open
      status="ready"
      solution={SOLUTION}
      {...base}
      onClose={onClose}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(onClose).toHaveBeenCalledOnce();
});
