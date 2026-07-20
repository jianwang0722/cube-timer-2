/**
 * WCA event ids supported by the timer. Single source of truth for the
 * display label and the twisty-player puzzle id each maps to — scramble
 * generation (`src/scramble`), the 3D preview (`TwistyViewer`), and session
 * tagging (`src/stats`) all key off `EventId`.
 */
export type EventId = "222" | "333" | "444" | "555";

/** twisty-player `puzzle` ids for the events above (see cubing/twisty). */
export type TwistyPuzzleId = "2x2x2" | "3x3x3" | "4x4x4" | "5x5x5";

export const EVENT_IDS: readonly EventId[] = ["222", "333", "444", "555"];

export const EVENTS: Record<
  EventId,
  { label: string; twistyPuzzle: TwistyPuzzleId }
> = {
  "222": { label: "2×2", twistyPuzzle: "2x2x2" },
  "333": { label: "3×3", twistyPuzzle: "3x3x3" },
  "444": { label: "4×4", twistyPuzzle: "4x4x4" },
  "555": { label: "5×5", twistyPuzzle: "5x5x5" },
};

export const DEFAULT_EVENT: EventId = "333";

export function isEventId(value: unknown): value is EventId {
  return typeof value === "string" && (EVENT_IDS as string[]).includes(value);
}
