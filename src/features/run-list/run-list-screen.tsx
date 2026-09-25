/**
 * Each card fetches its own run's rows via `useEncounters`/`useMons` rather than a shared
 * aggregate query: `invalidateRun` only invalidates the keys it enumerates, so an aggregate key
 * would silently go stale after a write.
 */

import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";

import { StatusChip } from "@/components/status-chip";
import { Button, buttonVariants } from "@/components/ui/button";
import { summariseRun } from "@/domain/derive";
import type { Encounter, Mon, Run, RunStatus } from "@/domain/types";
import { GAMES } from "@/game/registry";
import { cn } from "@/lib/utils";
import { useDeleteRun } from "@/storage/mutations";
import { useEncounters, useMons, useRoutes, useRuns } from "@/storage/queries";

const STAT_LABELS = [
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
  /** `summariseRun`'s dead count, computed once by the parent and passed down, not re-derived. */
  deathCount: number;
  onCancel: () => void;
}): ReactNode {
  const deleteRun = useDeleteRun();

  return (
    <div className="space-y-2 border-[1.5px] border-destructive bg-destructive/10 p-3 text-sm shadow-block-alert">
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
  // A third per-card query, for the same reason as the other two: the run's own route count is
  // the only honest denominator, since a run can add custom routes beyond the seeded set.
  const routesQuery = useRoutes(run.id);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const loading = encountersQuery.isPending || monsQuery.isPending || routesQuery.isPending;
  const encounters = encountersQuery.data ?? [];
  const mons = monsQuery.data ?? [];
  const routeTotal = routesQuery.data?.length ?? 0;

  const summary = loading ? null : summariseRun({ encounters, mons });
  const covered = summary?.routesCovered ?? 0;

  const actionLabel = run.status === "active" ? "Resume" : "View";
  const chipStatus = run.status === "active" ? "active" : "complete";

  return (
    <li className="flex flex-col gap-3 border-[1.5px] border-border bg-card p-4 shadow-block">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-bold">{run.name}</h2>
          <p className="text-sm text-muted-foreground">
            {GAMES[run.game].name}
            {run.rules.randomiser.enabled ? " · randomised" : ""}
          </p>
        </div>
        <StatusChip status={chipStatus} className="shrink-0" />
      </div>

      {routeTotal > 0 && (
        <div
          role="progressbar"
          aria-label="Routes covered"
          aria-valuemin={0}
          aria-valuemax={routeTotal}
          aria-valuenow={covered}
          className="h-2.5 border-[1.5px] border-border bg-background"
        >
          <span
            className="block h-full bg-primary"
            style={{ width: `${String(Math.round((covered / routeTotal) * 100))}%` }}
          />
        </div>
      )}

      <dl className="flex flex-wrap gap-x-4 gap-y-1">
        <div className="flex items-baseline gap-1 text-muted-foreground">
          <dd className="font-mono text-sm">
            {summary ? `${String(covered)}/${String(routeTotal)}` : "…"}
          </dd>
          <dt className="text-xs">routes</dt>
        </div>
        {STAT_LABELS.map(({ key, label }) => (
          <div
            key={key}
            className={cn(
              "flex items-baseline gap-1",
              key === "dead" ? "text-destructive" : "text-muted-foreground",
            )}
          >
            <dd className="font-mono text-sm">{summary ? summary[key] : "…"}</dd>
            <dt className="text-xs">{label}</dt>
          </div>
        ))}
      </dl>

      <div className="flex items-center justify-end gap-2 border-t border-muted pt-3">
        {!confirmingDelete && (
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
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

      {confirmingDelete && summary && (
        <DeleteConfirm
          run={run}
          encounters={encounters}
          mons={mons}
          // Gated on `summary` rather than asserting `summary!.dead`, since it is null while
          // loading and the Delete button that opens this is disabled until then.
          deathCount={summary.dead}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </li>
  );
}

export function RunListScreen(): ReactNode {
  const runsQuery = useRuns();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<RunStatus>("active");
  const [search, setSearch] = useState("");

  const shouldRedirectToNewRun = runsQuery.isSuccess && runsQuery.data.length === 0;

  useEffect(() => {
    if (shouldRedirectToNewRun) {
      void navigate("/runs/new", { replace: true });
    }
  }, [shouldRedirectToNewRun, navigate]);

  if (runsQuery.isPending) {
    return <p className="text-muted-foreground p-4 text-sm">Loading runs…</p>;
  }

  if (runsQuery.isError) {
    return (
      <p role="alert" className="p-4 text-sm text-destructive">
        Could not load runs:{" "}
        {runsQuery.error instanceof Error ? runsQuery.error.message : "Unknown error"}.
      </p>
    );
  }

  // Empty means the effect above is about to redirect to /runs/new. Render nothing rather than
  // an empty run list for the one tick before that navigation lands.
  if (shouldRedirectToNewRun) {
    return null;
  }

  const runs = runsQuery.data;
  const query = search.trim().toLowerCase();
  const runsInTab = runs.filter((run) => run.status === activeTab);
  const visibleRuns = query
    ? runsInTab.filter((run) => run.name.toLowerCase().includes(query))
    : runsInTab;

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>): void {
    setSearch(event.target.value);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-[1.5px] border-border p-4">
        <h1 className="text-xl font-bold sm:text-2xl">Runs</h1>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={handleSearchChange}
            aria-label="Search runs"
            placeholder="search runs…"
            className="h-8 w-full border-[1.5px] border-border bg-background px-2.5 text-sm sm:w-56"
          />
          <Link
            to="/runs/new"
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-flag text-foreground shadow-block hover:bg-flag/90",
            )}
          >
            <span aria-hidden="true">+ </span>New run
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
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
                {/* One flex item, so the button's gap does not open up inside the brackets. */}
                <span>
                  {label} (<span className="font-mono">{count}</span>)
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pb-4">
        {visibleRuns.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {query ? `No ${activeTab} runs match "${search.trim()}".` : `No ${activeTab} runs yet.`}
          </p>
        ) : (
          <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2">
            {visibleRuns.map((run) => (
              <RunCard key={run.id} run={run} />
            ))}
            <li>
              <Link
                to="/runs/new"
                className="flex h-full min-h-40 items-center justify-center border-[1.5px] border-dashed border-placeholder p-4 text-sm text-muted-foreground"
              >
                + New run
              </Link>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
