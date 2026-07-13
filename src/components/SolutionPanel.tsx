import type { Solution, SolutionStatus } from "../solver";
import "./SolutionPanel.css";

interface SolutionPanelProps {
  status: SolutionStatus;
  solution: Solution | null;
  /** Reveal (if needed) and open the example-solve modal. */
  onOpen: () => void;
  /** No scramble to solve yet (still generating). */
  disabled?: boolean;
}

/**
 * Rail launcher for the CFOP example solve. The solve itself — cube playback
 * and the labeled step breakdown — lives in {@link SolutionModal}; this is just
 * the on-demand entry point (spoiler-safe until opened).
 */
export function SolutionPanel({
  status,
  solution,
  onOpen,
  disabled,
}: SolutionPanelProps) {
  const label =
    status === "ready"
      ? "View solve"
      : status === "loading"
        ? "solving…"
        : "Show solution";

  return (
    <section className="rail-section solution-panel" aria-label="Example solve">
      <div className="rail-section__header">
        <span className="ui-label">example solve</span>
        {status === "ready" && solution && (
          <span className="solution-panel__total">{solution.totalMoves} STM</span>
        )}
      </div>
      <button
        type="button"
        className="solution-panel__reveal"
        onClick={onOpen}
        disabled={disabled || status === "loading"}
      >
        {label}
      </button>
      {status === "error" && (
        <p className="solution-panel__error" role="alert">
          couldn’t generate a valid solve
        </p>
      )}
    </section>
  );
}
