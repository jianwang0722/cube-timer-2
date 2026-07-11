import type { Alg } from "cubing/alg";

// WCA compliance (CLAUDE.md): scrambles MUST be random-state via
// cubing/scramble. The module is imported dynamically so the scramble worker
// stays out of the main chunk.
async function generate(): Promise<Alg> {
  const { randomScrambleForEvent } = await import("cubing/scramble");
  return randomScrambleForEvent("333");
}

let queued: Promise<Alg> | null = null;

/** Start generating the first scramble without consuming it. */
export function warmUp(): void {
  queued ??= generate();
}

/**
 * Resolve to the next scramble. The upcoming one is always generated in the
 * background so calls after the first resolve without a search wait.
 */
export function nextScramble(): Promise<Alg> {
  const current = queued ?? generate();
  queued = generate();
  return current;
}
