/**
 * `summary` is `undefined` when no run is open, not a row of zeroes, so a run's real `0` never
 * looks the same as "no run is open".
 */

import type { ChangeEvent, ReactNode } from "react";

import type { RunSummary } from "@/domain/derive";
import type { Run } from "@/domain/types";

const COUNTER_LABELS: readonly { key: keyof RunSummary; label: string }[] = [
  { key: "routesCovered", label: "Routes" },
  { key: "party", label: "Party" },
  { key: "boxed", label: "Boxed" },
  { key: "dead", label: "Dead" },
];

export interface RunSwitcherProps {
  runs: readonly Run[];
  /** The currently open run, if any. Matches the router's `:runId` param. */
  activeRunId: string | undefined;
  /** `undefined` renders no counters at all. See the file header for why that's not `0`. */
  summary: RunSummary | undefined;
  onSwitch: (runId: string) => void;
}

export function RunSwitcher({ runs, activeRunId, summary, onSwitch }: RunSwitcherProps): ReactNode {
  if (runs.length === 0) {
    return null;
  }

  function handleChange(event: ChangeEvent<HTMLSelectElement>): void {
    const { value } = event.target;
    if (value) {
      onSwitch(value);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <select
        aria-label="Switch run"
        value={activeRunId ?? ""}
        onChange={handleChange}
        className="h-8 w-full rounded border border-border bg-background px-2 text-sm"
      >
        {activeRunId === undefined && (
          <option value="" disabled>
            Switch to a run…
          </option>
        )}
        {runs.map((run) => (
          <option key={run.id} value={run.id}>
            {run.name}
          </option>
        ))}
      </select>

      {summary && (
        <dl className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {COUNTER_LABELS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1">
              <dt>{label}</dt>
              <dd className="font-medium text-foreground">{summary[key]}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
