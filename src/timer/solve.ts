import { formatTimeMs } from "./format";

export type Penalty = "OK" | "+2" | "DNF";

export interface Solve {
  id: string;
  timeMs: number;
  penalty: Penalty;
  scramble: string;
  date: number;
  sessionId: string;
}

/** Display string for a solve result: "12.34", "14.34+" (+2 applied), or "DNF". */
export function displayTime(solve: Pick<Solve, "timeMs" | "penalty">): string {
  switch (solve.penalty) {
    case "DNF":
      return "DNF";
    case "+2":
      return `${formatTimeMs(solve.timeMs + 2000)}+`;
    case "OK":
      return formatTimeMs(solve.timeMs);
  }
}
