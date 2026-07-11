import { useEffect, useState } from "react";
import {
  ScrambleDisplay,
  SolvePanel,
  TimerDisplay,
  TwistyViewer,
} from "./components";
import { useScramble } from "./scramble";
import {
  isEditableTarget,
  useTimer,
  type Penalty,
  type Solve,
  type SolveResult,
} from "./timer";
import "./App.css";

function App() {
  const [inspectionEnabled, setInspectionEnabled] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [solves, setSolves] = useState<Solve[]>([]);
  const { scramble, advance } = useScramble();

  const addSolve = ({ timeMs, penalty }: SolveResult) => {
    setSolves((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        timeMs,
        penalty,
        scramble: scramble?.toString() ?? "",
        date: Date.now(),
        sessionId: "", // interim: replaced by useSessions later in Phase 3

      },
    ]);
    advance();
  };

  const setPenalty = (id: string, penalty: Penalty) => {
    setSolves((prev) => prev.map((s) => (s.id === id ? { ...s, penalty } : s)));
  };

  const deleteSolve = (id: string) => {
    setSolves((prev) => prev.filter((s) => s.id !== id));
  };

  const { state, displayMs, inspectionElapsedMs, surfaceProps } = useTimer({
    inspectionEnabled,
    onSolve: addSolve,
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
          <SolvePanel
            solves={solves}
            onSetPenalty={setPenalty}
            onDelete={deleteSolve}
          />
        </aside>
      </div>
    </main>
  );
}

export default App;
