/**
 * Pure helpers building the route table's rows. No I/O, no storage, no React.
 */

import type { Encounter, Mon, Route } from "./types";

export type RouteRowStatus = "not-encountered" | "open" | "caught" | "missed" | "skipped" | "dead";

export interface RouteRow {
  route: Route;
  encounter: Encounter | null;
  mon: Mon | null;
  status: RouteRowStatus;
}

/** The earliest of `encounters` by `createdAt`, or undefined if `encounters` is empty. */
function earliestEncounter(encounters: readonly Encounter[]): Encounter | undefined {
  return encounters.reduce<Encounter | undefined>((earliest, encounter) => {
    if (earliest === undefined || encounter.createdAt < earliest.createdAt) {
      return encounter;
    }
    return earliest;
  }, undefined);
}

/**
 * One row per route, in the order `routes` arrives. A `caught` encounter whose mon is dead
 * renders `"dead"`, per the design spec: death is derived from `encounter.monId -> mon.status`,
 * never stored on the encounter itself.
 */
export function buildRouteRows(input: {
  routes: readonly Route[];
  encounters: readonly Encounter[];
  mons: readonly Mon[];
}): RouteRow[] {
  const { routes, encounters, mons } = input;

  const encountersByRoute = new Map<string, Encounter[]>();
  for (const encounter of encounters) {
    const forRoute = encountersByRoute.get(encounter.routeId);
    if (forRoute === undefined) {
      encountersByRoute.set(encounter.routeId, [encounter]);
    } else {
      forRoute.push(encounter);
    }
  }

  const monsById = new Map(mons.map((mon) => [mon.id, mon]));

  return routes.map((route) => {
    const encounter = earliestEncounter(encountersByRoute.get(route.id) ?? []) ?? null;

    if (encounter === null) {
      return { route, encounter: null, mon: null, status: "not-encountered" };
    }

    const mon = encounter.monId === null ? null : (monsById.get(encounter.monId) ?? null);
    const status: RouteRowStatus =
      encounter.status === "caught" && mon?.status === "dead" ? "dead" : encounter.status;

    return { route, encounter, mon, status };
  });
}
