import { useState, type FormEvent, type ReactNode } from "react";
import { Navigate, useParams } from "react-router";

import { Button } from "@/components/ui/button";
import { DEFAULT_RULES } from "@/domain/rules";
import { buildRouteRows } from "@/domain/route-rows";
import type { Mon, Route } from "@/domain/types";
import { EditMonDialog } from "@/features/encounters/edit-mon-dialog";
import { LogEncounterDialog } from "@/features/encounters/log-encounter-dialog";
import { useAddCustomRoute, useDeleteCustomRoute } from "@/storage/mutations";
import { useEncounters, useMons, useRoutes, useRun } from "@/storage/queries";

import { RouteCardList } from "./route-card-list";
import { RouteTable } from "./route-table";

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

  const loading = routesQuery.isPending || encountersQuery.isPending || monsQuery.isPending;
  const routes = routesQuery.data ?? [];
  const encounters = encountersQuery.data ?? [];
  const mons = monsQuery.data ?? [];

  const rows = buildRouteRows({ routes, encounters, mons });

  return (
    <div className="p-4">
      <h1 className="text-xl">Encounter routes</h1>

      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start"
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
            className="h-8 w-full rounded border border-border bg-background px-2.5 text-sm"
          />
          {nameIsInvalid && (
            <p id="new-route-name-error" className="mt-1 text-sm text-destructive">
              Route name is required.
            </p>
          )}
        </div>
        <Button type="submit" disabled={addRoute.isPending}>
          {addRoute.isPending ? "Adding…" : "Add route"}
        </Button>
      </form>

      {addRoute.isError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Could not add the route:{" "}
          {addRoute.error instanceof Error ? addRoute.error.message : "Unknown error"}. Nothing was
          saved.
        </p>
      )}

      {deleteRoute.isError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Could not remove the route:{" "}
          {deleteRoute.error instanceof Error ? deleteRoute.error.message : "Unknown error"}.
          Nothing was removed.
        </p>
      )}

      {loading ? (
        <p className="text-muted-foreground mt-4 text-sm">Loading routes…</p>
      ) : routes.length === 0 ? (
        <p className="text-muted-foreground mt-4 text-sm">
          No routes yet. Add one above to get started.
        </p>
      ) : (
        <>
          <div className="mt-4 hidden overflow-x-auto rounded border border-border md:block">
            <RouteTable
              rows={rows}
              encounters={encounters}
              onDelete={handleDelete}
              deletePending={deleteRoute.isPending}
              onLogEncounter={setLogRoute}
              onEditMon={handleEditMon}
            />
          </div>
          <div className="mt-4 md:hidden">
            <RouteCardList
              rows={rows}
              encounters={encounters}
              onDelete={handleDelete}
              deletePending={deleteRoute.isPending}
              onLogEncounter={setLogRoute}
              onEditMon={handleEditMon}
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
