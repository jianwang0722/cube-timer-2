import { useEffect, useRef, useState } from "react";
import type { Alg } from "cubing/alg";
import type { TwistyPlayer } from "cubing/twisty";
import "./TwistyViewer.css";

interface TwistyViewerProps {
  /** Scramble shown as the puzzle state (twisty-player setup alg). */
  scramble: Alg | null;
  /** Solution to display/animate on top of the setup (Phase 5). */
  alg?: Alg;
}

export function TwistyViewer({ scramble, alg }: TwistyViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<TwistyPlayer | null>(null);
  const [playerReady, setPlayerReady] = useState(false);

  // cubing/twisty is imported lazily; the player element is created
  // imperatively once the module (and custom element) is available.
  useEffect(() => {
    let cancelled = false;
    void import("cubing/twisty").then(({ TwistyPlayer }) => {
      if (cancelled || !containerRef.current) return;
      const created = new TwistyPlayer({
        puzzle: "3x3x3",
        controlPanel: "none",
        background: "none",
        hintFacelets: "none",
        backView: "none",
      });
      containerRef.current.replaceChildren(created);
      playerRef.current = created;
      setPlayerReady(true);
    });
    return () => {
      cancelled = true;
      playerRef.current?.remove();
      playerRef.current = null;
    };
  }, []);

  // playerReady re-runs this once the async creation lands.
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    player.experimentalSetupAlg = scramble ?? "";
    player.alg = alg ?? "";
  }, [playerReady, scramble, alg]);

  return (
    <div
      className="twisty-viewer"
      ref={containerRef}
      role="img"
      aria-label="3D cube preview"
    />
  );
}
