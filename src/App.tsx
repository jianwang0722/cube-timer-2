import { useEffect, useState } from "react";
import { SolvePanel, TimerDisplay } from "./components";
import { useTimer, type Penalty, type Solve, type SolveResult } from "./timer";
import "./App.css";

function App() {
  const [inspectionEnabled, setInspectionEnabled] = useState(false);
  const [solves, setSolves] = useState<Solve[]>([]);

  const addSolve = ({ timeMs, penalty }: SolveResult) => {
    setSolves((prev) => [
      ...prev,
      { id: crypto.randomUUID(), timeMs, penalty, date: Date.now() },
    ]);
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

  // Throwaway Phase 0 check: proves random-state scramble generation works in
  // the browser. Replaced by src/scramble/ in Phase 2.
  useEffect(() => {
    if (import.meta.env.MODE === "test") return;
    void (async () => {
      const { randomScrambleForEvent } = await import("cubing/scramble");
      const scramble = await randomScrambleForEvent("333");
      console.log("Random-state 3x3 scramble:", scramble.toString());
    })();
  }, []);

  return (
    <main>
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
        <SolvePanel
          solves={solves}
          onSetPenalty={setPenalty}
          onDelete={deleteSolve}
        />
      </aside>
    </main>
  );
}

export default App;
