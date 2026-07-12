import { act, fireEvent, render, screen } from "@testing-library/react";
import { Alg } from "cubing/alg";
import { expect, test, vi } from "vitest";
import { ScrambleDisplay } from "./ScrambleDisplay";

test("shows a placeholder with copy disabled while generating", () => {
  render(<ScrambleDisplay scramble={null} onNew={() => {}} solveIndex={1} />);
  expect(screen.getByText("generating scramble…")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "copy" })).toBeDisabled();
});

test("shows the scramble text, move count, and copies to the clipboard", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

  render(
    <ScrambleDisplay
      scramble={new Alg("R U R' U'")}
      onNew={() => {}}
      solveIndex={48}
    />,
  );
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
  render(
    <ScrambleDisplay
      scramble={new Alg("R U R' U'")}
      onNew={onNew}
      solveIndex={2}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "new" }));
  expect(onNew).toHaveBeenCalledTimes(1);
});
