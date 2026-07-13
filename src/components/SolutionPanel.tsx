import type { Solution, SolutionStatus } from "../solver";
import "./SolutionPanel.css";

interface SolutionPanelProps {
  status: SolutionStatus;
  solution: Solution | null;
  onReveal: () => void;
  /** No scramble to solve yet (still generating). */
  disabled?: boolean;
}

/**
 * The CFOP example solve, revealed on demand. Each stage is labeled with its
 * move string and turn count; playback happens on the shared 3D preview using
 * the twisty-player's own control bar.
 */
export function SolutionPanel({
  status,
  solution,
  onReveal,
  disabled,
}: SolutionPanelProps) {
  return (
    <section className="rail-section solution-panel" aria-label="Example solve">
      <div className="rail-section__header">
        <span className="ui-label">example solve</span>
        {status === "ready" && solution && (
          <span className="solution-panel__total">{solution.totalMoves} STM</span>
        )}
      </div>

      {status === "idle" && (
        <button
          type="button"
          className="solution-panel__reveal"
          onClick={onReveal}
          disabled={disabled}
        >
          Show solution
        </button>
      )}

      {status === "loading" && (
        <p className="solution-panel__note">solving…</p>
      )}

      {status === "error" && (
        <p className="solution-panel__error" role="alert">
          couldn’t generate a valid solve
        </p>
      )}

      {status === "ready" && solution && (
        <>
          <ol className="solution-panel__stages">
            {solution.stages.map((stage) => (
              <li
                key={stage.name}
                className="solution-panel__stage"
                data-skip={stage.moveCount === 0 || undefined}
              >
                <span className="solution-panel__annotation">
                  {stage.annotation}
                </span>
                <span className="solution-panel__moves">
                  {stage.moves || "—"}
                </span>
                <span className="solution-panel__count">{stage.moveCount}</span>
              </li>
            ))}
          </ol>
          <p className="solution-panel__hint">▶ play on the preview above</p>
        </>
      )}
    </section>
  );
}
