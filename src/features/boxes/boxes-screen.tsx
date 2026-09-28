import type { ReactNode } from "react";
import { Navigate, useParams } from "react-router";

import { ScreenHeader } from "@/components/screen-header";
import { Typography } from "@/components/typography";
import type { Mon } from "@/domain/types";
import { GAMES } from "@/game/registry";
import { useMons, useRun } from "@/storage/queries";

import { BoxCard } from "./box-card";

function boxOrderOf(mon: Mon): number {
  return mon.boxOrder ?? Number.POSITIVE_INFINITY;
}

export function boxedMons(mons: readonly Mon[]): Mon[] {
  return mons
    .filter((mon) => mon.status === "box")
    .sort((a, b) => {
      const orderA = boxOrderOf(a);
      const orderB = boxOrderOf(b);
      if (orderA !== orderB) return orderA < orderB ? -1 : 1;
      return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
    });
}

export function BoxesScreen(): ReactNode {
  const { runId } = useParams<{ runId: string }>();
  const runQuery = useRun(runId ?? "");
  const monsQuery = useMons(runId);

  if (!runId) {
    return <Navigate to="/" replace />;
  }

  const generation = GAMES[runQuery.data?.game ?? "heartgold"].generation;
  const boxed = boxedMons(monsQuery.data ?? []);

  return (
    <div>
      <ScreenHeader title="Boxes">
        {!monsQuery.isPending && (
          <Typography variant="body" tone="muted">
            {boxed.length} stored
          </Typography>
        )}
      </ScreenHeader>
      {!monsQuery.isPending && boxed.length === 0 && (
        <Typography variant="body" tone="muted" className="p-4">
          No one in your boxes yet
        </Typography>
      )}
      {boxed.length > 0 && (
        <ul className="grid grid-cols-2 gap-x-6 gap-y-12 p-4 pt-12 lg:grid-cols-3">
          {boxed.map((mon) => (
            <BoxCard key={mon.id} mon={mon} generation={generation} />
          ))}
        </ul>
      )}
    </div>
  );
}
