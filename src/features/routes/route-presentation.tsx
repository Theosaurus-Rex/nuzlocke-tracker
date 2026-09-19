import type { ReactNode } from "react";

import type { RouteRow, RouteRowStatus } from "@/domain/route-rows";
import { speciesDisplayName } from "@/game/pokedex";

export const STATUS_LABEL: Record<RouteRowStatus, string> = {
  "not-encountered": "not encountered",
  open: "open",
  caught: "caught",
  missed: "missed",
  skipped: "skipped",
  dead: "dead",
};

export function RowSpecies({
  row,
  emptyFallback = null,
}: {
  row: RouteRow;
  emptyFallback?: ReactNode;
}): ReactNode {
  if (row.mon !== null) {
    return (
      <span>
        {speciesDisplayName(row.mon.speciesId)}
        {row.mon.nickname !== null && (
          <span className="text-muted-foreground"> &ldquo;{row.mon.nickname}&rdquo;</span>
        )}
      </span>
    );
  }

  if (row.encounter?.speciesId != null) {
    return <span>{speciesDisplayName(row.encounter.speciesId)}</span>;
  }

  return emptyFallback;
}
