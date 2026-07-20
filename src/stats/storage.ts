import { DEFAULT_EVENT, isEventId, type EventId } from "../events";
import type { Solve } from "../timer";

export interface Session {
  id: string;
  name: string;
  createdAt: number;
  solves: Solve[];
  /** WCA event; absent on legacy (pre-multi-event) sessions — see sessionEvent. */
  event?: EventId;
}

/** The session's event, defaulting legacy (untagged) sessions to 3x3. */
export function sessionEvent(session: Session): EventId {
  return session.event ?? DEFAULT_EVENT;
}

export interface PersistedData {
  version: 1;
  sessions: Session[];
  currentSessionId: string;
}

export interface SessionStore {
  load(): PersistedData | null;
  save(data: PersistedData): void;
}

export const STORAGE_KEY = "cubetimer.sessions.v1";

const PENALTIES = new Set(["OK", "+2", "DNF"]);

function isSolve(value: unknown): value is Solve {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.timeMs === "number" &&
    Number.isFinite(s.timeMs) &&
    typeof s.penalty === "string" &&
    PENALTIES.has(s.penalty) &&
    typeof s.scramble === "string" &&
    typeof s.date === "number" &&
    typeof s.sessionId === "string"
  );
}

export function isSession(value: unknown): value is Session {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.name === "string" &&
    typeof s.createdAt === "number" &&
    // Absent event is legacy (defaults to 3x3); present must be a known id.
    (s.event === undefined || isEventId(s.event)) &&
    Array.isArray(s.solves) &&
    s.solves.every(isSolve)
  );
}

function isPersistedData(value: unknown): value is PersistedData {
  if (typeof value !== "object" || value === null) return false;
  const d = value as Record<string, unknown>;
  return (
    d.version === 1 &&
    typeof d.currentSessionId === "string" &&
    Array.isArray(d.sessions) &&
    d.sessions.length > 0 &&
    d.sessions.every(isSession)
  );
}

/** Parse persisted JSON; null for anything malformed. Never throws. */
export function parsePersisted(raw: string | null): PersistedData | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isPersistedData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const localStorageStore: SessionStore = {
  load() {
    try {
      return parsePersisted(localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  },
  save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Quota/privacy-mode failures must never break the timer.
    }
  },
};
