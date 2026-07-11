/**
 * Format a duration for the timer display, truncated (never rounded) to
 * centiseconds per WCA display convention: 9.58, 59.99, 1:00.42, 12:34.56.
 */
export function formatTimeMs(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalCs = Math.floor(clamped / 10);
  const cs = totalCs % 100;
  const totalSeconds = Math.floor(totalCs / 100);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);

  const csStr = String(cs).padStart(2, "0");
  if (minutes === 0) {
    return `${seconds}.${csStr}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}.${csStr}`;
}

/**
 * Inspection countdown display: whole seconds remaining (15..1), then "+2"
 * once time runs out, then "DNF" after the 17s cutoff. `elapsedMs` is time
 * since inspection started.
 */
export function formatInspection(elapsedMs: number): string {
  if (elapsedMs >= 17000) return "DNF";
  if (elapsedMs >= 15000) return "+2";
  return String(Math.ceil((15000 - elapsedMs) / 1000));
}
