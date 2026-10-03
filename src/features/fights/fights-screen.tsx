import { useState, type ReactNode } from "react";
import { Navigate, useParams } from "react-router";

import { ScreenHeader } from "@/components/screen-header";
import { StatusChip } from "@/components/status-chip";
import { Typography } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { badgeCount, buildFightSections } from "@/domain/fight-list";
import type { Fight } from "@/domain/types";
import { currentLevelCap } from "@/domain/rules-summary";
import { GAMES } from "@/game/registry";
import { useDeaths, useFights, useMons, useRun } from "@/storage/queries";

import { AddFightDialog } from "./add-fight-dialog";
import { FightCardList } from "./fight-card-list";
import { FightTable } from "./fight-table";
import { fightLabel } from "./loss-names";
import { LogAttemptDialog } from "./log-attempt-dialog";

export function FightsScreen(): ReactNode {
  const { runId } = useParams<{ runId: string }>();
  const runQuery = useRun(runId ?? "");
  const fightsQuery = useFights(runId ?? "");
  const deathsQuery = useDeaths(runId ?? "");
  const monsQuery = useMons(runId);
  const [adding, setAdding] = useState(false);
  const [logging, setLogging] = useState<{ fight: Fight; label: string } | null>(null);

  if (!runId) {
    return <Navigate to="/" replace />;
  }

  const run = runQuery.data;
  const fights = fightsQuery.data ?? [];
  const loaded = run !== undefined && !fightsQuery.isPending && !deathsQuery.isPending;
  const deaths = deathsQuery.data ?? [];
  const defs = new Map(GAMES[run?.game ?? "heartgold"].fights.map((def) => [def.id, def]));
  const sections = buildFightSections(fights, (id) => defs.get(id), deaths);
  const monsById = new Map((monsQuery.data ?? []).map((mon) => [mon.id, mon]));
  const { earned, total } = badgeCount(fights);
  const cap = run?.rules.levelCaps ? currentLevelCap(fights) : null;
  const onLog = (fight: Fight, label: string): void => setLogging({ fight, label });
  const pending = sections.flatMap((section) =>
    section.rows
      .filter((row) => row.state !== "cleared")
      .map((row) => ({ id: row.fight.id, label: fightLabel(row.fight.name, row.badge) })),
  );
  const badges = `${String(earned)} of ${String(total)} badges`;

  return (
    <div>
      <ScreenHeader
        title="Gyms & Elite Four"
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 md:flex">
              <StatusChip status="caught">{badges}</StatusChip>
              {cap !== null && <StatusChip status="pending">{`Cap L${String(cap)}`}</StatusChip>}
            </div>
            <Button
              type="button"
              variant="outline"
              aria-label="Add fight"
              disabled={!loaded}
              onClick={() => setAdding(true)}
              className="size-10 shadow-none md:h-10 md:w-auto md:px-4"
            >
              <span aria-hidden="true">+</span>
              <span aria-hidden="true" className="hidden md:inline">
                Add fight
              </span>
            </Button>
          </div>
        }
      >
        <Typography as="p" variant="body" tone="muted" className="md:hidden">
          {cap === null ? badges : `${badges} · cap L${String(cap)}`}
        </Typography>
      </ScreenHeader>
      {loaded && sections.length === 0 && (
        <Typography as="p" variant="body" tone="muted" className="p-4">
          No fights for this run.
        </Typography>
      )}
      {loaded && sections.length > 0 && (
        <>
          <div className="hidden md:block">
            <FightTable sections={sections} monsById={monsById} onLog={onLog} deaths={deaths} />
          </div>
          <div className="md:hidden">
            <FightCardList sections={sections} monsById={monsById} onLog={onLog} deaths={deaths} />
          </div>
        </>
      )}
      {adding && (
        <AddFightDialog
          open
          onOpenChange={(open) => {
            if (!open) setAdding(false);
          }}
          runId={runId}
          pending={pending}
        />
      )}
      {logging !== null && (
        <LogAttemptDialog
          open
          onOpenChange={(open) => {
            if (!open) setLogging(null);
          }}
          runId={runId}
          fightId={logging.fight.id}
          label={logging.label}
        />
      )}
    </div>
  );
}
