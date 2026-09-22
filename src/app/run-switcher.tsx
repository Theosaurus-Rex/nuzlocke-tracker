/** Switches the active run and shows its game and mode. Per-screen counters live in
 * `AppShell`'s nav rows, not here. */

import type { ChangeEvent, ReactNode } from "react";

import type { Run } from "@/domain/types";
import { GAMES } from "@/game/registry";

export interface RunSwitcherProps {
  runs: readonly Run[];
  /** The currently open run, if any. Matches the router's `:runId` param. */
  activeRunId: string | undefined;
  onSwitch: (runId: string) => void;
}

export function RunSwitcher({ runs, activeRunId, onSwitch }: RunSwitcherProps): ReactNode {
  if (runs.length === 0) {
    return null;
  }

  function handleChange(event: ChangeEvent<HTMLSelectElement>): void {
    const { value } = event.target;
    if (value) {
      onSwitch(value);
    }
  }

  const activeRun = runs.find((run) => run.id === activeRunId);
  const subtitle = activeRun
    ? GAMES[activeRun.game].name + (activeRun.rules.randomiser.enabled ? " · randomised" : "")
    : null;

  return (
    <div className="flex flex-col gap-1.5">
      <select
        aria-label="Switch run"
        value={activeRunId ?? ""}
        onChange={handleChange}
        className="h-9 w-full border-[1.5px] border-border bg-card px-2 text-sm font-medium text-foreground"
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

      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
