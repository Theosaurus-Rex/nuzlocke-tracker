import type { ReactNode } from "react";

import type { StatusChipStatus } from "@/components/status-chip";
import type { RouteRow, RouteRowStatus } from "@/domain/route-rows";
import type { Gender } from "@/domain/types";
import { speciesDisplayName } from "@/game/pokeapi/resolve";

export const STATUS_LABEL: Record<RouteRowStatus, string> = {
  "not-encountered": "not encountered",
  open: "open",
  caught: "caught",
  missed: "missed",
  skipped: "skipped",
  dead: "dead",
};

export function genderSymbol(gender: Gender | null): string | null {
  if (gender === "male") return "♂";
  if (gender === "female") return "♀";
  return null;
}

/** The species a row is about: the mon's current species if caught, else what was encountered. */
export function rowSpeciesId(row: RouteRow): string | null {
  return row.mon?.speciesId ?? row.encounter?.speciesId ?? null;
}

export function RowSpecies({
  row,
  emptyFallback = null,
}: {
  row: RouteRow;
  emptyFallback?: ReactNode;
}): ReactNode {
  if (row.mon !== null) {
    const gender = genderSymbol(row.mon.gender);
    return (
      <span>
        {row.mon.nickname !== null && (
          <span className="text-muted-foreground">&ldquo;{row.mon.nickname}&rdquo; </span>
        )}
        <span>{speciesDisplayName(row.mon.speciesId)}</span>
        {gender !== null && <span> {gender}</span>}
      </span>
    );
  }

  if (row.encounter?.speciesId != null) {
    return (
      <span>
        <span>{speciesDisplayName(row.encounter.speciesId)}</span>
        {row.status === "missed" && <span className="text-muted-foreground"> &mdash; fled</span>}
      </span>
    );
  }

  return emptyFallback;
}

export interface RouteRowChip {
  status: StatusChipStatus;
  label?: string;
}

/**
 * The one place `RouteRowStatus` becomes a chip, so `RouteTable` and `RouteCardList` cannot
 * drift. A `caught` row shows where the mon actually is, falling back to the generic word only
 * when hand-edited or partial data leaves the mon missing.
 */
export function chipForRouteRow(row: RouteRow): RouteRowChip {
  switch (row.status) {
    case "not-encountered":
    case "open":
      return { status: "log" };
    case "missed":
      return { status: "missed" };
    case "dead":
      return { status: "fainted" };
    case "skipped":
      return { status: "clause", label: "skipped" };
    case "caught":
      if (row.mon === null) return { status: "caught" };
      return row.mon.status === "box" ? { status: "boxed" } : { status: "party" };
  }
}

/**
 * Whether a row's chip is also its log affordance. `open` shows the same "log" text as
 * `not-encountered` but stays a plain chip: an encounter already exists, so there is nothing for
 * a second log action to do.
 */
export function canLogEncounter(row: RouteRow): boolean {
  return row.status === "not-encountered";
}

export type RouteBucket = "caught" | "missed" | "fainted" | "pending" | "skipped";

export function routeBucket(row: RouteRow): RouteBucket {
  switch (row.status) {
    case "caught":
      return "caught";
    case "missed":
      return "missed";
    case "dead":
      return "fainted";
    case "skipped":
      return "skipped";
    case "not-encountered":
    case "open":
      return "pending";
  }
}

export interface RouteCounters {
  caught: number;
  missed: number;
  fainted: number;
  pending: number;
  covered: number;
  total: number;
}

/**
 * Tallies rows into four buckets plus the covered/total figure. `skipped` rows count toward
 * neither bucket nor `pending`: a skipped route is resolved, so it counts toward `covered`, but
 * has no chip of its own.
 */
export function summariseRouteRows(rows: readonly RouteRow[]): RouteCounters {
  let caught = 0;
  let missed = 0;
  let fainted = 0;
  let pending = 0;

  for (const row of rows) {
    const bucket = routeBucket(row);
    if (bucket === "caught") caught += 1;
    else if (bucket === "missed") missed += 1;
    else if (bucket === "fainted") fainted += 1;
    else if (bucket === "pending") pending += 1;
  }

  return { caught, missed, fainted, pending, covered: rows.length - pending, total: rows.length };
}

export type RouteFilterBucket = Exclude<RouteBucket, "skipped">;

export const ROUTE_FILTER_BUCKETS: readonly RouteFilterBucket[] = [
  "caught",
  "missed",
  "fainted",
  "pending",
];

/**
 * Empty `active` means no filter is applied and every row shows, `skipped` included. A skipped
 * route has no checkbox of its own, so it always shows once a filter is applied too, rather than
 * becoming unreachable through a bucket nobody can select.
 */
export function filterRouteRows(
  rows: readonly RouteRow[],
  active: ReadonlySet<RouteFilterBucket>,
): RouteRow[] {
  if (active.size === 0) return [...rows];

  return rows.filter((row) => {
    const bucket = routeBucket(row);
    return bucket === "skipped" || active.has(bucket);
  });
}
