import { useEffect, useState } from "react";
import {
  ProgressionChart,
  ScrambleDisplay,
  SessionBar,
  SolvePanel,
  StatsPanel,
  TimerDisplay,
  TwistyViewer,
} from "./components";
import { useScramble } from "./scramble";
import { useSessions } from "./stats";
import { isEditableTarget, useTimer, type SolveResult } from "./timer";
import "./App.css";

function App() {
  const [inspectionEnabled, setInspectionEnabled] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const { scramble, advance } = useScramble();
  const {
    sessions,
    currentSession,
    stats,
    pbFlags,
    addSolve,
    setPenalty,
    deleteSolve,
    createSession,
    renameSession,
    deleteSession,
    switchSession,
    exportSession,
    importSession,
  } = useSessions();

  const onSolve = (result: SolveResult) => {
    addSolve(result, scramble?.toString() ?? "");
    advance();
  };

  const { state, displayMs, inspectionElapsedMs, surfaceProps } = useTimer({
    inspectionEnabled,
    onSolve,
  });

  // Hotkey N: new scramble, only between attempts (never mid-inspection/solve).
  const canRescramble = state.status === "idle" || state.status === "stopped";
  useEffect(() => {
    if (!canRescramble) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isEditableTarget(e.target)) return;
      if (e.key === "n" || e.key === "N") advance();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canRescramble, advance]);

  return (
    <main>
      <ScrambleDisplay scramble={scramble} onNew={advance} />
      <div className="content">
        <div className="timer-surface" {...surfaceProps}>
          <TimerDisplay
            state={state}
            displayMs={displayMs}
            inspectionElapsedMs={inspectionElapsedMs}
          />
        </div>
        <aside className="side-panel">
          <SessionBar
            sessions={sessions}
            currentSession={currentSession}
            onSwitch={switchSession}
            onCreate={createSession}
            onRename={renameSession}
            onDelete={deleteSession}
            onExport={exportSession}
            onImport={importSession}
          />
          <label>
            <input
              type="checkbox"
              checked={inspectionEnabled}
              onChange={(e) => setInspectionEnabled(e.target.checked)}
            />
            15s inspection
          </label>
          <label>
            <input
              type="checkbox"
              checked={showPreview}
              onChange={(e) => setShowPreview(e.target.checked)}
            />
            3D preview
          </label>
          {showPreview && <TwistyViewer scramble={scramble} />}
          <StatsPanel stats={stats} pbFlags={pbFlags} />
          <ProgressionChart solves={currentSession.solves} />
          <SolvePanel
            solves={currentSession.solves}
            onSetPenalty={setPenalty}
            onDelete={deleteSolve}
          />
        </aside>
      </div>
    </main>
  );
}

export default App;
