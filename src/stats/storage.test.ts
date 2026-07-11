import { afterEach, expect, test } from "vitest";
import type { Solve } from "../timer";
import {
  localStorageStore,
  parsePersisted,
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
  sessions: [{ id: "a", name: "Main", createdAt: 1700000000000, solves: [solve()] }],
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
