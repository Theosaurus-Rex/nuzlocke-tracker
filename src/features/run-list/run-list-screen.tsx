/**
 * Run list screen (PER-13, M1's first ticket; search/tabs/delete added in PER-14). Every run as a
 * summary card: routes covered and party/boxed/dead counts at a glance, with one action per card.
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
 * Tabs and search (PER-14): Active and Finished, each with a count. An earlier draft of this
 * ticket also archived runs into a third state with a third tab; Theo rejected that on review — a
 * run is either kept or deleted, no third state — so `RunStatus` stays two-valued and delete
 * (below) replaces it. Tab counts reflect each status's total regardless of the search text (like
 * an inbox's unread count), so switching tabs while a search is active doesn't move numbers
 * unrelated to the search. The sidebar counters PER-20 will add are a separate, out-of-scope
 * surface.
 *
 * Delete (PER-14) is genuinely destructive — it removes the run's row plus every row across
 * routes/encounters/mons/deaths/fights (`useDeleteRun`, `@/storage/mutations`) — so each card
 * gates it behind an inline expanding confirmation, matching how `settings-screen.tsx` confirms a
 * replace-mode import: name the run, state the numbers actually being lost, point at `/settings`
 * for a backup, and require an explicit second click. No per-run export here — the existing
 * whole-database export already covers it, and building a second one is out of scope.
 */

import { useState, type ChangeEvent, type ReactNode } from "react";
import { Link } from "react-router";

import { Button, buttonVariants } from "@/components/ui/button";
import { summariseRun } from "@/domain/derive";
import type { Encounter, Mon, Run, RunStatus } from "@/domain/types";
import { useDeleteRun } from "@/storage/mutations";
import { useEncounters, useMons, useRuns } from "@/storage/queries";

const STAT_LABELS = [
  { key: "routesCovered", label: "Routes covered" },
  { key: "party", label: "Party" },
  { key: "boxed", label: "Boxed" },
  { key: "dead", label: "Dead" },
] as const;

const TABS: readonly { status: RunStatus; label: string }[] = [
  { status: "active", label: "Active" },
  { status: "finished", label: "Finished" },
];

function DeleteConfirm({
  run,
  encounters,
  mons,
  deathCount,
  onCancel,
}: {
  run: Run;
  encounters: readonly Encounter[];
  mons: readonly Mon[];
  /** `summariseRun`'s `dead` count, computed once by the parent (`RunCard`) and passed down —
   * see that call site's comment for why this isn't re-derived here with a second
   * `mons.filter(...)`. */
  deathCount: number;
  onCancel: () => void;
}): ReactNode {
  const deleteRun = useDeleteRun();

  return (
    <div className="space-y-2 rounded border border-destructive/40 bg-destructive/10 p-3 text-sm">
      <p className="font-medium text-destructive">
        Permanently delete {run.name}? This removes {encounters.length}{" "}
        {encounters.length === 1 ? "encounter" : "encounters"}, {mons.length} Pokémon and{" "}
        {deathCount} {deathCount === 1 ? "death" : "deaths"}. This cannot be undone.
      </p>
      <p>
        <Link to="/settings" className="underline">
          Export a backup
        </Link>{" "}
        first if you haven&rsquo;t recently.
      </p>

      {deleteRun.isError && (
        <p role="alert" className="text-destructive">
          Delete failed:{" "}
          {deleteRun.error instanceof Error ? deleteRun.error.message : "Unknown error"}. Nothing
          was removed.
        </p>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          disabled={deleteRun.isPending}
          onClick={() => deleteRun.mutate(run.id)}
        >
          {deleteRun.isPending ? "Deleting…" : "Delete permanently"}
        </Button>
        <Button size="sm" variant="ghost" disabled={deleteRun.isPending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function RunCard({ run }: { run: Run }): ReactNode {
  const encountersQuery = useEncounters(run.id);
  const monsQuery = useMons(run.id);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const loading = encountersQuery.isPending || monsQuery.isPending;
  const encounters = encountersQuery.data ?? [];
  const mons = monsQuery.data ?? [];

  const summary = loading ? null : summariseRun({ encounters, mons });

  const actionLabel = run.status === "active" ? "Resume" : "View";

  return (
    <li className="flex flex-col gap-3 rounded border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-medium">{run.name}</h2>
          <p className="text-muted-foreground text-xs uppercase">{run.status}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!confirmingDelete && (
            <Button
              size="sm"
              variant="ghost"
              disabled={loading}
              onClick={() => setConfirmingDelete(true)}
            >
              Delete
            </Button>
          )}
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

      {confirmingDelete && summary && (
        <DeleteConfirm
          run={run}
          encounters={encounters}
          mons={mons}
          // `summary.dead` IS `summariseRun`'s dead count — passed down rather than
          // re-filtered in `DeleteConfirm` so the two never have a chance to disagree. Gated on
          // `summary` (rather than a `summary!.dead` assertion) since it's `null` while
          // loading, and the Delete button that opens this is itself disabled until then.
          deathCount={summary.dead}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
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
