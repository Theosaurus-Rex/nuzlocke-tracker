import { useState, type ReactNode } from "react";
import { Navigate, useParams } from "react-router";

import { ScreenHeader } from "@/components/screen-header";
import { StatusChip } from "@/components/status-chip";
import { Typography } from "@/components/typography";
import { badgeCount, buildFightSections } from "@/domain/fight-list";
import type { Fight } from "@/domain/types";
import { currentLevelCap } from "@/domain/rules-summary";
import { GAMES } from "@/game/registry";
import { useDeaths, useFights, useMons, useRun } from "@/storage/queries";

import { FightCardList } from "./fight-card-list";
import { FightTable } from "./fight-table";
import { LogAttemptDialog } from "./log-attempt-dialog";

export function FightsScreen(): ReactNode {
  const { runId } = useParams<{ runId: string }>();
  const runQuery = useRun(runId ?? "");
  const fightsQuery = useFights(runId ?? "");
  const deathsQuery = useDeaths(runId ?? "");
  const monsQuery = useMons(runId);
  const [logging, setLogging] = useState<{ fight: Fight; label: string } | null>(null);

  if (!runId) {
    return <Navigate to="/" replace />;
  }

  const run = runQuery.data;
  const fights = fightsQuery.data ?? [];
  const loaded = run !== undefined && !fightsQuery.isPending && !deathsQuery.isPending;
  const defs = new Map(GAMES[run?.game ?? "heartgold"].fights.map((def) => [def.id, def]));
  const sections = buildFightSections(fights, (id) => defs.get(id), deathsQuery.data ?? []);
  const monsById = new Map((monsQuery.data ?? []).map((mon) => [mon.id, mon]));
  const { earned, total } = badgeCount(fights);
  const cap = run?.rules.levelCaps ? currentLevelCap(fights) : null;
  const onLog = (fight: Fight, label: string): void => setLogging({ fight, label });
  const badges = `${String(earned)} of ${String(total)} badges`;

  return (
    <div>
      <ScreenHeader
        title="Gyms & Elite Four"
        actions={
          <div className="hidden items-center gap-2 md:flex">
            <StatusChip status="caught">{badges}</StatusChip>
            {cap !== null && <StatusChip status="pending">{`Cap L${String(cap)}`}</StatusChip>}
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
            <FightTable sections={sections} monsById={monsById} onLog={onLog} />
          </div>
          <div className="md:hidden">
            <FightCardList sections={sections} monsById={monsById} onLog={onLog} />
          </div>
        </>
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
          roster={defs.get(logging.fight.gameFightId ?? "")?.roster ?? null}
        />
      )}
    </div>
  );
}
