import { useCallback, useEffect, useRef, useState } from "react";
import type { Alg } from "cubing/alg";
import { nextScramble, warmUp } from "./scramble";

export interface UseScrambleResult {
  /** Current scramble, or null while one is being generated. */
  scramble: Alg | null;
  /** Discard the current scramble and move to the next (prefetched) one. */
  advance: () => void;
}

export function useScramble(): UseScrambleResult {
  const [scramble, setScramble] = useState<Alg | null>(null);
  // Increments on every advance; stale resolutions are dropped.
  const requestTokenRef = useRef(0);

  const advance = useCallback(() => {
    const token = ++requestTokenRef.current;
    setScramble(null);
    void nextScramble().then((alg) => {
      if (requestTokenRef.current === token) setScramble(alg);
    });
  }, []);

  useEffect(() => {
    warmUp();
    advance();
  }, [advance]);

  return { scramble, advance };
}
