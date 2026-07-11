import type { Penalty, Solve } from "../timer";
import { displayTime } from "../timer";
import "./SolvePanel.css";

interface SolvePanelProps {
  solves: Solve[];
  onSetPenalty: (id: string, penalty: Penalty) => void;
  onDelete: (id: string) => void;
}

const PENALTIES: Penalty[] = ["OK", "+2", "DNF"];

export function SolvePanel({
  solves,
  onSetPenalty,
  onDelete,
}: SolvePanelProps) {
  const last = solves.at(-1);

  return (
    <section className="solve-panel" aria-label="Solves">
      {last && (
        <div className="solve-panel__controls">
          {PENALTIES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onSetPenalty(last.id, p)}
              aria-pressed={last.penalty === p}
            >
              {p}
            </button>
          ))}
          <button type="button" onClick={() => onDelete(last.id)}>
            Delete
          </button>
        </div>
      )}
      <ol className="solve-panel__list" reversed>
        {solves
          .slice()
          .reverse()
          .map((solve) => (
            <li key={solve.id}>{displayTime(solve)}</li>
          ))}
      </ol>
    </section>
  );
}
