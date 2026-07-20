import type { Alg } from "cubing/alg";
import type { EventId } from "../events";

// WCA compliance (CLAUDE.md): scrambles MUST come from cubing/scramble
// (randomScrambleForEvent) for the session's event — 2x2/3x3/4x4 are
// random-state, 5x5 is random-moves (official TNoodle behavior). The module
// is imported dynamically so the scramble worker stays out of the main chunk.
async function generateReal(event: EventId): Promise<Alg> {
  const { randomScrambleForEvent } = await import("cubing/scramble");
  return randomScrambleForEvent(event);
}

export interface ScrambleQueue {
  /** Start generating the first scramble for an event without consuming it. */
  warmUp(event: EventId): void;
  /**
   * Resolve to the next scramble for an event. The upcoming one is always
   * generated in the background so calls after the first resolve without a
   * search wait.
   */
  nextScramble(event: EventId): Promise<Alg>;
}

/**
 * One prefetched scramble per event. Switching events keeps the previous
 * event's queued scramble primed, so switching back is instant; only the
 * active event is ever warmed (4x4's first generation is multi-second work
 * and must stay behind the "generating scramble…" placeholder).
 *
 * The generator is injected so the queue logic can be unit-tested without a
 * real search; production wires in `generateReal`.
 */
export function createScrambleQueue(
  generate: (event: EventId) => Promise<Alg>,
): ScrambleQueue {
  const queues = new Map<EventId, Promise<Alg>>();
  return {
    warmUp(event) {
      if (!queues.has(event)) queues.set(event, generate(event));
    },
    nextScramble(event) {
      const current = queues.get(event) ?? generate(event);
      queues.set(event, generate(event));
      return current;
    },
  };
}

const defaultQueue = createScrambleQueue(generateReal);

export const warmUp = (event: EventId): void => defaultQueue.warmUp(event);
export const nextScramble = (event: EventId): Promise<Alg> =>
  defaultQueue.nextScramble(event);
