/**
 * Pure helpers over a run's routes. No I/O, no storage, no React.
 */

import type { Encounter, Route } from "./types";

export const ROUTE_ORDER_STEP = 100;

export function nextRouteOrder(routes: readonly Route[]): number {
  if (routes.length === 0) {
    return ROUTE_ORDER_STEP;
  }

  const highest = Math.max(...routes.map((route) => route.order));
  return highest + ROUTE_ORDER_STEP;
}

export function compareRoutes(a: Route, b: Route): number {
  return a.order - b.order;
}

export function canDeleteRoute(route: Route, encounters: readonly Encounter[]): boolean {
  return route.isCustom && !encounters.some((encounter) => encounter.routeId === route.id);
}
