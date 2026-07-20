import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { Alg } from "cubing/alg";
import type { EventId } from "../events";
import { nextScramble, warmUp } from "./scramble";

export interface UseScrambleResult {
  /** Current scramble, or null while one is being generated. */
  scramble: Alg | null;
  /** Discard the current scramble and move to the next (prefetched) one. */
  advance: () => void;
}

export function useScramble(event: EventId): UseScrambleResult {
  const [scramble, setScramble] = useState<Alg | null>(null);
  // Increments on every request; stale resolutions (lower token) are dropped.
  const requestTokenRef = useRef(0);
  const [lastEvent, setLastEvent] = useState(event);

  // Adjust state during render on event change: drop the previous event's
  // scramble so it can't render (or be armed/stored) against the new event
  // during the load. This is the sanctioned setState-in-render reset; the
  // in-flight request from the old event is superseded in the layout effect
  // below.
  if (event !== lastEvent) {
    setLastEvent(event);
    setScramble(null);
  }

  const request = useCallback(() => {
    const token = ++requestTokenRef.current;
    void nextScramble(event).then((alg) => {
      if (requestTokenRef.current === token) setScramble(alg);
    });
  }, [event]);

  const advance = useCallback(() => {
    setScramble(null);
    request();
  }, [request]);

  // Layout effect, not passive: it runs synchronously in the commit phase, so
  // the new request's token bump lands before the microtask that could
  // resolve a stale in-flight request from the previous event (a queued
  // scramble resolves on the next microtask, which is after commit but before
  // passive effects).
  useLayoutEffect(() => {
    warmUp(event);
    request();
  }, [event, request]);

  return { scramble, advance };
}
