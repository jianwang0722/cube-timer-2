let ctx: AudioContext | null = null;

/** Short sine beep for inspection warnings. Silently no-ops without audio. */
export function beep(freq = 880, durationMs = 150): void {
  try {
    ctx ??= new AudioContext();
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.2, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + durationMs / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + durationMs / 1000);
  } catch {
    // No AudioContext (or blocked) — warnings stay visual-only.
  }
}
