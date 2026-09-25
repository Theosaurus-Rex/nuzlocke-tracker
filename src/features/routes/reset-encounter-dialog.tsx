import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { RouteRow } from "@/domain/route-rows";
import type { Death, Fight, Mon } from "@/domain/types";
import { speciesDisplayName } from "@/game/pokeapi/resolve";
import { useResetEncounter } from "@/storage/mutations";
import { useDeaths, useFights } from "@/storage/queries";

function monLabel(mon: Mon): string {
  return mon.nickname
    ? `${mon.nickname} the ${speciesDisplayName(mon.speciesId)}`
    : speciesDisplayName(mon.speciesId);
}

function killerNameFor(death: Death | null, fights: readonly Fight[]): string | null {
  if (death === null) {
    return null;
  }
  const cause = death.cause;
  if (cause.type !== "trainer") {
    return null;
  }
  if (cause.fightId !== null) {
    return fights.find((fight) => fight.id === cause.fightId)?.name ?? null;
  }
  return cause.trainerName;
}

export function describeReset({
  routeName,
  mon,
  death,
  killerName,
}: {
  routeName: string;
  mon: Mon | null;
  death: Death | null;
  killerName: string | null;
}): string {
  if (mon === null) {
    return `Reset ${routeName}? It goes back to not encountered.`;
  }

  const deathClause =
    death === null
      ? ""
      : killerName === null
        ? " and the record of its death"
        : ` and the record of its death to ${killerName}`;

  return `Reset ${routeName}? This also deletes ${monLabel(mon)}${deathClause}. This can't be undone.`;
}

export interface ResetEncounterDialogProps {
  row: RouteRow;
  onClose: () => void;
}

export function ResetEncounterDialog({ row, onClose }: ResetEncounterDialogProps): ReactNode {
  const deathsQuery = useDeaths(row.route.runId);
  const fightsQuery = useFights(row.route.runId);
  const resetEncounter = useResetEncounter();

  const encounter = row.encounter;
  if (encounter === null) {
    return null;
  }

  const death = deathsQuery.data?.find((candidate) => candidate.monId === row.mon?.id) ?? null;
  const killerName = killerNameFor(death, fightsQuery.data ?? []);
  const message = describeReset({ routeName: row.route.name, mon: row.mon, death, killerName });

  const handleReset = (): void => {
    resetEncounter.mutate({ encounter }, { onSuccess: onClose });
  };

  return (
    <Dialog
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogTitle>Reset encounter</DialogTitle>
        <p className="text-sm text-muted-foreground">{message}</p>

        {resetEncounter.isError && (
          <p role="alert" className="text-sm text-destructive">
            Could not reset the encounter:{" "}
            {resetEncounter.error instanceof Error ? resetEncounter.error.message : "Unknown error"}
            . Nothing was removed.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" autoFocus onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={resetEncounter.isPending}
            onClick={handleReset}
          >
            {resetEncounter.isPending ? "Resetting…" : "Reset encounter"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
