import type { ReactNode } from "react";
import { Navigate, useParams } from "react-router";

import { ScreenHeader } from "@/components/screen-header";
import { Typography } from "@/components/typography";
import { MAX_PARTY_SIZE } from "@/domain/transitions";
import type { Mon } from "@/domain/types";
import { GAMES } from "@/game/registry";
import { useMons, useRoutes, useRun } from "@/storage/queries";

import { PartyCard } from "./party-card";

function partySlotOrder(mon: Mon): number {
  return mon.partySlot ?? Number.POSITIVE_INFINITY;
}

export function partyMembers(mons: readonly Mon[]): Mon[] {
  return mons
    .filter((mon) => mon.status === "party")
    .sort((a, b) => {
      const orderA = partySlotOrder(a);
      const orderB = partySlotOrder(b);
      return orderA === orderB ? 0 : orderA - orderB;
    });
}

export function PartyScreen(): ReactNode {
  const { runId } = useParams<{ runId: string }>();
  const runQuery = useRun(runId ?? "");
  const routesQuery = useRoutes(runId ?? "");
  const monsQuery = useMons(runId);

  if (!runId) {
    return <Navigate to="/" replace />;
  }

  const generation = GAMES[runQuery.data?.game ?? "heartgold"].generation;
  const party = partyMembers(monsQuery.data ?? []);
  const routeNames = new Map((routesQuery.data ?? []).map((route) => [route.id, route.name]));

  return (
    <div>
      <ScreenHeader title="Party">
        <Typography variant="body" tone="muted">
          {party.length} of {PARTY_SIZE}
        </Typography>
      </ScreenHeader>
      {!monsQuery.isPending && party.length === 0 && (
        <Typography variant="body" tone="muted" className="p-4">
          No one in your party yet
        </Typography>
      )}
      {party.length > 0 && (
        <ul className="grid gap-6 p-4 md:grid-cols-2">
          {party.map((mon) => (
            <PartyCard
              key={mon.id}
              mon={mon}
              routeName={
                mon.caughtRouteId === null ? null : (routeNames.get(mon.caughtRouteId) ?? null)
              }
              generation={generation}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
