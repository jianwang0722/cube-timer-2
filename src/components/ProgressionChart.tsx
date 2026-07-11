import { useMemo, useState } from "react";
import { effectiveMs, trimmedAverage, type StatSolve } from "../stats";
import { formatTimeMs } from "../timer";
import "./ProgressionChart.css";

interface ProgressionChartProps {
  solves: StatSolve[];
}

const LIMIT = 200;
const W = 320;
const H = 150;
const PAD = { top: 8, right: 8, bottom: 16, left: 34 };

interface Point {
  n: number; // 1-based solve number in the session
  raw: number | null; // effective ms; null for DNF
  ao12: number | null;
}

function niceStep(rough: number): number {
  const pow = 10 ** Math.floor(Math.log10(rough));
  for (const m of [1, 2, 5, 10]) {
    if (m * pow >= rough) return m * pow;
  }
  return 10 * pow;
}

/** Build an SVG path that breaks at null values (DNF gaps). */
function gappedPath(
  points: Point[],
  pick: (p: Point) => number | null,
  x: (i: number) => number,
  y: (v: number) => number,
): string {
  let d = "";
  let pen = false;
  points.forEach((p, i) => {
    const v = pick(p);
    if (v === null) {
      pen = false;
      return;
    }
    d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    pen = true;
  });
  return d;
}

export function ProgressionChart({ solves }: ProgressionChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const points = useMemo<Point[]>(() => {
    const offset = Math.max(0, solves.length - LIMIT);
    return solves.slice(-LIMIT).map((solve, i) => {
      const gi = offset + i;
      const raw = effectiveMs(solve);
      const window = solves.slice(Math.max(0, gi - 11), gi + 1);
      const ao12 = window.length === 12 ? trimmedAverage(window, 12) : null;
      return {
        n: gi + 1,
        raw: raw === "DNF" ? null : raw,
        ao12: typeof ao12 === "number" ? ao12 : null,
      };
    });
  }, [solves]);

  const numeric = points.flatMap((p) =>
    [p.raw, p.ao12].filter((v): v is number => v !== null),
  );
  if (numeric.length < 2) {
    return (
      <figure className="chart" aria-label="Solve time progression">
        <p className="chart__empty">Progression appears after a few solves.</p>
      </figure>
    );
  }

  const lo = Math.min(...numeric);
  const hi = Math.max(...numeric);
  const padMs = Math.max((hi - lo) * 0.08, 200);
  const yMin = Math.max(0, lo - padMs);
  const yMax = hi + padMs;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i: number) =>
    PAD.left +
    (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) =>
    PAD.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  const step = niceStep((yMax - yMin) / 3);
  const ticks: number[] = [];
  for (let t = Math.ceil(yMin / step) * step; t <= yMax; t += step)
    ticks.push(t);

  const hovered = hover !== null ? points[hover] : null;

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const frac = (px - PAD.left) / plotW;
    const i = Math.round(frac * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };

  return (
    <figure className="chart" aria-label="Solve time progression">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="chart__plot"
        role="img"
        aria-label={`Times for the last ${points.length} solves`}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              className="chart__grid"
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
            />
            <text className="chart__tick" x={PAD.left - 4} y={y(t) + 3}>
              {formatTimeMs(t)}
            </text>
          </g>
        ))}
        <path
          className="chart__raw"
          d={gappedPath(points, (p) => p.raw, x, y)}
        />
        <path
          className="chart__ao12"
          d={gappedPath(points, (p) => p.ao12, x, y)}
        />
        {hovered && (
          <g>
            <line
              className="chart__crosshair"
              x1={x(hover!)}
              x2={x(hover!)}
              y1={PAD.top}
              y2={PAD.top + plotH}
            />
            {hovered.raw !== null && (
              <circle
                className="chart__dot"
                cx={x(hover!)}
                cy={y(hovered.raw)}
                r={4}
              />
            )}
          </g>
        )}
      </svg>
      {hovered && (
        <div className="chart__tooltip" role="status">
          #{hovered.n} ·{" "}
          {hovered.raw === null ? "DNF" : formatTimeMs(hovered.raw)}
          {hovered.ao12 !== null && ` · ao12 ${formatTimeMs(hovered.ao12)}`}
        </div>
      )}
      <figcaption className="chart__legend">
        <span className="chart__key chart__key--raw" /> solves
        <span className="chart__key chart__key--ao12" /> ao12
      </figcaption>
    </figure>
  );
}
