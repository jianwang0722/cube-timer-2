import { useEffect, useRef, useState } from "react";
import type { Alg } from "cubing/alg";
import type { TwistyPlayer } from "cubing/twisty";
import type { TwistyPuzzleId } from "../events";
import "./TwistyViewer.css";

interface TwistyViewerProps {
  /** Scramble shown as the puzzle state (twisty-player setup alg). */
  scramble: Alg | null;
  /** Solution to display/animate on top of the setup (Phase 5). */
  alg?: Alg;
  /** Which cube to render; defaults to 3x3. */
  puzzle?: TwistyPuzzleId;
}

export function TwistyViewer({
  scramble,
  alg,
  puzzle = "3x3x3",
}: TwistyViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<TwistyPlayer | null>(null);
  const [playerReady, setPlayerReady] = useState(false);

  // cubing/twisty is imported lazily; the player element is created
  // imperatively once the module (and custom element) is available. `puzzle`
  // is set at construction only — callers change it by remounting (key), which
  // keeps the puzzle and its setup alg structurally in sync.
  useEffect(() => {
    let cancelled = false;
    void import("cubing/twisty").then(({ TwistyPlayer }) => {
      if (cancelled || !containerRef.current) return;
      const created = new TwistyPlayer({
        puzzle,
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
  }, [puzzle]);

  // playerReady re-runs this once the async creation lands.
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    player.experimentalSetupAlg = scramble ?? "";
    player.alg = alg ?? "";
    // Reveal the built-in play/scrub bar only while a solution is loaded.
    player.controlPanel = alg ? "bottom-row" : "none";
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
