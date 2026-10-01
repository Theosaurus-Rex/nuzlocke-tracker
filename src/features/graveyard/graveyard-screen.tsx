import { useState, type ReactNode } from "react";
import { Navigate, useParams } from "react-router";

import { ScreenHeader } from "@/components/screen-header";
import { Typography } from "@/components/typography";
import { ViewToggle } from "@/components/view-toggle";
import { Button } from "@/components/ui/button";
import type { Death } from "@/domain/types";
import { useRememberedChoice } from "@/lib/use-remembered-choice";
import { GAMES } from "@/game/registry";
import { useDeaths, useFights, useMons, useRoutes, useRun } from "@/storage/queries";

import { DeathCard } from "./death-card";
import { DeathTimeline, TimelineEmpty } from "./death-timeline";
import { LogDeathDialog } from "./log-death-dialog";
import { groupDeathsByRoute } from "./timeline";

type GraveyardView = "timeline" | "list";

export const GRAVEYARD_VIEW_STORAGE_KEY = "nuzlocke.graveyardView";

const GRAVEYARD_VIEWS: readonly GraveyardView[] = ["timeline", "list"];

const VIEW_OPTIONS: readonly { value: GraveyardView; label: string }[] = [
  { value: "timeline", label: "Timeline" },
  { value: "list", label: "List" },
];

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
  const [view, setView] = useRememberedChoice(
    GRAVEYARD_VIEW_STORAGE_KEY,
    GRAVEYARD_VIEWS,
    "timeline",
  );
  const [logOpen, setLogOpen] = useState(false);
  const [editingDeathId, setEditingDeathId] = useState<string | null>(null);

  if (!runId) {
    return <Navigate to="/" replace />;
  }

  const generation = GAMES[runQuery.data?.game ?? "heartgold"].generation;
  const mons = monsQuery.data ?? [];
  const monsById = new Map(mons.map((mon) => [mon.id, mon]));
  const routeNames = new Map((routesQuery.data ?? []).map((route) => [route.id, route.name]));
  const deaths = newestFirst(deathsQuery.data ?? []).filter((death) => monsById.has(death.monId));
  const editingDeath = deaths.find((death) => death.id === editingDeathId);
  const hasLiving = mons.some((mon) => mon.status !== "dead");
  const loaded = !deathsQuery.isPending && !monsQuery.isPending;

  return (
    <div>
      <ScreenHeader
        title="Graveyard"
        actions={
          <div className="contents md:flex md:items-center md:gap-3">
            <ViewToggle
              label="Graveyard view"
              options={VIEW_OPTIONS}
              value={view}
              onChange={setView}
              className="order-last w-full md:order-none md:w-auto [&>button]:flex-1 md:[&>button]:flex-none"
            />
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
          </div>
        }
      >
        {loaded && (
          <Typography variant="body" tone="muted">
            {deaths.length} lost this run
          </Typography>
        )}
      </ScreenHeader>
      {loaded && deaths.length === 0 && view === "timeline" && <TimelineEmpty />}
      {loaded && deaths.length === 0 && view === "list" && (
        <Typography variant="body" tone="muted" className="p-4">
          No one has fallen yet
        </Typography>
      )}
      {deaths.length > 0 && view === "timeline" && (
        <DeathTimeline
          timeline={groupDeathsByRoute(deaths, routesQuery.data ?? [])}
          monsById={monsById}
          fights={fightsQuery.data ?? []}
          generation={generation}
          onEdit={setEditingDeathId}
        />
      )}
      {deaths.length > 0 && view === "list" && (
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
                onEdit={() => setEditingDeathId(death.id)}
              />
            );
          })}
        </ul>
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
