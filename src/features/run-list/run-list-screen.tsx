/**
 * Run list screen (PER-13, M1's first ticket). Every run as a summary card: routes covered and
 * party/boxed/dead counts at a glance, with one action per card.
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
 */

import type { ReactNode } from "react";
import { Link } from "react-router";

import { buttonVariants } from "@/components/ui/button";
import { summariseRun } from "@/domain/derive";
import type { Run } from "@/domain/types";
import { useEncounters, useMons, useRuns } from "@/storage/queries";

const STAT_LABELS = [
  { key: "routesCovered", label: "Routes covered" },
  { key: "party", label: "Party" },
  { key: "boxed", label: "Boxed" },
  { key: "dead", label: "Dead" },
] as const;

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
        <Link
          to={`/runs/${run.id}/routes`}
          className={buttonVariants({ size: "sm", variant: "outline" })}
        >
          {actionLabel}
        </Link>
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

  return (
    <div className="p-4">
      <h1 className="text-xl">Runs</h1>
      <ul className="mt-4 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {runs.map((run) => (
          <RunCard key={run.id} run={run} />
        ))}
      </ul>
    </div>
  );
}
