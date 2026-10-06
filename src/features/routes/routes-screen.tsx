import { useState, type FormEvent, type ReactNode } from "react";
import { Navigate, useParams } from "react-router";

import { CHIP_SHAPE } from "@/components/chip";
import { SearchInput } from "@/components/search-input";
import { ScreenHeader } from "@/components/screen-header";
import { statusChipFill, type StatusChipStatus } from "@/components/status-chip";
import { Typography } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { DEFAULT_RULES } from "@/domain/rules";
import { buildRouteRows, type RouteRow } from "@/domain/route-rows";
import type { Mon, Route } from "@/domain/types";
import { GAMES } from "@/game/registry";
import { useAddCustomRoute, useDeleteCustomRoute } from "@/storage/mutations";
import { useEncounters, useMons, useRoutes, useRun } from "@/storage/queries";
import { cn } from "@/lib/utils";

import {
  DialogLoader,
  EditMonDialog,
  LogEncounterDialog,
  ResetEncounterDialog,
} from "./lazy-dialogs";
import { RouteCardList } from "./route-card-list";
import {
  filterRouteRows,
  searchRouteRows,
  summariseRouteRows,
  type RouteFilterBucket,
} from "./route-presentation";
import { RouteTable } from "./route-table";

const COUNTER_CHIPS: readonly {
  bucket: RouteFilterBucket;
  status: StatusChipStatus;
  label: string;
}[] = [
  { bucket: "caught", status: "caught", label: "caught" },
  { bucket: "missed", status: "missed", label: "missed" },
  { bucket: "fainted", status: "fainted", label: "fainted" },
  { bucket: "pending", status: "pending", label: "pending" },
];

function RouteCounters({
  counters,
  activeFilters,
  onToggle,
}: {
  counters: ReturnType<typeof summariseRouteRows>;
  activeFilters: ReadonlySet<RouteFilterBucket>;
  onToggle: (bucket: RouteFilterBucket) => void;
}): ReactNode {
  const filterActive = activeFilters.size > 0;

  return (
    <div
      role="group"
      aria-label="Route counters"
      className="flex flex-wrap items-center justify-between gap-3 border-b-[1.5px] border-border bg-background px-4 py-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        {COUNTER_CHIPS.map(({ bucket, status, label }) => {
          const selected = activeFilters.has(bucket);
          const muted = filterActive && !selected;

          return (
            <button
              key={bucket}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggle(bucket)}
              className={cn(
                CHIP_SHAPE,
                "cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                muted
                  ? "bg-background text-muted-foreground hover:bg-muted"
                  : cn(statusChipFill(status), "hover:brightness-95"),
                filterActive && selected && "shadow-block",
              )}
            >
              <span>
                <Typography as="span" variant="number">
                  {counters[bucket]}
                </Typography>{" "}
                {label}
              </span>
            </button>
          );
        })}
      </div>
      <Typography as="span" variant="number" tone="muted" className="text-sm">
        {counters.covered} / {counters.total}
      </Typography>
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
  const [shinyOpen, setShinyOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{ route: Route; mon: Mon } | null>(null);
  const [resetTarget, setResetTarget] = useState<RouteRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<RouteFilterBucket>>(new Set());
  const [search, setSearch] = useState("");

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
  const visibleRows = searchRouteRows(filterRouteRows(rows, activeFilters), search);
  const counters = summariseRouteRows(rows);
  const trimmedSearch = search.trim();
  // Falls back to HeartGold's generation, the only game seeded today, while the run itself is
  // still loading rather than the table's rows.
  const shinyClause = runQuery.data?.rules.shinyClause === true;
  const generation = GAMES[runQuery.data?.game ?? "heartgold"].generation;

  return (
    <div>
      <ScreenHeader
        title="Encounter routes"
        actions={
          <div className="flex items-center gap-2">
            {shinyClause && (
              <Button
                type="button"
                variant="outline"
                aria-label="Add bonus shiny"
                onClick={() => setShinyOpen(true)}
                className="size-10 shadow-none md:h-10 md:w-auto md:px-4"
              >
                <span aria-hidden="true">✦</span>
                <span aria-hidden="true" className="hidden md:inline">
                  Add bonus shiny
                </span>
              </Button>
            )}
            <Button
              type="button"
              aria-expanded={addOpen}
              className="bg-flag text-foreground shadow-block hover:bg-flag/90"
              onClick={() => setAddOpen((open) => !open)}
            >
              + Add route
            </Button>
          </div>
        }
      />

      {!loading && routes.length > 0 && (
        <div className="border-b-[1.5px] border-border bg-background p-4">
          <div className="flex justify-end">
            <SearchInput
              id="route-search"
              label="Search routes"
              value={search}
              onChange={setSearch}
              className="w-full sm:w-64"
            />
          </div>
        </div>
      )}

      {!loading && routes.length > 0 && (
        <RouteCounters counters={counters} activeFilters={activeFilters} onToggle={toggleFilter} />
      )}

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
              <Typography
                as="p"
                id="new-route-name-error"
                variant="body"
                tone="alert"
                className="mt-1"
              >
                Route name is required.
              </Typography>
            )}
          </div>
          <Button type="submit" disabled={addRoute.isPending}>
            {addRoute.isPending ? "Adding…" : "Add"}
          </Button>
        </form>
      )}

      {addRoute.isError && (
        <Typography as="p" role="alert" variant="body" tone="alert" className="mt-2 px-4">
          Could not add the route:{" "}
          {addRoute.error instanceof Error ? addRoute.error.message : "Unknown error"}. Nothing was
          saved.
        </Typography>
      )}

      {deleteRoute.isError && (
        <Typography as="p" role="alert" variant="body" tone="alert" className="mt-2 px-4">
          Could not remove the route:{" "}
          {deleteRoute.error instanceof Error ? deleteRoute.error.message : "Unknown error"}.
          Nothing was removed.
        </Typography>
      )}

      {loading ? (
        <Typography as="p" variant="body" tone="muted" className="p-4">
          Loading routes…
        </Typography>
      ) : routes.length === 0 ? (
        <Typography as="p" variant="body" tone="muted" className="p-4">
          No routes yet. Add one above to get started.
        </Typography>
      ) : visibleRows.length === 0 ? (
        <Typography as="p" variant="body" tone="muted" className="p-4">
          {trimmedSearch !== ""
            ? `No routes match "${trimmedSearch}".`
            : "No routes match the selected filters."}
        </Typography>
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
              onResetEncounter={setResetTarget}
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
              onResetEncounter={setResetTarget}
            />
          </div>
        </>
      )}

      {logRoute && (
        <DialogLoader>
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
        </DialogLoader>
      )}

      {shinyOpen && (
        <DialogLoader>
          <LogEncounterDialog
            open
            mode="shiny-bonus"
            onOpenChange={(nextOpen) => {
              if (!nextOpen) {
                setShinyOpen(false);
              }
            }}
            runId={activeRunId}
            routes={routes}
            rules={runQuery.data?.rules ?? DEFAULT_RULES}
            mons={mons}
            existingEncounters={encounters}
          />
        </DialogLoader>
      )}

      {editTarget && (
        <DialogLoader>
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
        </DialogLoader>
      )}

      {resetTarget && (
        <DialogLoader>
          <ResetEncounterDialog row={resetTarget} onClose={() => setResetTarget(null)} />
        </DialogLoader>
      )}
    </div>
  );
}
