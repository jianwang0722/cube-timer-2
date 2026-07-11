import type { TimerState } from "../timer";
import { formatInspection, formatTimeMs } from "../timer";
import "./TimerDisplay.css";

interface TimerDisplayProps {
  state: TimerState;
  displayMs: number;
  inspectionElapsedMs: number | null;
}

type Tone = "neutral" | "armed" | "ready" | "warning8" | "warning12";

function tone(state: TimerState, inspectionElapsedMs: number | null): Tone {
  if (state.status === "ready") return "ready";
  if (state.status === "armed") return "armed";
  if (state.status === "inspectionArmed") return "armed";
  if (state.status === "inspection" && inspectionElapsedMs !== null) {
    // Visual stand-ins for the WCA 8s/12s inspection warnings.
    if (inspectionElapsedMs >= 12000) return "warning12";
    if (inspectionElapsedMs >= 8000) return "warning8";
  }
  return "neutral";
}

export function TimerDisplay({
  state,
  displayMs,
  inspectionElapsedMs,
}: TimerDisplayProps) {
  const inspecting =
    state.status === "inspection" ||
    state.status === "inspectionArmed" ||
    (state.status === "ready" && state.inspectionStartedAt !== undefined);

  const text =
    inspecting && inspectionElapsedMs !== null
      ? formatInspection(inspectionElapsedMs)
      : formatTimeMs(displayMs);

  return (
    <div
      className={`timer-display timer-display--${tone(state, inspectionElapsedMs)}`}
      data-status={state.status}
      role="timer"
      aria-live="off"
    >
      {text}
    </div>
  );
}
