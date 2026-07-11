import { useEffect, useRef, useState } from "react";
import type { Alg } from "cubing/alg";
import "./ScrambleDisplay.css";

interface ScrambleDisplayProps {
  scramble: Alg | null;
  onNew: () => void;
}

export function ScrambleDisplay({ scramble, onNew }: ScrambleDisplayProps) {
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(copiedTimeoutRef.current), []);

  const text = scramble?.toString() ?? null;

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
        {text ?? "Generating scramble…"}
      </p>
      <div className="scramble__actions">
        <button type="button" onClick={copy} disabled={text === null}>
          {copied ? "Copied!" : "Copy"}
        </button>
        <button type="button" onClick={onNew} title="Hotkey: N">
          New scramble
        </button>
      </div>
    </section>
  );
}
