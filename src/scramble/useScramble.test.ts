import { act, renderHook, waitFor } from "@testing-library/react";
import { Alg } from "cubing/alg";
import { beforeEach, expect, test, vi } from "vitest";
import { useScramble } from "./useScramble";

const { nextScrambleMock, warmUpMock } = vi.hoisted(() => ({
  nextScrambleMock: vi.fn(),
  warmUpMock: vi.fn(),
}));

vi.mock("./scramble", () => ({
  nextScramble: nextScrambleMock,
  warmUp: warmUpMock,
}));

const FAKES = ["R U", "L D", "F B"];

beforeEach(() => {
  vi.clearAllMocks();
  let n = 0;
  nextScrambleMock.mockImplementation(() =>
    Promise.resolve(new Alg(FAKES[n++ % FAKES.length])),
  );
});

test("loads the first scramble and warms up the queue", async () => {
  const { result } = renderHook(() => useScramble());
  expect(result.current.scramble).toBeNull();
  await waitFor(() => expect(result.current.scramble).not.toBeNull());
  expect(result.current.scramble?.toString()).toBe("R U");
  expect(warmUpMock).toHaveBeenCalled();
});

test("advance swaps to the next scramble", async () => {
  const { result } = renderHook(() => useScramble());
  await waitFor(() => expect(result.current.scramble).not.toBeNull());

  act(() => result.current.advance());
  expect(result.current.scramble).toBeNull();
  await waitFor(() => expect(result.current.scramble).not.toBeNull());
  expect(result.current.scramble?.toString()).toBe("L D");
});

test("a slow superseded request never overwrites a newer scramble", async () => {
  let resolveSlow: (a: Alg) => void;
  nextScrambleMock
    .mockImplementationOnce(
      () => new Promise<Alg>((r) => (resolveSlow = r)), // first request: slow
    )
    .mockImplementationOnce(() => Promise.resolve(new Alg("F2")));

  const { result } = renderHook(() => useScramble());
  act(() => result.current.advance()); // supersedes the slow initial request
  await waitFor(() => expect(result.current.scramble?.toString()).toBe("F2"));

  act(() => resolveSlow(new Alg("B2"))); // stale resolution arrives late
  await waitFor(() => expect(result.current.scramble?.toString()).toBe("F2"));
});
