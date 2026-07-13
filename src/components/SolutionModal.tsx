import type { Alg } from "cubing/alg";
import type { Solution, SolutionStatus } from "../solver";
import { TwistyViewer } from "./TwistyViewer";
import "./SolutionModal.css";

interface SolutionModalProps {
  open: boolean;
  status: SolutionStatus;
  solution: Solution | null;
  /** Scramble state the solve starts from (twisty setup). */
  scramble: Alg | null;
  /** The verified solution alg, played on the modal's cube. */
  alg: Alg | undefined;
  onClose: () => void;
}

/**
 * Focused example-solve view: the 3D cube (with the twisty-player's own
 * play/scrub bar) beside the labeled CFOP stages, each on its own line with
 * per-stage and total STM. Only a harness-verified solution renders here.
 */
export function SolutionModal({
  open,
  status,
  solution,
  scramble,
  alg,
  onClose,
}: SolutionModalProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="solution-modal__backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <dialog open className="solution-modal" aria-label="Example solve">
        <div className="solution-modal__head">
          <span className="ui-label">example solve</span>
          {status === "ready" && solution && (
            <span className="solution-modal__total">
              {solution.totalMoves} STM
            </span>
          )}
          <button
            type="button"
            className="solution-modal__close"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {status === "loading" && (
          <p className="solution-modal__note">solving…</p>
        )}

        {status === "error" && (
          <p className="solution-modal__error" role="alert">
            couldn’t generate a valid solve
          </p>
        )}

        {status === "ready" && solution && (
          <div className="solution-modal__body">
            <div className="solution-modal__cube">
              <TwistyViewer scramble={scramble} alg={alg} />
            </div>
            <ol className="solution-modal__stages">
              {solution.stages.map((stage) => (
                <li
                  key={stage.name}
                  className="solution-modal__stage"
                  data-skip={stage.moveCount === 0 || undefined}
                >
                  <span className="solution-modal__annotation">
                    {stage.annotation}
                  </span>
                  <span className="solution-modal__moves">
                    {stage.moves || "—"}
                  </span>
                  <span className="solution-modal__count">
                    {stage.moveCount}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </dialog>
    </>
  );
}
