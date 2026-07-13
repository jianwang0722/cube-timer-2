import type { StatResult } from "../stats";
import { formatStat } from "../stats";
import type { Penalty, Solve, TimerState } from "../timer";
import { displayTime, formatInspection, formatTimeMs } from "../timer";
import "./TimerDisplay.css";

interface TimerDisplayProps {
  state: TimerState;
  displayMs: number;
  inspectionElapsedMs: number | null;
  lastSolve: Solve | undefined;
  /** The just-finished solve is a new PB single. */
  isPb: boolean;
  /** Best single before this solve, for the PB delta line. */
  prevBestSingle: StatResult;
  onSetPenalty: (id: string, penalty: Penalty) => void;
  /** Abort a running inspection (misclick escape hatch). */
  onCancelInspection: () => void;
}

/** Keep control clicks out of the press/release timing surface. */
const isolate = {
  onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
  onPointerUp: (e: React.PointerEvent) => e.stopPropagation(),
};

const PENALTIES: Penalty[] = ["OK", "+2", "DNF"];
const STICKERS = ["white", "yellow", "green", "blue", "red", "orange"] as const;

type Tone = "neutral" | "ready" | "warn" | "plus2" | "dnf" | "pb";

function inspecting(state: TimerState): boolean {
  return (
    state.status === "inspection" ||
    state.status === "inspectionArmed" ||
    (state.status === "ready" && state.inspectionStartedAt !== undefined)
  );
}

function tone(
  state: TimerState,
  elapsed: number | null,
  lastSolve: Solve | undefined,
  isPb: boolean,
): Tone {
  if (state.status === "ready") return "ready";
  if (inspecting(state) && elapsed !== null) {
    if (elapsed >= 12000) return "plus2";
    if (elapsed >= 8000) return "warn";
    return "neutral";
  }
  if (state.status === "stopped") {
    if (isPb) return "pb";
    if (lastSolve?.penalty === "DNF") return "dnf";
  }
  return "neutral";
}

export function TimerDisplay({
  state,
  displayMs,
  inspectionElapsedMs,
  lastSolve,
  isPb,
  prevBestSingle,
  onSetPenalty,
  onCancelInspection,
}: TimerDisplayProps) {
  const isInspecting = inspecting(state);
  const showPb = state.status === "stopped" && isPb && lastSolve !== undefined;

  // While running, one decimal keeps the display readable; full centisecond
  // precision appears once stopped.
  const text =
    isInspecting && inspectionElapsedMs !== null
      ? formatInspection(inspectionElapsedMs)
      : state.status === "stopped" && lastSolve
        ? displayTime(lastSolve)
        : formatTimeMs(displayMs, state.status === "running" ? 1 : 2);

  const currentTone = tone(state, inspectionElapsedMs, lastSolve, isPb);
  const elapsedSec =
    inspectionElapsedMs === null ? 0 : Math.floor(inspectionElapsedMs / 1000);

  const delta =
    showPb && typeof prevBestSingle === "number" && lastSolve
      ? lastSolve.timeMs - prevBestSingle
      : null;

  return (
    <div className="timer" data-inspecting={isInspecting || undefined}>
      <div className="timer__label-slot">
        {isInspecting && (
          <span className="timer__inspection-label">inspection</span>
        )}
        {showPb && (
          <span className="timer__pb-row">
            <span className="timer__pb-badge">new personal best</span>
            {typeof prevBestSingle === "number" && delta !== null && (
              <span className="timer__pb-delta">
                was {formatStat(prevBestSingle)} · −
                {formatTimeMs(Math.abs(delta))}
              </span>
            )}
          </span>
        )}
      </div>

      <div
        className={`timer__digits timer__digits--${currentTone}`}
        data-status={state.status}
        role="timer"
        aria-live="off"
      >
        {showPb && <span className="timer__glow" aria-hidden="true" />}
        {text}
      </div>

      <div className="timer__strip-slot" aria-hidden="true">
        {isInspecting && (
          <span className="timer__inspection-strip">
            {Array.from({ length: 15 }, (_, i) => (
              <i
                key={i}
                className="timer__segment"
                data-zone={i >= 12 ? "plus2" : i >= 8 ? "warn" : "base"}
                data-consumed={i < elapsedSec || undefined}
              />
            ))}
          </span>
        )}
        {showPb && (
          <span className="timer__wca-strip">
            {STICKERS.map((c) => (
              <i key={c} className="timer__segment" data-sticker={c} />
            ))}
          </span>
        )}
      </div>

      <div className="timer__hint-slot">
        {state.status === "idle" || state.status === "armed" ? (
          <span className="timer__hint">hold space</span>
        ) : state.status === "ready" ? (
          <span className="timer__hint timer__hint--ready">
            release to start
          </span>
        ) : state.status === "inspection" ? (
          <div className="timer__cancel-row">
            <button
              type="button"
              className="timer__cancel"
              {...isolate}
              onClick={onCancelInspection}
            >
              cancel
            </button>
            <span className="timer__hint">esc cancels</span>
          </div>
        ) : state.status === "stopped" && lastSolve ? (
          <div className="timer__penalties">
            {PENALTIES.map((p) => (
              <button
                key={p}
                type="button"
                className={`timer__penalty timer__penalty--${p === "+2" ? "plus2" : p.toLowerCase()}`}
                aria-pressed={lastSolve.penalty === p}
                {...isolate}
                onClick={() => onSetPenalty(lastSolve.id, p)}
              >
                {p}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
