import type { ReactNode } from "react";

import { SpeciesTypeBadge } from "@/components/species-type-badge";
import { StatusChip } from "@/components/status-chip";
import { Typography } from "@/components/typography";
import { canDeleteRoute } from "@/domain/routes";
import type { RouteRow } from "@/domain/route-rows";
import type { Encounter, Mon, Route } from "@/domain/types";
import { cn } from "@/lib/utils";

import {
  canLogEncounter,
  chipForRouteRow,
  rowSpeciesId,
  rowTapAction,
  RowSpecies,
  STATUS_LABEL,
} from "./route-presentation";
import { RowEndAction } from "./row-end-action";

function RouteCardSubtitle({ row }: { row: RouteRow }): ReactNode {
  if (row.encounter === null) {
    return (
      <Typography as="p" variant="body" tone="muted">
        tap to log encounter
      </Typography>
    );
  }

  if (row.status === "missed") {
    return (
      <Typography as="p" variant="body" tone="muted">
        <RowSpecies row={row} emptyFallback={<span>&mdash;</span>} />
      </Typography>
    );
  }

  // A dead mon's info (nickname, species, gender, level) is still known, so it renders the same
  // as a living catch. The graveyard chip, not this line, is what says it died.
  if ((row.status === "caught" || row.status === "dead") && row.mon !== null) {
    return (
      <Typography as="p" variant="body" tone="muted">
        <RowSpecies row={row} /> &middot;{" "}
        <Typography as="span" variant="number">
          L{row.mon.level}
        </Typography>
      </Typography>
    );
  }

  return (
    <Typography as="p" variant="body" tone="muted">
      {STATUS_LABEL[row.status]}
    </Typography>
  );
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
        <button
          type="button"
          aria-label="Log encounter"
          onClick={(event) => {
            event.stopPropagation();
            onLog();
          }}
        >
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
        const action = rowTapAction(row);
        const tappable = action.kind !== "none";
        const nameTone = row.status === "missed" ? "muted" : undefined;
        const nameClassName = cn("font-bold", row.status === "missed" && "text-muted-foreground");

        function handleRowTap(): void {
          if (action.kind === "edit") onEditMon(row.route, action.mon);
          else if (action.kind === "log") onLogEncounter(row.route);
        }

        return (
          <li
            key={row.route.id}
            onClick={tappable ? handleRowTap : undefined}
            className={cn(
              "flex items-start justify-between gap-3 border-b border-muted p-3 last:border-b-0",
              canLogEncounter(row) && "bg-flag-tint",
              tappable && "cursor-pointer",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="min-w-0 truncate">
                {action.kind === "none" ? (
                  <Typography as="span" variant="title" tone={nameTone}>
                    {row.route.name}
                  </Typography>
                ) : (
                  <button
                    type="button"
                    aria-label={
                      action.kind === "edit" ? `Open ${row.route.name}` : `Log ${row.route.name}`
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRowTap();
                    }}
                    className={cn(nameClassName, "cursor-pointer bg-transparent p-0 text-left")}
                  >
                    {row.route.name}
                  </button>
                )}
                {row.route.isCustom && (
                  <span
                    className="text-muted-foreground ml-2 border-[1.5px] border-border px-1.5 py-0.5 font-medium tracking-[0.12em] uppercase"
                    style={{ fontSize: "11px" }}
                  >
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
            <RowEndAction
              row={row}
              removable={removable}
              deletePending={deletePending}
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
