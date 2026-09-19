import { useState, type FormEvent, type ReactNode } from "react";
import { Navigate, useParams } from "react-router";

import { Button } from "@/components/ui/button";
import { buildRouteRows } from "@/domain/route-rows";
import { canDeleteRoute } from "@/domain/routes";
import type { Encounter, Route } from "@/domain/types";
import { useAddCustomRoute, useDeleteCustomRoute } from "@/storage/mutations";
import { useEncounters, useMons, useRoutes } from "@/storage/queries";

import { DevSeedEncounters } from "./dev-seed-encounters";
import { RouteTable } from "./route-table";

function RouteListItem({
  route,
  encounters,
  onDelete,
  deletePending,
}: {
  route: Route;
  encounters: readonly Encounter[];
  onDelete: (route: Route) => void;
  deletePending: boolean;
}): ReactNode {
  const removable = canDeleteRoute(route, encounters);

  return (
    <li className="flex items-center justify-between gap-3 rounded border border-border p-3">
      <div className="min-w-0 truncate">
        <span>{route.name}</span>
        {route.isCustom && (
          <span className="text-muted-foreground ml-2 rounded border border-border px-1.5 py-0.5 text-xs uppercase">
            Custom
          </span>
        )}
      </div>
      {removable && (
        <Button size="sm" variant="ghost" disabled={deletePending} onClick={() => onDelete(route)}>
          Remove
        </Button>
      )}
    </li>
  );
}

export function RoutesScreen(): ReactNode {
  const { runId } = useParams<{ runId: string }>();
  const routesQuery = useRoutes(runId ?? "");
  const encountersQuery = useEncounters(runId);
  const monsQuery = useMons(runId);
  const addRoute = useAddCustomRoute();
  const deleteRoute = useDeleteCustomRoute();

  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);

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

      {import.meta.env.DEV && <DevSeedEncounters runId={activeRunId} routes={routes} />}

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
            />
          </div>
          <ol className="mt-4 flex list-none flex-col gap-2 p-0 md:hidden">
            {routes.map((route) => (
              <RouteListItem
                key={route.id}
                route={route}
                encounters={encounters}
                onDelete={handleDelete}
                deletePending={deleteRoute.isPending}
              />
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
