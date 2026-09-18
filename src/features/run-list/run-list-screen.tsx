/**
 * Run list screen (PER-13, M1's first ticket; search/tabs/archive added in PER-14). Every run as
 * a summary card: routes covered and party/boxed/dead counts at a glance, with one action per
 * card.
 *
 * Each card fetches its OWN run's rows via the existing per-run hooks (`useEncounters`,
 * `useMons`) rather than a new aggregate query. `invalidateRun` (`@/storage/queries`) only
 * invalidates the keys it enumerates, so a new aggregate key such as `['runSummaries']` would
 * silently go stale after a catch or a death, with no error anywhere. N runs x 2 cached per-run
 * queries against IndexedDB is fine at this scale, and invalidation already works correctly for
 * it — see that module's doc comment. (No `useDeaths` here: `summariseRun`'s `dead` count is a
 * `mons`-status partition, not a `deaths`-table tally — see `derive.ts`.)
 *
 * No visual design work here: CLAUDE.md's "still open" section leaves the hand-drawn look
 * unresolved, so this is existing shadcn primitives (`buttonVariants`) plus plain Tailwind on the
 * existing tokens — see `settings-screen.tsx` for the same approach on a real screen. Responsive
 * per hard rule 6: the card grid is one column at phone width and widens with the viewport.
 *
 * "Start again" (re-running a finished run) is deliberately absent: it needs run creation
 * (PER-16), which does not exist yet. The empty state below is minimal and functional, not
 * designed — that pass is PER-23 (M5).
 *
 * Tabs, search and archive (PER-14): the ticket names Active/Finished tabs, but archiving a run
 * with no way to see or reverse it would make that run permanently unreachable from the UI —
 * unacceptable in a permadeath tracker where the data IS the point. So there is a third
 * "Archived" tab and an Unarchive action, in addition to what PER-14 literally asks for; see the
 * PR description for this as a flagged, reviewable addition rather than scope creep.
 *
 * Tab counts reflect each status's total regardless of the search text (like an inbox's unread
 * count), so switching tabs while a search is active doesn't move numbers unrelated to the
 * search. The sidebar counters PER-20 will add are a separate, out-of-scope surface.
 */

import { useState, type ChangeEvent, type ReactNode } from "react";
import { Link } from "react-router";

import { Button, buttonVariants } from "@/components/ui/button";
import { summariseRun } from "@/domain/derive";
import type { Run, RunStatus } from "@/domain/types";
import { useEncounters, useMons, useRuns } from "@/storage/queries";
import { useArchiveRun, useUnarchiveRun } from "@/storage/mutations";

const STAT_LABELS = [
  { key: "routesCovered", label: "Routes covered" },
  { key: "party", label: "Party" },
  { key: "boxed", label: "Boxed" },
  { key: "dead", label: "Dead" },
] as const;

/** The three tabs. Archived is a deliberate addition beyond the ticket — see file header. */
const TABS: readonly { status: RunStatus; label: string }[] = [
  { status: "active", label: "Active" },
  { status: "finished", label: "Finished" },
  { status: "archived", label: "Archived" },
];

function ArchiveAction({ run }: { run: Run }): ReactNode {
  const archiveRun = useArchiveRun();
  const unarchiveRun = useUnarchiveRun();

  if (run.status === "archived") {
    return (
      <Button
        size="sm"
        variant="ghost"
        disabled={unarchiveRun.isPending}
        onClick={() => unarchiveRun.mutate(run.id)}
      >
        Unarchive
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={archiveRun.isPending}
      onClick={() => archiveRun.mutate(run.id)}
    >
      Archive
    </Button>
  );
}

function RunCard({ run }: { run: Run }): ReactNode {
  const encountersQuery = useEncounters(run.id);
  const monsQuery = useMons(run.id);

  const loading = encountersQuery.isPending || monsQuery.isPending;

  const summary = loading
    ? null
    : summariseRun({
        encounters: encountersQuery.data ?? [],
        mons: monsQuery.data ?? [],
      });

  const actionLabel = run.status === "active" ? "Resume" : "View";

  return (
    <li className="flex flex-col gap-3 rounded border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-medium">{run.name}</h2>
          <p className="text-muted-foreground text-xs uppercase">{run.status}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ArchiveAction run={run} />
          <Link
            to={`/runs/${run.id}/routes`}
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            {actionLabel}
          </Link>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {STAT_LABELS.map(({ key, label }) => (
          <div key={key}>
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd>{summary ? summary[key] : "…"}</dd>
          </div>
        ))}
      </dl>
    </li>
  );
}

export function RunListScreen(): ReactNode {
  const runsQuery = useRuns();
  const [activeTab, setActiveTab] = useState<RunStatus>("active");
  const [search, setSearch] = useState("");

  if (runsQuery.isPending) {
    return <p className="text-muted-foreground p-4 text-sm">Loading runs…</p>;
  }

  const runs = runsQuery.data ?? [];

  if (runs.length === 0) {
    return (
      <div className="p-4 text-sm">
        No runs yet.{" "}
        <Link to="/runs/new" className="underline">
          Start a new run
        </Link>
        .
      </div>
    );
  }

  const query = search.trim().toLowerCase();
  const runsInTab = runs.filter((run) => run.status === activeTab);
  const visibleRuns = query
    ? runsInTab.filter((run) => run.name.toLowerCase().includes(query))
    : runsInTab;

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>): void {
    setSearch(event.target.value);
  }

  return (
    <div className="p-4">
      <h1 className="text-xl">Runs</h1>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Run status" className="flex gap-1">
          {TABS.map(({ status, label }) => {
            const count = runs.filter((run) => run.status === status).length;
            const selected = status === activeTab;
            return (
              <button
                key={status}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  setActiveTab(status);
                }}
                className={buttonVariants({
                  size: "sm",
                  variant: selected ? "secondary" : "ghost",
                })}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>

        <input
          type="search"
          value={search}
          onChange={handleSearchChange}
          aria-label="Search runs"
          placeholder="Search runs by name"
          className="h-8 w-full rounded border border-border bg-background px-2.5 text-sm sm:w-64"
        />
      </div>

      {visibleRuns.length === 0 ? (
        <p className="text-muted-foreground mt-6 text-sm">
          {query ? `No ${activeTab} runs match "${search.trim()}".` : `No ${activeTab} runs yet.`}
        </p>
      ) : (
        <ul className="mt-4 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {visibleRuns.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </ul>
      )}
    </div>
  );
}
