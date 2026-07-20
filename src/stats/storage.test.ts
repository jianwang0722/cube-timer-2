import { afterEach, expect, test } from "vitest";
import type { Solve } from "../timer";
import {
  localStorageStore,
  parsePersisted,
  sessionEvent,
  STORAGE_KEY,
  type PersistedData,
} from "./storage";

afterEach(() => {
  localStorage.clear();
});

function solve(overrides: Partial<Solve> = {}): Solve {
  return {
    id: "s1",
    timeMs: 12340,
    penalty: "OK",
    scramble: "R U R' U'",
    date: 1700000000000,
    sessionId: "a",
    ...overrides,
  };
}

const data: PersistedData = {
  version: 1,
  currentSessionId: "a",
  sessions: [
    { id: "a", name: "Main", createdAt: 1700000000000, solves: [solve()] },
  ],
};

test("round-trips through localStorage", () => {
  localStorageStore.save(data);
  expect(localStorageStore.load()).toEqual(data);
});

test("missing key loads as null", () => {
  expect(localStorageStore.load()).toBeNull();
});

test("corrupted JSON loads as null", () => {
  localStorage.setItem(STORAGE_KEY, "{not json");
  expect(localStorageStore.load()).toBeNull();
});

test("wrong version or shape loads as null", () => {
  expect(parsePersisted(JSON.stringify({ ...data, version: 2 }))).toBeNull();
  expect(parsePersisted(JSON.stringify({ ...data, sessions: [] }))).toBeNull();
  expect(parsePersisted(JSON.stringify({ hello: "world" }))).toBeNull();
  expect(parsePersisted("null")).toBeNull();
});

test("solves with invalid penalties are rejected", () => {
  const bad = {
    ...data,
    sessions: [
      {
        ...data.sessions[0],
        solves: [{ ...solve(), penalty: "+4" }],
      },
    ],
  };
  expect(parsePersisted(JSON.stringify(bad))).toBeNull();
});

test("a session tagged with an event round-trips", () => {
  const withEvent: PersistedData = {
    ...data,
    sessions: [{ ...data.sessions[0], event: "444" }],
  };
  localStorageStore.save(withEvent);
  expect(localStorageStore.load()).toEqual(withEvent);
});

test("a legacy session without an event still parses as 3x3", () => {
  const parsed = parsePersisted(JSON.stringify(data));
  expect(parsed).not.toBeNull();
  expect(parsed?.sessions[0].event).toBeUndefined();
  expect(sessionEvent(parsed!.sessions[0])).toBe("333");
});

test("a session with an unknown event is rejected", () => {
  const bad = { ...data, sessions: [{ ...data.sessions[0], event: "666" }] };
  expect(parsePersisted(JSON.stringify(bad))).toBeNull();
});

test("sessionEvent defaults absent to 3x3 and passes valid ids through", () => {
  const base = { id: "a", name: "x", createdAt: 0, solves: [] };
  expect(sessionEvent(base)).toBe("333");
  expect(sessionEvent({ ...base, event: "555" })).toBe("555");
});
