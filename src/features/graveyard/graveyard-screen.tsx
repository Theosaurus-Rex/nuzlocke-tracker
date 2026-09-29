import { useState, type ReactNode } from "react";
import { Navigate, useParams } from "react-router";

import { ScreenHeader } from "@/components/screen-header";
import { Typography } from "@/components/typography";
import { Button } from "@/components/ui/button";
import type { Death } from "@/domain/types";
import { GAMES } from "@/game/registry";
import { useDeaths, useFights, useMons, useRoutes, useRun } from "@/storage/queries";

import { DeathCard } from "./death-card";
import { LogDeathDialog } from "./log-death-dialog";

function newestFirst(deaths: readonly Death[]): Death[] {
  return [...deaths].sort(
    (a, b) => b.diedAt.localeCompare(a.diedAt) || b.createdAt.localeCompare(a.createdAt),
  );
}

export function GraveyardScreen(): ReactNode {
  const { runId } = useParams<{ runId: string }>();
  const runQuery = useRun(runId ?? "");
  const deathsQuery = useDeaths(runId ?? "");
  const monsQuery = useMons(runId);
  const routesQuery = useRoutes(runId ?? "");
  const fightsQuery = useFights(runId ?? "");
  const [logOpen, setLogOpen] = useState(false);

  if (!runId) {
    return <Navigate to="/" replace />;
  }

  const generation = GAMES[runQuery.data?.game ?? "heartgold"].generation;
  const mons = monsQuery.data ?? [];
  const monsById = new Map(mons.map((mon) => [mon.id, mon]));
  const routeNames = new Map((routesQuery.data ?? []).map((route) => [route.id, route.name]));
  const deaths = newestFirst(deathsQuery.data ?? []).filter((death) => monsById.has(death.monId));
  const hasLiving = mons.some((mon) => mon.status !== "dead");
  const loaded = !deathsQuery.isPending && !monsQuery.isPending;

  return (
    <div>
      <ScreenHeader
        title="Graveyard"
        actions={
          <Button
            type="button"
            aria-label="Log a death"
            disabled={!hasLiving}
            className="bg-destructive text-primary-foreground shadow-block hover:bg-destructive/90"
            onClick={() => setLogOpen(true)}
          >
            <span className="sm:hidden">+ Log</span>
            <span className="hidden sm:inline">+ Log a death</span>
          </Button>
        }
      >
        {loaded && (
          <Typography variant="body" tone="muted">
            {deaths.length} lost this run
          </Typography>
        )}
      </ScreenHeader>
      {loaded && deaths.length === 0 && (
        <Typography variant="body" tone="muted" className="p-4">
          No one has fallen yet
        </Typography>
      )}
      {deaths.length > 0 && (
        <ul className="grid gap-y-5 p-4 pr-6">
          {deaths.map((death) => {
            const mon = monsById.get(death.monId);
            if (!mon) return null;
            return (
              <DeathCard
                key={death.id}
                death={death}
                mon={mon}
                routeName={death.routeId === null ? null : (routeNames.get(death.routeId) ?? null)}
                fights={fightsQuery.data ?? []}
                generation={generation}
              />
            );
          })}
        </ul>
      )}
      <LogDeathDialog open={logOpen} onOpenChange={setLogOpen} runId={runId} />
    </div>
  );
}
