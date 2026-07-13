import { act, renderHook, waitFor } from "@testing-library/react";
import { Alg } from "cubing/alg";
import { expect, test, vi } from "vitest";
import type { Solution } from "./solve";
import { solveVerified } from "./solve";
import { useSolution } from "./useSolution";

vi.mock("./solve", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./solve")>();
  return { ...actual, solveVerified: vi.fn() };
});

const mockSolveVerified = vi.mocked(solveVerified);
const FAKE: Solution = { stages: [], totalMoves: 0 };

test("stays hidden until revealed, then exposes the verified solution", async () => {
  mockSolveVerified.mockResolvedValue({ ok: true, solution: FAKE });
  const { result } = renderHook(() => useSolution(new Alg("R U R' U'")));

  expect(result.current.status).toBe("idle");
  act(() => result.current.reveal());
  await waitFor(() => expect(result.current.status).toBe("ready"));

  expect(result.current.solution).toBe(FAKE);
  expect(mockSolveVerified).toHaveBeenCalledWith("R U R' U'");
});

test("advancing to a new scramble re-hides the solution", async () => {
  mockSolveVerified.mockResolvedValue({ ok: true, solution: FAKE });
  const { result, rerender } = renderHook(({ s }) => useSolution(s), {
    initialProps: { s: new Alg("R U R' U'") },
  });

  act(() => result.current.reveal());
  await waitFor(() => expect(result.current.status).toBe("ready"));

  rerender({ s: new Alg("F B F' B'") });
  expect(result.current.status).toBe("idle");
  expect(result.current.solution).toBeNull();
});

test("a solution that fails verification surfaces as an error", async () => {
  mockSolveVerified.mockResolvedValue({ ok: false, reason: "left unsolved" });
  const { result } = renderHook(() => useSolution(new Alg("R U R' U'")));

  act(() => result.current.reveal());
  await waitFor(() => expect(result.current.status).toBe("error"));
  expect(result.current.reason).toBe("left unsolved");
});
