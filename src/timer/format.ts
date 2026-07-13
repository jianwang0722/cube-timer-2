/**
 * Format a duration for the timer display, truncated (never rounded) per WCA
 * display convention: 9.58, 59.99, 1:00.42, 12:34.56. `decimals: 1` gives the
 * coarser live-timer form (8.3, 1:00.4) so running digits don't flicker.
 */
export function formatTimeMs(ms: number, decimals: 1 | 2 = 2): string {
  const clamped = Math.max(0, ms);
  const unit = decimals === 2 ? 10 : 100;
  const totalUnits = Math.floor(clamped / unit);
  const perSecond = decimals === 2 ? 100 : 10;
  const frac = totalUnits % perSecond;
  const totalSeconds = Math.floor(totalUnits / perSecond);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);

  const fracStr = String(frac).padStart(decimals, "0");
  if (minutes === 0) {
    return `${seconds}.${fracStr}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}.${fracStr}`;
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
