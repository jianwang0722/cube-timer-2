import { useState } from "react";
import type { Penalty, Solve } from "../timer";
import { displayTime, formatTimeMs } from "../timer";
import "./SolvePanel.css";

interface SolvePanelProps {
  solves: Solve[];
  onSetPenalty: (id: string, penalty: Penalty) => void;
  onDelete: (id: string) => void;
}

const PENALTIES: Penalty[] = ["OK", "+2", "DNF"];
const LIST_LIMIT = 100;

function rowTime(solve: Solve): {
  text: string;
  tag: "+2" | null;
  dnf: boolean;
} {
  if (solve.penalty === "DNF") return { text: "DNF", tag: null, dnf: true };
  if (solve.penalty === "+2")
    return { text: formatTimeMs(solve.timeMs + 2000), tag: "+2", dnf: false };
  return { text: formatTimeMs(solve.timeMs), tag: null, dnf: false };
}

export function SolvePanel({
  solves,
  onSetPenalty,
  onDelete,
}: SolvePanelProps) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = solves.find((s) => s.id === detailId);
  const shown = solves.slice(-LIST_LIMIT).reverse();
  const lastId = solves.at(-1)?.id;

  return (
    <section className="solve-panel" aria-label="Solves">
      <div className="solve-panel__header">
        <span className="ui-label">session</span>
        <span className="solve-panel__count">{solves.length}</span>
      </div>
      <ol className="solve-panel__list" reversed start={solves.length}>
        {shown.map((solve, i) => {
          const { text, tag, dnf } = rowTime(solve);
          const index = solves.length - i;
          return (
            <li key={solve.id}>
              <button
                type="button"
                className="solve-panel__row"
                data-latest={solve.id === lastId || undefined}
                title={solve.scramble}
                onClick={() => setDetailId(solve.id)}
              >
                <span className="solve-panel__index">{index}</span>
                <span
                  className={`solve-panel__time${dnf ? " solve-panel__time--dnf" : ""}`}
                >
                  {text}
                  {tag && <span className="solve-panel__plus2"> +2</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {solves.length > LIST_LIMIT && (
        <p className="solve-panel__note">showing last {LIST_LIMIT}</p>
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
          <div className="solve-detail__controls">
            {PENALTIES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onSetPenalty(detail.id, p)}
                aria-pressed={detail.penalty === p}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              aria-label="Delete this solve"
              onClick={() => {
                onDelete(detail.id);
                setDetailId(null);
              }}
            >
              Delete
            </button>
          </div>
          <button
            type="button"
            className="solve-detail__close"
            onClick={() => setDetailId(null)}
          >
            Close
          </button>
        </dialog>
      )}
    </section>
  );
}
