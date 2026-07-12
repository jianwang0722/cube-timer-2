import { useEffect, useRef, useState } from "react";
import type { Alg } from "cubing/alg";
import "./ScrambleDisplay.css";

interface ScrambleDisplayProps {
  scramble: Alg | null;
  onNew: () => void;
  /** 1-based number of the upcoming solve, shown as #NNN. */
  solveIndex: number;
}

export function ScrambleDisplay({
  scramble,
  onNew,
  solveIndex,
}: ScrambleDisplayProps) {
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(copiedTimeoutRef.current), []);

  const text = scramble?.toString() ?? null;
  const moveCount = text === null ? 0 : text.split(/\s+/).length;

  const copy = () => {
    if (text === null) return;
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <section className="scramble" aria-label="Scramble">
      <p className="scramble__text" data-loading={text === null}>
        {text ?? "generating scramble…"}
      </p>
      <div className="scramble__side">
        <span className="scramble__meta">
          {text === null
            ? "—"
            : `${moveCount} moves · #${String(solveIndex).padStart(3, "0")}`}
        </span>
        <div className="scramble__actions">
          <button type="button" onClick={copy} disabled={text === null}>
            {copied ? "copied" : "copy"}
          </button>
          <button type="button" onClick={onNew} title="Hotkey: N">
            new
          </button>
        </div>
      </div>
    </section>
  );
}
