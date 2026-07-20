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

  act(() =>
    result.current.renameSession(
      result.current.currentSession.id,
      "One-handed",
    ),
  );
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

test("the default session and legacy sessions read as 3x3", () => {
  const store = memoryStore({
    version: 1,
    currentSessionId: "legacy",
    // No event field — a pre-multi-event session.
    sessions: [{ id: "legacy", name: "Old", createdAt: 1, solves: [] }],
  });
  const { result } = renderHook(() => useSessions(store));
  expect(result.current.currentEvent).toBe("333");
});

test("createSession inherits the current session's event", () => {
  const store = memoryStore();
  const { result } = renderHook(() => useSessions(store));
  act(() => result.current.switchEvent("444")); // now on a 4x4 session
  act(() => result.current.createSession("More 4x4"));
  expect(result.current.currentSession.name).toBe("More 4x4");
  expect(result.current.currentEvent).toBe("444");
});

test("switchEvent resumes the most recently active session of that event", () => {
  const store = memoryStore({
    version: 1,
    currentSessionId: "main",
    sessions: [
      { id: "main", name: "Session 1", createdAt: 1, solves: [], event: "333" },
      {
        id: "old444",
        name: "Old 4x4",
        createdAt: 10,
        event: "444",
        solves: [
          {
            id: "x",
            timeMs: 5000,
            penalty: "OK",
            scramble: "",
            date: 9000,
            sessionId: "old444",
          },
        ],
      },
      // Newer by creation but never used — should NOT win over old444.
      {
        id: "new444",
        name: "New 4x4",
        createdAt: 20,
        solves: [],
        event: "444",
      },
    ],
  });
  const { result } = renderHook(() => useSessions(store));
  act(() => result.current.switchEvent("444"));
  expect(result.current.currentSession.id).toBe("old444");
  expect(result.current.currentEvent).toBe("444");
});

test("switchEvent auto-creates a session when the event has none", () => {
  const store = memoryStore();
  const { result } = renderHook(() => useSessions(store));
  act(() => result.current.switchEvent("222"));
  expect(result.current.sessions).toHaveLength(2);
  expect(result.current.currentSession.name).toBe("Session 2");
  expect(result.current.currentEvent).toBe("222");
});

test("switchEvent to the current event does nothing", () => {
  const store = memoryStore();
  const { result } = renderHook(() => useSessions(store));
  const before = result.current.currentSession.id;
  act(() => result.current.switchEvent("333"));
  expect(result.current.sessions).toHaveLength(1);
  expect(result.current.currentSession.id).toBe(before);
});

test("deleting the only session keeps its event", () => {
  const store = memoryStore({
    version: 1,
    currentSessionId: "only",
    sessions: [
      { id: "only", name: "4x4", createdAt: 1, solves: [], event: "444" },
    ],
  });
  const { result } = renderHook(() => useSessions(store));
  act(() => result.current.deleteSession("only"));
  expect(result.current.sessions).toHaveLength(1);
  expect(result.current.currentEvent).toBe("444");
});

test("deleting the current session falls back and the event follows", () => {
  const store = memoryStore({
    version: 1,
    currentSessionId: "s444",
    sessions: [
      { id: "s333", name: "3x3", createdAt: 1, solves: [], event: "333" },
      { id: "s444", name: "4x4", createdAt: 2, solves: [], event: "444" },
    ],
  });
  const { result } = renderHook(() => useSessions(store));
  act(() => result.current.deleteSession("s444"));
  expect(result.current.currentSession.id).toBe("s333");
  expect(result.current.currentEvent).toBe("333");
});

test("export carries the event and importing switches to it", () => {
  const store = memoryStore();
  const { result } = renderHook(() => useSessions(store));
  act(() => result.current.switchEvent("444"));
  const exported = result.current.exportSession();
  expect(JSON.parse(exported).session.event).toBe("444");

  const store2 = memoryStore();
  const two = renderHook(() => useSessions(store2));
  expect(two.result.current.currentEvent).toBe("333");
  act(() => {
    two.result.current.importSession(exported);
  });
  expect(two.result.current.currentEvent).toBe("444");
});

test("importing a legacy session without an event defaults to 3x3", () => {
  const store = memoryStore();
  const { result } = renderHook(() => useSessions(store));
  const legacy = JSON.stringify({
    version: 1,
    session: { id: "leg", name: "Legacy", createdAt: 1, solves: [] },
  });
  act(() => {
    result.current.importSession(legacy);
  });
  expect(result.current.currentSession.name).toBe("Legacy");
  expect(result.current.currentEvent).toBe("333");
});
