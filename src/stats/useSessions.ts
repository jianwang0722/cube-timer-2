import { useCallback, useEffect, useMemo, useState } from "react";
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
  type PersistedData,
  type Session,
  type SessionStore,
} from "./storage";

function makeSession(name: string): Session {
  return { id: crypto.randomUUID(), name, createdAt: Date.now(), solves: [] };
}

function defaultData(): PersistedData {
  const session = makeSession("Session 1");
  return { version: 1, sessions: [session], currentSessionId: session.id };
}

export interface UseSessionsResult {
  sessions: Session[];
  currentSession: Session;
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
    const session = makeSession(name.trim() || "New session");
    setData((prev) => ({
      ...prev,
      sessions: [...prev.sessions, session],
      currentSessionId: session.id,
    }));
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
      const remaining = prev.sessions.filter((s) => s.id !== sessionId);
      // Never end up with zero sessions.
      const sessions =
        remaining.length > 0 ? remaining : [makeSession("Session 1")];
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
    exportSession,
    importSession,
  };
}
