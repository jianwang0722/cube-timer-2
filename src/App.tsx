import { useEffect, useMemo, useState } from "react";
import { Alg } from "cubing/alg";
import {
  ProgressionChart,
  ScrambleDisplay,
  SettingsDialog,
  SolutionModal,
  SolutionPanel,
  SolvePanel,
  StatsPanel,
  TimerDisplay,
  TopBar,
  TwistyViewer,
} from "./components";
import { useScramble } from "./scramble";
import { solutionAlg, useSolution } from "./solver";
import { useSettings } from "./settings";
import { useSessions } from "./stats";
import { beep } from "./timer/beep";
import {
  isEditableTarget,
  useTimer,
  type SolveResult,
  type TimerState,
} from "./timer";
import "./App.css";

type Phase = "idle" | "armed" | "inspection" | "running";

function phaseOf(state: TimerState): Phase {
  switch (state.status) {
    case "running":
      return "running";
    case "inspection":
    case "inspectionArmed":
      return "inspection";
    case "ready":
      return state.inspectionStartedAt !== undefined ? "inspection" : "armed";
    case "armed":
      return "armed";
    default:
      return "idle";
  }
}

function App() {
  const { settings, update } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(true);
  const [solveModalOpen, setSolveModalOpen] = useState(false);
  const { scramble, advance } = useScramble();
  const {
    sessions,
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
  } = useSessions();

  const onSolve = (result: SolveResult) => {
    addSolve(result, scramble?.toString() ?? "");
    advance();
  };

  const { state, displayMs, inspectionElapsedMs, surfaceProps, cancel } = useTimer({
    inspectionEnabled: settings.inspectionEnabled,
    holdMs: settings.holdMs,
    onSolve,
    onInspectionWarning: (kind) => {
      if (settings.inspectionSound) beep(kind === "8s" ? 880 : 1175);
    },
  });

  const lastSolve = currentSession.solves.at(-1);
  const isPb = pbFlags.single;

  // On-demand CFOP example solve for the current scramble; the verified alg
  // feeds the shared 3D preview for playback.
  const solutionView = useSolution(scramble);
  const solutionAlgObj = useMemo(
    () =>
      solutionView.solution
        ? new Alg(solutionAlg(solutionView.solution))
        : undefined,
    [solutionView.solution],
  );

  // Hotkey N: new scramble, only between attempts and outside menus/dialogs.
  const canRescramble =
    (state.status === "idle" || state.status === "stopped") &&
    !settingsOpen &&
    !menuOpen;
  useEffect(() => {
    if (!canRescramble) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isEditableTarget(e.target)) return;
      if (document.querySelector("dialog[open]")) return;
      if (e.key === "n" || e.key === "N") advance();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canRescramble, advance]);

  return (
    <div className="app" data-phase={phaseOf(state)}>
      <div className="app__topbar chrome">
        <TopBar
          sessions={sessions}
          currentSession={currentSession}
          onSwitch={switchSession}
          onCreate={createSession}
          onRename={renameSession}
          onDelete={deleteSession}
          onExport={exportSession}
          onImport={importSession}
          onOpenSettings={() => setSettingsOpen(true)}
          onMenuOpenChange={setMenuOpen}
          inspectionEnabled={settings.inspectionEnabled}
          onToggleInspection={() =>
            update({ inspectionEnabled: !settings.inspectionEnabled })
          }
        />
      </div>

      <div className="app__scramble chrome">
        <ScrambleDisplay
          scramble={scramble}
          onNew={advance}
          solveIndex={currentSession.solves.length + 1}
        />
      </div>

      <div className="app__timer" {...surfaceProps}>
        <TimerDisplay
          state={state}
          displayMs={displayMs}
          inspectionElapsedMs={inspectionElapsedMs}
          lastSolve={lastSolve}
          isPb={isPb}
          prevBestSingle={prevBestSingle}
          onSetPenalty={setPenalty}
          onCancelInspection={cancel}
        />
      </div>

      <aside className="app__rail chrome">
        <section className="rail-section" aria-label="Preview">
          <div className="rail-section__header">
            <span className="ui-label">preview</span>
            <button
              type="button"
              onClick={() => update({ showPreview: !settings.showPreview })}
            >
              {settings.showPreview ? "collapse ▴" : "expand ▾"}
            </button>
          </div>
          {settings.showPreview && <TwistyViewer scramble={scramble} />}
        </section>

        <SolutionPanel
          status={solutionView.status}
          solution={solutionView.solution}
          disabled={scramble === null}
          onOpen={() => {
            solutionView.reveal();
            setSolveModalOpen(true);
          }}
        />

        <SolvePanel
          solves={currentSession.solves}
          onSetPenalty={setPenalty}
          onDelete={deleteSolve}
        />

        <section
          className="rail-section rail-section--chart"
          aria-label="Progression"
        >
          <div className="rail-section__header">
            <span className="ui-label">progression</span>
            <button type="button" onClick={() => setChartOpen((o) => !o)}>
              {chartOpen ? "collapse ▴" : "expand ▾"}
            </button>
          </div>
          {chartOpen && <ProgressionChart solves={currentSession.solves} />}
        </section>
      </aside>

      <div className="app__stats chrome">
        <StatsPanel stats={stats} pbFlags={pbFlags} />
      </div>

      <SolutionModal
        open={solveModalOpen}
        status={solutionView.status}
        solution={solutionView.solution}
        scramble={scramble}
        alg={solutionAlgObj}
        onClose={() => setSolveModalOpen(false)}
      />

      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        onUpdate={update}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
