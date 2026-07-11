import { act, fireEvent, render, screen } from "@testing-library/react";
import { Alg } from "cubing/alg";
import { expect, test, vi } from "vitest";
import { ScrambleDisplay } from "./ScrambleDisplay";

test("shows a placeholder with copy disabled while generating", () => {
  render(<ScrambleDisplay scramble={null} onNew={() => {}} />);
  expect(screen.getByText("Generating scramble…")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Copy" })).toBeDisabled();
});

test("shows the scramble text and copies it to the clipboard", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

  render(<ScrambleDisplay scramble={new Alg("R U R' U'")} onNew={() => {}} />);
  expect(screen.getByText("R U R' U'")).toBeInTheDocument();

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
  });
  expect(writeText).toHaveBeenCalledWith("R U R' U'");
  expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument();

  vi.unstubAllGlobals();
});

test("new scramble button calls onNew", () => {
  const onNew = vi.fn();
  render(<ScrambleDisplay scramble={new Alg("R U R' U'")} onNew={onNew} />);
  fireEvent.click(screen.getByRole("button", { name: "New scramble" }));
  expect(onNew).toHaveBeenCalledTimes(1);
});
