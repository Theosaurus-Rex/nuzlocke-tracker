import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { canDeleteRoute } from "@/domain/routes";
import type { RouteRow, RouteRowStatus } from "@/domain/route-rows";
import type { Encounter, Route } from "@/domain/types";
import { cn } from "@/lib/utils";

import { RowSpecies, STATUS_LABEL } from "./route-presentation";

function StatusIndicator({ status }: { status: RouteRowStatus }): ReactNode {
  const dashed = status === "not-encountered" || status === "open";

  return (
    <span
      aria-hidden="true"
      className={cn(
        "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2",
        dashed ? "border-dashed" : "border-solid",
        status === "dead" ? "border-destructive" : "border-border",
      )}
    />
  );
}

function RouteCardSubtitle({ row }: { row: RouteRow }): ReactNode {
  if (row.encounter === null) {
    return <p className="text-muted-foreground text-sm">not encountered</p>;
  }

  // A living catch shows its level instead of the word "caught". The nickname and species
  // already say it was caught, and level is what a run with caps is played against.
  const detail =
    row.status === "caught" && row.mon !== null ? `L${row.mon.level}` : STATUS_LABEL[row.status];

  return (
    <p className="text-muted-foreground text-sm">
      <RowSpecies row={row} emptyFallback={<span>&mdash;</span>} /> &middot; {detail}
    </p>
  );
}

export interface RouteCardListProps {
  rows: RouteRow[];
  encounters: readonly Encounter[];
  onDelete: (route: Route) => void;
  deletePending: boolean;
}

export function RouteCardList({
  rows,
  encounters,
  onDelete,
  deletePending,
}: RouteCardListProps): ReactNode {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {rows.map((row) => {
        const removable = canDeleteRoute(row.route, encounters);

        return (
          <li
            key={row.route.id}
            className="flex items-start gap-3 rounded border border-border p-3"
          >
            <StatusIndicator status={row.status} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 truncate">
                  <span>{row.route.name}</span>
                  {row.route.isCustom && (
                    <span className="text-muted-foreground ml-2 rounded border border-border px-1.5 py-0.5 text-xs uppercase">
                      Custom
                    </span>
                  )}
                </div>
                {removable && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={deletePending}
                    onClick={() => onDelete(row.route)}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <RouteCardSubtitle row={row} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
