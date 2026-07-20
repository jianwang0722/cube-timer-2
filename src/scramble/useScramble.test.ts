import { act, renderHook, waitFor } from "@testing-library/react";
import { Alg } from "cubing/alg";
import { beforeEach, expect, test, vi } from "vitest";
import type { EventId } from "../events";
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

// A stand-in Alg whose toString is an arbitrary tag (event ids aren't valid
// cube notation, so `new Alg("444-scr")` would throw); the hook only ever
// reads the scramble via toString().
const taggedAlg = (tag: string) => ({ toString: () => tag }) as unknown as Alg;

beforeEach(() => {
  vi.clearAllMocks();
  let n = 0;
  nextScrambleMock.mockImplementation(() =>
    Promise.resolve(new Alg(FAKES[n++ % FAKES.length])),
  );
});

test("loads the first scramble and warms up the queue", async () => {
  const { result } = renderHook(() => useScramble("333"));
  expect(result.current.scramble).toBeNull();
  await waitFor(() => expect(result.current.scramble).not.toBeNull());
  expect(result.current.scramble?.toString()).toBe("R U");
  expect(warmUpMock).toHaveBeenCalledWith("333");
});

test("advance swaps to the next scramble", async () => {
  const { result } = renderHook(() => useScramble("333"));
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

  const { result } = renderHook(() => useScramble("333"));
  act(() => result.current.advance()); // supersedes the slow initial request
  await waitFor(() => expect(result.current.scramble?.toString()).toBe("F2"));

  act(() => resolveSlow(new Alg("B2"))); // stale resolution arrives late
  await waitFor(() => expect(result.current.scramble?.toString()).toBe("F2"));
});

test("changing the event nulls the scramble and loads the new event's scramble", async () => {
  nextScrambleMock.mockImplementation((event: EventId) =>
    Promise.resolve(taggedAlg(`${event}-scr`)),
  );
  const { result, rerender } = renderHook(
    ({ event }: { event: EventId }) => useScramble(event),
    { initialProps: { event: "333" as EventId } },
  );
  await waitFor(() =>
    expect(result.current.scramble?.toString()).toBe("333-scr"),
  );

  act(() => rerender({ event: "444" }));
  // Render-time reset: the 333 scramble is gone before the 444 one arrives.
  expect(result.current.scramble).toBeNull();
  await waitFor(() =>
    expect(result.current.scramble?.toString()).toBe("444-scr"),
  );
  expect(warmUpMock).toHaveBeenCalledWith("444");
});

test("a slow resolution from the previous event never lands after a switch", async () => {
  let resolveOld: (a: Alg) => void;
  nextScrambleMock
    .mockImplementationOnce(
      () => new Promise<Alg>((r) => (resolveOld = r)), // 333: never resolves in time
    )
    .mockImplementation((event: EventId) =>
      Promise.resolve(taggedAlg(`${event}-scr`)),
    );

  const { result, rerender } = renderHook(
    ({ event }: { event: EventId }) => useScramble(event),
    { initialProps: { event: "333" as EventId } },
  );
  expect(result.current.scramble).toBeNull(); // 333 request in flight

  act(() => rerender({ event: "444" }));
  await waitFor(() =>
    expect(result.current.scramble?.toString()).toBe("444-scr"),
  );

  act(() => resolveOld(taggedAlg("333-scr"))); // stale event resolution, late
  await waitFor(() =>
    expect(result.current.scramble?.toString()).toBe("444-scr"),
  );
});
