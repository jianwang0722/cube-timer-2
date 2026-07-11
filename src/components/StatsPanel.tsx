import { formatStat, type PbFlags, type SessionStats, type StatKey } from "../stats";
import "./StatsPanel.css";

interface StatsPanelProps {
  stats: SessionStats;
  pbFlags: PbFlags;
}

const ROWS: { key: StatKey; label: string }[] = [
  { key: "single", label: "single" },
  { key: "mo3", label: "mo3" },
  { key: "ao5", label: "ao5" },
  { key: "ao12", label: "ao12" },
  { key: "ao100", label: "ao100" },
];

export function StatsPanel({ stats, pbFlags }: StatsPanelProps) {
  return (
    <section className="stats" aria-label="Statistics">
      <table className="stats__table">
        <thead>
          <tr>
            <th scope="col" aria-label="Statistic"></th>
            <th scope="col">current</th>
            <th scope="col">best</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map(({ key, label }) => (
            <tr key={key}>
              <th scope="row">{label}</th>
              <td
                className={pbFlags[key] ? "stats__value--pb" : undefined}
                data-stat={`${key}-current`}
              >
                {formatStat(stats[key].current)}
              </td>
              <td data-stat={`${key}-best`}>{formatStat(stats[key].best)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="stats__meta">
        {stats.count} solves · worst {formatStat(stats.worstSingle)}
      </p>
    </section>
  );
}
