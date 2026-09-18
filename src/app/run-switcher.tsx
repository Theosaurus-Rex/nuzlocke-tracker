/**
 * The run switcher and its live counters (PER-20, M1's last ticket). ONE component, mounted
 * TWICE by `AppShell` — once in the desktop sidebar, once in a compact strip above the mobile
 * content — the same way `navItemsFor`'s one array backs both the sidebar and the tab bar (see
 * `nav-items.ts`, CLAUDE.md hard rule 6: "both shells are equals"). `AppShell` computes
 * `runs`/`activeRunId`/`summary` exactly once and passes the identical values into both mounts; a
 * second component or a second read of the underlying data would be exactly the drift hard rule 6
 * exists to prevent.
 *
 * Counts are never computed here. `summary` comes from `summariseRun` (`@/domain/derive`),
 * called once by `AppShell` from the active run's `useEncounters`/`useMons` — PER-20's stated
 * point is not recomputing this per screen (see `derive.ts`'s doc comment). "Live" needs nothing
 * extra in this component: those hooks already invalidate on every write (`invalidateRun`,
 * `@/storage/queries`), so passing their data through is all that's required — no polling, no
 * manual refetch.
 *
 * Zeroes vs. nothing: `summary` is `undefined` whenever there is no active run, or its data
 * hasn't loaded yet, and the counters render nothing in that case rather than a row of zeroes — a
 * freshly created run's real `0`s (PER-22 hasn't seeded routes yet) must not look the same as "no
 * run is open".
 *
 * The switcher itself is a plain `<select>`: no new shadcn component, per the ticket's scope, and
 * it already gives "shows which is current" for free (the selected option) plus works unchanged
 * as the compact mobile strip. When no run is active it still lists every run and lets you jump
 * into one — CLAUDE.md calls that out as the switcher's most useful moment, not a disabled state.
 */

import type { ChangeEvent, ReactNode } from "react";

import type { RunSummary } from "@/domain/derive";
import type { Run } from "@/domain/types";

// `subScreenFromPath`, the sub-screen-preserving helper this component's callers need alongside
// it, lives in `nav-items.ts` instead of here — see that function's doc comment: this file
// exports a component, and `react-refresh/only-export-components` requires a component file to
// export ONLY components, so a second, non-component export here would fail lint. Callers (
// `app-shell.tsx`) import it from `./nav-items` directly.

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
  /** `undefined` renders no counters at all — see the module doc comment on why that's not `0`. */
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
