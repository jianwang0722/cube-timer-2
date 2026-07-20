import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_EVENT, type EventId } from "../events";
import type { Penalty, SolveResult } from "../timer";
import type { StatResult } from "./average";
import {
  computePbFlags,
  computeStats,
  type PbFlags,
  type SessionStats,
} from "./stats";
import {
  isSession,
  localStorageStore,
  sessionEvent,
  type PersistedData,
  type Session,
  type SessionStore,
} from "./storage";

function makeSession(name: string, event: EventId): Session {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    solves: [],
    event,
  };
}

/** Most recent activity, for picking which session of an event to resume. */
function lastActivity(s: Session): number {
  return s.solves.at(-1)?.date ?? s.createdAt;
}

function defaultData(): PersistedData {
  const session = makeSession("Session 1", DEFAULT_EVENT);
  return { version: 1, sessions: [session], currentSessionId: session.id };
}

export interface UseSessionsResult {
  sessions: Session[];
  currentSession: Session;
  /** The current session's WCA event (legacy sessions default to 3x3). */
  currentEvent: EventId;
  stats: SessionStats;
  pbFlags: PbFlags;
  /** Best single before the latest solve (for the PB delta line). */
  prevBestSingle: StatResult;
  addSolve: (result: SolveResult, scramble: string) => void;
  setPenalty: (solveId: string, penalty: Penalty) => void;
  deleteSolve: (solveId: string) => void;
  createSession: (name: string) => void;
  renameSession: (sessionId: string, name: string) => void;
  deleteSession: (sessionId: string) => void;
  switchSession: (sessionId: string) => void;
  /** Jump to the most recent session of an event, creating one if none exists. */
  switchEvent: (event: EventId) => void;
  exportSession: () => string;
  importSession: (json: string) => boolean;
}

export function useSessions(
  store: SessionStore = localStorageStore,
): UseSessionsResult {
  const [data, setData] = useState<PersistedData>(
    () => store.load() ?? defaultData(),
  );

  useEffect(() => {
    store.save(data);
  }, [store, data]);

  const currentSession =
    data.sessions.find((s) => s.id === data.currentSessionId) ??
    data.sessions[0];
  const currentEvent = sessionEvent(currentSession);

  const updateSession = useCallback(
    (sessionId: string, fn: (s: Session) => Session) => {
      setData((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) => (s.id === sessionId ? fn(s) : s)),
      }));
    },
    [],
  );

  const addSolve = useCallback(
    ({ timeMs, penalty }: SolveResult, scramble: string) => {
      setData((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) =>
          s.id === prev.currentSessionId
            ? {
                ...s,
                solves: [
                  ...s.solves,
                  {
                    id: crypto.randomUUID(),
                    timeMs,
                    penalty,
                    scramble,
                    date: Date.now(),
                    sessionId: s.id,
                  },
                ],
              }
            : s,
        ),
      }));
    },
    [],
  );

  const setPenalty = useCallback(
    (solveId: string, penalty: Penalty) => {
      updateSession(currentSession.id, (s) => ({
        ...s,
        solves: s.solves.map((solve) =>
          solve.id === solveId ? { ...solve, penalty } : solve,
        ),
      }));
    },
    [updateSession, currentSession.id],
  );

  const deleteSolve = useCallback(
    (solveId: string) => {
      updateSession(currentSession.id, (s) => ({
        ...s,
        solves: s.solves.filter((solve) => solve.id !== solveId),
      }));
    },
    [updateSession, currentSession.id],
  );

  const createSession = useCallback((name: string) => {
    setData((prev) => {
      const current =
        prev.sessions.find((s) => s.id === prev.currentSessionId) ??
        prev.sessions[0];
      const session = makeSession(
        name.trim() || "New session",
        sessionEvent(current),
      );
      return {
        ...prev,
        sessions: [...prev.sessions, session],
        currentSessionId: session.id,
      };
    });
  }, []);

  const renameSession = useCallback(
    (sessionId: string, name: string) => {
      if (!name.trim()) return;
      updateSession(sessionId, (s) => ({ ...s, name: name.trim() }));
    },
    [updateSession],
  );

  const deleteSession = useCallback((sessionId: string) => {
    setData((prev) => {
      const current =
        prev.sessions.find((s) => s.id === prev.currentSessionId) ??
        prev.sessions[0];
      const remaining = prev.sessions.filter((s) => s.id !== sessionId);
      // Never end up with zero sessions; a fresh fallback keeps the current
      // event (deleting your only 4x4 session shouldn't flip you to 3x3).
      const sessions =
        remaining.length > 0
          ? remaining
          : [makeSession("Session 1", sessionEvent(current))];
      const currentSessionId = sessions.some(
        (s) => s.id === prev.currentSessionId,
      )
        ? prev.currentSessionId
        : sessions[0].id;
      return { ...prev, sessions, currentSessionId };
    });
  }, []);

  const switchSession = useCallback((sessionId: string) => {
    setData((prev) =>
      prev.sessions.some((s) => s.id === sessionId)
        ? { ...prev, currentSessionId: sessionId }
        : prev,
    );
  }, []);

  const switchEvent = useCallback((event: EventId) => {
    setData((prev) => {
      const current =
        prev.sessions.find((s) => s.id === prev.currentSessionId) ??
        prev.sessions[0];
      if (sessionEvent(current) === event) return prev;
      // Resume the most recently active session of that event; ties resolve
      // to the one later in the list.
      const candidates = prev.sessions.filter((s) => sessionEvent(s) === event);
      if (candidates.length > 0) {
        const best = candidates.reduce((a, b) =>
          lastActivity(b) >= lastActivity(a) ? b : a,
        );
        return { ...prev, currentSessionId: best.id };
      }
      // No session for this event yet — create one.
      const session = makeSession(`Session ${prev.sessions.length + 1}`, event);
      return {
        ...prev,
        sessions: [...prev.sessions, session],
        currentSessionId: session.id,
      };
    });
  }, []);

  const exportSession = useCallback(
    () => JSON.stringify({ version: 1, session: currentSession }, null, 2),
    [currentSession],
  );

  const importSession = useCallback((json: string): boolean => {
    let session: Session;
    try {
      const parsed: unknown = JSON.parse(json);
      const candidate =
        typeof parsed === "object" && parsed !== null && "session" in parsed
          ? (parsed as { session: unknown }).session
          : parsed;
      if (!isSession(candidate)) return false;
      session = candidate;
    } catch {
      return false;
    }
    // Fresh identity to avoid collisions with existing sessions.
    const id = crypto.randomUUID();
    const imported: Session = {
      ...session,
      id,
      solves: session.solves.map((solve) => ({ ...solve, sessionId: id })),
    };
    setData((prev) => ({
      ...prev,
      sessions: [...prev.sessions, imported],
      currentSessionId: id,
    }));
    return true;
  }, []);

  const stats = useMemo(
    () => computeStats(currentSession.solves),
    [currentSession.solves],
  );
  const pbFlags = useMemo(
    () => computePbFlags(currentSession.solves),
    [currentSession.solves],
  );
  const prevBestSingle = useMemo(
    () => computeStats(currentSession.solves.slice(0, -1)).single.best,
    [currentSession.solves],
  );

  return {
    sessions: data.sessions,
    currentSession,
    currentEvent,
    stats,
    pbFlags,
    prevBestSingle,
    addSolve,
    setPenalty,
    deleteSolve,
    createSession,
    renameSession,
    deleteSession,
    switchSession,
    switchEvent,
    exportSession,
    importSession,
  };
}
