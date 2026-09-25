import { useState, type FormEvent, type ReactNode } from "react";
import { Navigate, useParams } from "react-router";

import { StatusChip } from "@/components/status-chip";
import { Button } from "@/components/ui/button";
import { DEFAULT_RULES } from "@/domain/rules";
import { buildRouteRows } from "@/domain/route-rows";
import type { Mon, Route } from "@/domain/types";
import { EditMonDialog } from "@/features/encounters/edit-mon-dialog";
import { LogEncounterDialog } from "@/features/encounters/log-encounter-dialog";
import { GAMES } from "@/game/registry";
import { useAddCustomRoute, useDeleteCustomRoute } from "@/storage/mutations";
import { useEncounters, useMons, useRoutes, useRun } from "@/storage/queries";
import { cn } from "@/lib/utils";

import { RouteCardList } from "./route-card-list";
import {
  filterRouteRows,
  ROUTE_FILTER_BUCKETS,
  summariseRouteRows,
  type RouteFilterBucket,
} from "./route-presentation";
import { RouteTable } from "./route-table";

const COUNTER_CHIPS: readonly {
  bucket: RouteFilterBucket;
  status: "caught" | "missed" | "fainted" | "pending";
  label: string;
}[] = [
  { bucket: "caught", status: "caught", label: "caught" },
  { bucket: "missed", status: "missed", label: "missed" },
  { bucket: "fainted", status: "fainted", label: "fainted" },
  { bucket: "pending", status: "pending", label: "pending" },
];

function RouteCounters({
  counters,
}: {
  counters: ReturnType<typeof summariseRouteRows>;
}): ReactNode {
  return (
    <div
      role="group"
      aria-label="Route counters"
      className="flex flex-wrap items-center justify-between gap-3 border-b-[1.5px] border-border bg-background px-4 py-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        {COUNTER_CHIPS.map(({ bucket, status, label }) => (
          <span key={bucket} className="inline-flex items-center gap-1">
            <StatusChip status={status}>
              <span className="font-mono">{counters[bucket]}</span> {label}
            </StatusChip>
          </span>
        ))}
      </div>
      <span className="font-mono text-sm text-muted-foreground">
        {counters.covered} / {counters.total}
      </span>
    </div>
  );
}

function FilterPanel({
  active,
  onToggle,
}: {
  active: ReadonlySet<RouteFilterBucket>;
  onToggle: (bucket: RouteFilterBucket) => void;
}): ReactNode {
  return (
    <div
      role="group"
      aria-label="Filter routes"
      className="mt-2 flex flex-wrap gap-3 border-[1.5px] border-border bg-card p-3 shadow-block"
    >
      {ROUTE_FILTER_BUCKETS.map((bucket) => (
        <label key={bucket} className="flex items-center gap-1.5 text-sm capitalize">
          <input type="checkbox" checked={active.has(bucket)} onChange={() => onToggle(bucket)} />
          {bucket}
        </label>
      ))}
    </div>
  );
}

export function RoutesScreen(): ReactNode {
  const { runId } = useParams<{ runId: string }>();
  const runQuery = useRun(runId ?? "");
  const routesQuery = useRoutes(runId ?? "");
  const encountersQuery = useEncounters(runId);
  const monsQuery = useMons(runId);
  const addRoute = useAddCustomRoute();
  const deleteRoute = useDeleteCustomRoute();

  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [logRoute, setLogRoute] = useState<Route | null>(null);
  const [editTarget, setEditTarget] = useState<{ route: Route; mon: Mon } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<RouteFilterBucket>>(new Set());

  if (!runId) {
    return <Navigate to="/" replace />;
  }
  const activeRunId = runId;

  const trimmedName = name.trim();
  const nameIsInvalid = submitted && trimmedName.length === 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSubmitted(true);

    if (trimmedName.length === 0) {
      return;
    }

    addRoute.mutate(
      { runId: activeRunId, name: trimmedName, routes: routesQuery.data ?? [] },
      {
        onSuccess: () => {
          setName("");
          setSubmitted(false);
        },
      },
    );
  }

  function handleDelete(route: Route): void {
    deleteRoute.mutate({ route });
  }

  function handleEditMon(route: Route, mon: Mon): void {
    setEditTarget({ route, mon });
  }

  function toggleFilter(bucket: RouteFilterBucket): void {
    setActiveFilters((current) => {
      const next = new Set(current);
      if (next.has(bucket)) {
        next.delete(bucket);
      } else {
        next.add(bucket);
      }
      return next;
    });
  }

  const loading = routesQuery.isPending || encountersQuery.isPending || monsQuery.isPending;
  const routes = routesQuery.data ?? [];
  const encounters = encountersQuery.data ?? [];
  const mons = monsQuery.data ?? [];

  const rows = buildRouteRows({ routes, encounters, mons });
  const visibleRows = filterRouteRows(rows, activeFilters);
  const counters = summariseRouteRows(rows);
  // Falls back to HeartGold's generation, the only game seeded today, while the run itself is
  // still loading rather than the table's rows.
  const generation = GAMES[runQuery.data?.game ?? "heartgold"].generation;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-[1.5px] border-border p-4">
        <h1 className="text-xl font-bold sm:text-2xl">Encounter routes</h1>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            aria-expanded={addOpen}
            className="bg-flag text-foreground shadow-block hover:bg-flag/90"
            onClick={() => setAddOpen((open) => !open)}
          >
            + Add route
          </Button>
          <Button
            type="button"
            variant="outline"
            aria-expanded={filterOpen}
            onClick={() => setFilterOpen((open) => !open)}
          >
            Filter
          </Button>
        </div>
      </div>

      {filterOpen && <FilterPanel active={activeFilters} onToggle={toggleFilter} />}

      {!loading && routes.length > 0 && <RouteCounters counters={counters} />}

      {addOpen && (
        <form
          className="flex flex-col gap-2 border-b-[1.5px] border-border bg-background p-4 sm:flex-row sm:items-start"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="flex-1">
            <label htmlFor="new-route-name" className="sr-only">
              Route name
            </label>
            <input
              id="new-route-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={nameIsInvalid}
              aria-describedby={nameIsInvalid ? "new-route-name-error" : undefined}
              placeholder="Route name"
              className={cn("h-8 w-full border-[1.5px] border-border bg-background px-2.5 text-sm")}
            />
            {nameIsInvalid && (
              <p id="new-route-name-error" className="mt-1 text-sm text-destructive">
                Route name is required.
              </p>
            )}
          </div>
          <Button type="submit" disabled={addRoute.isPending}>
            {addRoute.isPending ? "Adding…" : "Add"}
          </Button>
        </form>
      )}

      {addRoute.isError && (
        <p role="alert" className="mt-2 px-4 text-sm text-destructive">
          Could not add the route:{" "}
          {addRoute.error instanceof Error ? addRoute.error.message : "Unknown error"}. Nothing was
          saved.
        </p>
      )}

      {deleteRoute.isError && (
        <p role="alert" className="mt-2 px-4 text-sm text-destructive">
          Could not remove the route:{" "}
          {deleteRoute.error instanceof Error ? deleteRoute.error.message : "Unknown error"}.
          Nothing was removed.
        </p>
      )}

      {loading ? (
        <p className="text-muted-foreground p-4 text-sm">Loading routes…</p>
      ) : routes.length === 0 ? (
        <p className="text-muted-foreground p-4 text-sm">
          No routes yet. Add one above to get started.
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto border-[1.5px] border-t-0 border-border md:block">
            <RouteTable
              rows={visibleRows}
              encounters={encounters}
              generation={generation}
              onDelete={handleDelete}
              deletePending={deleteRoute.isPending}
              onLogEncounter={setLogRoute}
              onEditMon={handleEditMon}
              onResetEncounter={() => undefined}
            />
          </div>
          <div className="md:hidden">
            <RouteCardList
              rows={visibleRows}
              encounters={encounters}
              generation={generation}
              onDelete={handleDelete}
              deletePending={deleteRoute.isPending}
              onLogEncounter={setLogRoute}
              onEditMon={handleEditMon}
              onResetEncounter={() => undefined}
            />
          </div>
        </>
      )}

      {logRoute && (
        <LogEncounterDialog
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setLogRoute(null);
            }
          }}
          runId={activeRunId}
          route={logRoute}
          rules={runQuery.data?.rules ?? DEFAULT_RULES}
          mons={mons}
          existingEncounters={encounters}
        />
      )}

      {editTarget && (
        <EditMonDialog
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setEditTarget(null);
            }
          }}
          route={editTarget.route}
          mon={editTarget.mon}
          rules={runQuery.data?.rules ?? DEFAULT_RULES}
        />
      )}
    </div>
  );
}
