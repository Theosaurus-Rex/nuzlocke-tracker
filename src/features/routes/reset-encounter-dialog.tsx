import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { RouteRow } from "@/domain/route-rows";
import type { Death, Fight, Mon } from "@/domain/types";
import { speciesDisplayName } from "@/game/pokeapi/resolve";
import { useResetEncounter } from "@/storage/mutations";
import { useDeaths, useFights } from "@/storage/queries";
import { cn } from "@/lib/utils";

function monLabel(mon: Mon): string {
  return mon.nickname
    ? `${mon.nickname} the ${speciesDisplayName(mon.speciesId)}`
    : speciesDisplayName(mon.speciesId);
}

export function describeReset({
  routeName,
  mon,
  death,
  fights,
}: {
  routeName: string;
  mon: Mon | null;
  death: Death | null;
  fights: readonly Fight[];
}): string {
  if (mon === null) {
    return `Reset ${routeName}? It goes back to not encountered.`;
  }

  let killerName: string | null = null;
  if (death !== null) {
    const cause = death.cause;
    if (cause.type === "trainer") {
      killerName =
        cause.fightId !== null
          ? (fights.find((fight) => fight.id === cause.fightId)?.name ?? null)
          : cause.trainerName;
    }
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

  const deaths = deathsQuery.data;
  const fights = fightsQuery.data;
  const ready = deaths !== undefined && fights !== undefined;
  const loadError = deathsQuery.error ?? fightsQuery.error ?? null;

  let message: string;
  let messageIsError = false;

  if (ready) {
    const death = deaths.find((candidate) => candidate.monId === row.mon?.id) ?? null;
    message = describeReset({ routeName: row.route.name, mon: row.mon, death, fights });
  } else if (loadError !== null) {
    messageIsError = true;
    message = `Could not check what this removes: ${
      loadError instanceof Error ? loadError.message : "Unknown error"
    }.`;
  } else {
    message = "Checking what this removes…";
  }

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
        <DialogDescription
          role={messageIsError ? "alert" : undefined}
          className={cn(messageIsError && "text-destructive")}
        >
          {message}
        </DialogDescription>

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
            disabled={!ready || resetEncounter.isPending}
            onClick={handleReset}
          >
            {resetEncounter.isPending ? "Resetting…" : "Reset encounter"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
