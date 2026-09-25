import type { ReactNode } from "react";

import { SpeciesTypeBadge } from "@/components/species-type-badge";
import { StatusChip } from "@/components/status-chip";
import { canDeleteRoute } from "@/domain/routes";
import type { RouteRow } from "@/domain/route-rows";
import type { Encounter, Mon, Route } from "@/domain/types";
import { cn } from "@/lib/utils";

import {
  canLogEncounter,
  chipForRouteRow,
  rowSpeciesId,
  RowSpecies,
  STATUS_LABEL,
} from "./route-presentation";
import { RowActionsMenu } from "./row-actions-menu";

function RouteCardSubtitle({ row }: { row: RouteRow }): ReactNode {
  if (row.encounter === null) {
    return <p className="text-muted-foreground text-sm">tap to log encounter</p>;
  }

  if (row.status === "missed") {
    return (
      <p className="text-muted-foreground text-sm">
        <RowSpecies row={row} emptyFallback={<span>&mdash;</span>} />
      </p>
    );
  }

  // A dead mon's info (nickname, species, gender, level) is still known, so it renders the same
  // as a living catch. The graveyard chip, not this line, is what says it died.
  if ((row.status === "caught" || row.status === "dead") && row.mon !== null) {
    return (
      <p className="text-muted-foreground text-sm">
        <RowSpecies row={row} /> &middot; <span className="font-mono">L{row.mon.level}</span>
      </p>
    );
  }

  return <p className="text-muted-foreground text-sm">{STATUS_LABEL[row.status]}</p>;
}

function RouteCardBadges({
  row,
  generation,
  onLog,
}: {
  row: RouteRow;
  generation: number;
  onLog: () => void;
}): ReactNode {
  const chip = chipForRouteRow(row);

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <SpeciesTypeBadge speciesId={rowSpeciesId(row)} generation={generation} />
      {canLogEncounter(row) ? (
        <button type="button" aria-label="Log encounter" onClick={onLog}>
          <StatusChip status={chip.status}>{chip.label}</StatusChip>
        </button>
      ) : (
        <StatusChip status={chip.status}>{chip.label}</StatusChip>
      )}
    </div>
  );
}

export interface RouteCardListProps {
  rows: RouteRow[];
  encounters: readonly Encounter[];
  generation: number;
  onDelete: (route: Route) => void;
  deletePending: boolean;
  onLogEncounter: (route: Route) => void;
  onEditMon: (route: Route, mon: Mon) => void;
  onResetEncounter: (row: RouteRow) => void;
}

export function RouteCardList({
  rows,
  encounters,
  generation,
  onDelete,
  deletePending,
  onLogEncounter,
  onEditMon,
  onResetEncounter,
}: RouteCardListProps): ReactNode {
  return (
    <ul className="m-0 flex list-none flex-col border-[1.5px] border-border bg-card p-0">
      {rows.map((row) => {
        const removable = canDeleteRoute(row.route, encounters);

        return (
          <li
            key={row.route.id}
            className={cn(
              "flex items-start justify-between gap-3 border-b border-muted p-3 last:border-b-0",
              canLogEncounter(row) && "bg-flag-tint",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="min-w-0 truncate">
                <span
                  className={cn("font-bold", row.status === "missed" && "text-muted-foreground")}
                >
                  {row.route.name}
                </span>
                {row.route.isCustom && (
                  <span className="text-muted-foreground ml-2 border-[1.5px] border-border px-1.5 py-0.5 text-[11px] font-medium tracking-[0.12em] uppercase">
                    Custom
                  </span>
                )}
              </div>
              <RouteCardSubtitle row={row} />
            </div>
            <RouteCardBadges
              row={row}
              generation={generation}
              onLog={() => onLogEncounter(row.route)}
            />
            <RowActionsMenu
              row={row}
              removable={removable}
              deletePending={deletePending}
              onEditMon={onEditMon}
              onReset={onResetEncounter}
              onDelete={onDelete}
              className="shrink-0"
            />
          </li>
        );
      })}
    </ul>
  );
}
