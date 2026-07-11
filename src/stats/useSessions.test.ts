import { act, renderHook } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { PersistedData, SessionStore } from "./storage";
import { useSessions } from "./useSessions";

function memoryStore(initial: PersistedData | null = null) {
  let data = initial;
  const store: SessionStore & { data: () => PersistedData | null } = {
    load: vi.fn(() => data),
    save: vi.fn((d: PersistedData) => {
      data = d;
    }),
    data: () => data,
  };
  return store;
}

const RESULT = { timeMs: 12340, penalty: "OK" as const };

test("starts with a default session and persists every change", () => {
  const store = memoryStore();
  const { result } = renderHook(() => useSessions(store));
  expect(result.current.sessions).toHaveLength(1);
  expect(result.current.currentSession.name).toBe("Session 1");

  act(() => result.current.addSolve(RESULT, "R U R' U'"));
  const saved = store.data();
  expect(saved?.sessions[0].solves).toHaveLength(1);
  expect(saved?.sessions[0].solves[0]).toMatchObject({
    timeMs: 12340,
    penalty: "OK",
    scramble: "R U R' U'",
    sessionId: result.current.currentSession.id,
  });
});

test("reloads persisted data on mount", () => {
  const store = memoryStore();
  const first = renderHook(() => useSessions(store));
  act(() => first.result.current.addSolve(RESULT, "R U"));
  first.unmount();

  const second = renderHook(() => useSessions(store));
  expect(second.result.current.currentSession.solves).toHaveLength(1);
});

test("edits and deletes solves in the current session", () => {
  const store = memoryStore();
  const { result } = renderHook(() => useSessions(store));
  act(() => result.current.addSolve(RESULT, "R U"));
  const solveId = result.current.currentSession.solves[0].id;

  act(() => result.current.setPenalty(solveId, "+2"));
  expect(result.current.currentSession.solves[0].penalty).toBe("+2");

  act(() => result.current.deleteSolve(solveId));
  expect(result.current.currentSession.solves).toHaveLength(0);
});

test("creates, renames, switches, and deletes sessions", () => {
  const store = memoryStore();
  const { result } = renderHook(() => useSessions(store));
  const firstId = result.current.currentSession.id;
  act(() => result.current.addSolve(RESULT, "R U"));

  act(() => result.current.createSession("OH practice"));
  expect(result.current.currentSession.name).toBe("OH practice");
  expect(result.current.currentSession.solves).toHaveLength(0);

  act(() => result.current.renameSession(result.current.currentSession.id, "One-handed"));
  expect(result.current.currentSession.name).toBe("One-handed");

  act(() => result.current.switchSession(firstId));
  expect(result.current.currentSession.id).toBe(firstId);
  expect(result.current.currentSession.solves).toHaveLength(1);

  act(() => result.current.deleteSession(firstId));
  expect(result.current.sessions.some((s) => s.id === firstId)).toBe(false);
  expect(result.current.currentSession.name).toBe("One-handed");
});

test("deleting the last session leaves a fresh default", () => {
  const store = memoryStore();
  const { result } = renderHook(() => useSessions(store));
  act(() => result.current.deleteSession(result.current.currentSession.id));
  expect(result.current.sessions).toHaveLength(1);
  expect(result.current.currentSession.solves).toHaveLength(0);
});

test("export/import round-trips a session as a new session", () => {
  const store = memoryStore();
  const { result } = renderHook(() => useSessions(store));
  act(() => result.current.addSolve(RESULT, "R U R' U'"));
  const exported = result.current.exportSession();
  const originalId = result.current.currentSession.id;

  let imported = false;
  act(() => {
    imported = result.current.importSession(exported);
  });
  expect(imported).toBe(true);
  expect(result.current.sessions).toHaveLength(2);
  expect(result.current.currentSession.id).not.toBe(originalId);
  expect(result.current.currentSession.solves[0]).toMatchObject({
    timeMs: 12340,
    scramble: "R U R' U'",
    sessionId: result.current.currentSession.id,
  });
});

test("import rejects garbage without changing state", () => {
  const store = memoryStore();
  const { result } = renderHook(() => useSessions(store));
  let outcome = true;
  act(() => {
    outcome = result.current.importSession("{not json");
  });
  expect(outcome).toBe(false);
  act(() => {
    outcome = result.current.importSession(JSON.stringify({ hello: 1 }));
  });
  expect(outcome).toBe(false);
  expect(result.current.sessions).toHaveLength(1);
});

test("stats and PB flags come from the current session", () => {
  const store = memoryStore();
  const { result } = renderHook(() => useSessions(store));
  act(() => result.current.addSolve({ timeMs: 12000, penalty: "OK" }, "a"));
  act(() => result.current.addSolve({ timeMs: 11000, penalty: "OK" }, "b"));
  expect(result.current.stats.single.best).toBe(11000);
  expect(result.current.pbFlags.single).toBe(true);
  act(() => result.current.addSolve({ timeMs: 13000, penalty: "OK" }, "c"));
  expect(result.current.pbFlags.single).toBe(false);
});
