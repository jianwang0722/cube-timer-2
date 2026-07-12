import {
  formatStat,
  type PbFlags,
  type SessionStats,
  type StatKey,
} from "../stats";
import "./StatsPanel.css";

interface StatsPanelProps {
  stats: SessionStats;
  pbFlags: PbFlags;
}

const TILES: { key: StatKey; label: string }[] = [
  { key: "single", label: "single" },
  { key: "ao5", label: "ao5" },
  { key: "ao12", label: "ao12" },
  { key: "ao100", label: "ao100" },
];

export function StatsPanel({ stats, pbFlags }: StatsPanelProps) {
  return (
    <section className="statband" aria-label="Statistics">
      {TILES.map(({ key, label }) => (
        <div className="statband__tile" key={key}>
          <span className="ui-label">{label}</span>
          <span
            className={`statband__value${pbFlags[key] ? " statband__value--pb" : ""}`}
            data-stat={`${key}-current`}
          >
            {formatStat(stats[key].current)}
          </span>
          <span className="statband__best">
            best{" "}
            <span
              className={key === "single" ? "statband__best-single" : undefined}
              data-stat={`${key}-best`}
            >
              {formatStat(stats[key].best)}
            </span>
          </span>
        </div>
      ))}
    </section>
  );
}
