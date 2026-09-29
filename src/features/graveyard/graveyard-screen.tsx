import type { ReactNode } from "react";
import { Navigate, useParams } from "react-router";

import { ScreenHeader } from "@/components/screen-header";
import { Typography } from "@/components/typography";
import { worstDeathStreak } from "@/domain/derive";
import type { Death } from "@/domain/types";
import { GAMES } from "@/game/registry";
import { useDeaths, useFights, useMons, useRoutes, useRun } from "@/storage/queries";

import { DeathCard } from "./death-card";

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

  if (!runId) {
    return <Navigate to="/" replace />;
  }

  const generation = GAMES[runQuery.data?.game ?? "heartgold"].generation;
  const mons = monsQuery.data ?? [];
  const monsById = new Map(mons.map((mon) => [mon.id, mon]));
  const routeNames = new Map((routesQuery.data ?? []).map((route) => [route.id, route.name]));
  const deaths = newestFirst(deathsQuery.data ?? []).filter((death) => monsById.has(death.monId));
  const loaded = !deathsQuery.isPending && !monsQuery.isPending;

  const latest = deaths[0];
  const latestRoute = latest?.routeId != null ? (routeNames.get(latest.routeId) ?? null) : null;
  const streak = worstDeathStreak(deaths, mons);

  const stripText = [
    `${deaths.length} lost`,
    latestRoute !== null && `most recent: ${latestRoute}`,
    `worst streak: ${streak} in a row`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <ScreenHeader title="Graveyard">
        {loaded && (
          <Typography variant="body" tone="muted">
            {deaths.length} lost this run
          </Typography>
        )}
      </ScreenHeader>
      {loaded && deaths.length > 0 && (
        <Typography
          variant="number"
          tone="muted"
          className="hidden border-b-[1.5px] border-border px-4 py-3 text-sm md:flex"
        >
          {stripText}
        </Typography>
      )}
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
    </div>
  );
}
