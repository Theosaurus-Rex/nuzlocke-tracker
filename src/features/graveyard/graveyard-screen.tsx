import { useState, type ReactNode } from "react";
import { Navigate, useParams } from "react-router";

import { ScreenHeader } from "@/components/screen-header";
import { Typography } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { GAMES } from "@/game/registry";
import { useDeaths, useFights, useMons, useRoutes, useRun } from "@/storage/queries";

import { DeathTimeline, TimelineEmpty } from "./death-timeline";
import { LogDeathDialog } from "./log-death-dialog";
import { groupDeathsByRoute } from "./timeline";

export function GraveyardScreen(): ReactNode {
  const { runId } = useParams<{ runId: string }>();
  const runQuery = useRun(runId ?? "");
  const deathsQuery = useDeaths(runId ?? "");
  const monsQuery = useMons(runId);
  const routesQuery = useRoutes(runId ?? "");
  const fightsQuery = useFights(runId ?? "");
  const [logOpen, setLogOpen] = useState(false);
  const [editingDeathId, setEditingDeathId] = useState<string | null>(null);

  if (!runId) {
    return <Navigate to="/" replace />;
  }

  const generation = GAMES[runQuery.data?.game ?? "heartgold"].generation;
  const mons = monsQuery.data ?? [];
  const monsById = new Map(mons.map((mon) => [mon.id, mon]));
  const deaths = (deathsQuery.data ?? []).filter((death) => monsById.has(death.monId));
  const editingDeath = deaths.find((death) => death.id === editingDeathId);
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
            className="bg-destructive text-white shadow-block hover:bg-destructive/90"
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
      {loaded && deaths.length === 0 && <TimelineEmpty />}
      {deaths.length > 0 && (
        <DeathTimeline
          timeline={groupDeathsByRoute(deaths, routesQuery.data ?? [])}
          routes={routesQuery.data ?? []}
          monsById={monsById}
          fights={fightsQuery.data ?? []}
          generation={generation}
          onEdit={setEditingDeathId}
        />
      )}
      <LogDeathDialog open={logOpen} onOpenChange={setLogOpen} runId={runId} />
      {editingDeath !== undefined && (
        <LogDeathDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditingDeathId(null);
          }}
          runId={runId}
          death={editingDeath}
        />
      )}
    </div>
  );
}
