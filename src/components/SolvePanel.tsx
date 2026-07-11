import { useState } from "react";
import type { Penalty, Solve } from "../timer";
import { displayTime } from "../timer";
import "./SolvePanel.css";

interface SolvePanelProps {
  solves: Solve[];
  onSetPenalty: (id: string, penalty: Penalty) => void;
  onDelete: (id: string) => void;
}

const PENALTIES: Penalty[] = ["OK", "+2", "DNF"];
const LIST_LIMIT = 100;

function PenaltyButtons({
  solve,
  onSetPenalty,
  onDelete,
  deleteLabel,
}: {
  solve: Solve;
  onSetPenalty: SolvePanelProps["onSetPenalty"];
  onDelete: SolvePanelProps["onDelete"];
  deleteLabel: string;
}) {
  return (
    <div className="solve-panel__controls">
      {PENALTIES.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onSetPenalty(solve.id, p)}
          aria-pressed={solve.penalty === p}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        aria-label={deleteLabel}
        onClick={() => onDelete(solve.id)}
      >
        Delete
      </button>
    </div>
  );
}

export function SolvePanel({
  solves,
  onSetPenalty,
  onDelete,
}: SolvePanelProps) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const last = solves.at(-1);
  const detail = solves.find((s) => s.id === detailId);
  const shown = solves.slice(-LIST_LIMIT).reverse();

  return (
    <section className="solve-panel" aria-label="Solves">
      {last && (
        <PenaltyButtons
          solve={last}
          onSetPenalty={onSetPenalty}
          onDelete={onDelete}
          deleteLabel="Delete solve"
        />
      )}
      <ol className="solve-panel__list" reversed start={solves.length}>
        {shown.map((solve) => (
          <li key={solve.id} title={solve.scramble}>
            <button
              type="button"
              className="solve-panel__item"
              onClick={() => setDetailId(solve.id)}
            >
              {displayTime(solve)}
            </button>
          </li>
        ))}
      </ol>
      {solves.length > LIST_LIMIT && (
        <p className="solve-panel__note">
          Showing last {LIST_LIMIT} of {solves.length} solves
        </p>
      )}
      {detail && (
        <dialog open className="solve-detail" aria-label="Solve detail">
          <p className="solve-detail__time">{displayTime(detail)}</p>
          <p className="solve-detail__scramble">
            {detail.scramble || "(no scramble)"}
          </p>
          <p className="solve-detail__date">
            {new Date(detail.date).toLocaleString()}
          </p>
          <PenaltyButtons
            solve={detail}
            onSetPenalty={onSetPenalty}
            onDelete={(id) => {
              onDelete(id);
              setDetailId(null);
            }}
            deleteLabel="Delete this solve"
          />
          <button type="button" onClick={() => setDetailId(null)}>
            Close
          </button>
        </dialog>
      )}
    </section>
  );
}
