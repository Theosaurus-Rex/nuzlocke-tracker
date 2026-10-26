import type { Encounter, Route, Rules } from "@/domain/types";
import type { GameData, RouteDef } from "@/game/types";

export function routeOnly(game: GameData | undefined, route: Route): RouteDef["only"] {
  if (game === undefined || route.isCustom || route.gameRouteId === null) return undefined;
  return game.routes.find((r) => r.id === route.gameRouteId)?.only;
}

/** Gift-only routes that No gifts bans. They cannot be logged. */
export function blockedRouteIds(
  game: GameData | undefined,
  routes: readonly Route[],
  rules: Rules,
): Set<string> {
  if (!rules.noGifts) return new Set();
  return new Set(routes.filter((r) => routeOnly(game, r) === "gift").map((r) => r.id));
}

/**
 * Routes left out of the route totals. That is every blocked route, and under the gift clause
 * any gift-only route with no encounter, since a free gift neither uses nor misses it.
 */
export function routeIdsOutOfTotals(
  game: GameData | undefined,
  routes: readonly Route[],
  encounters: readonly Encounter[],
  rules: Rules,
): Set<string> {
  const ids = blockedRouteIds(game, routes, rules);
  if (!rules.giftClause) return ids;
  const withEncounter = new Set(encounters.map((e) => e.routeId));
  for (const route of routes) {
    if (routeOnly(game, route) === "gift" && !withEncounter.has(route.id)) ids.add(route.id);
  }
  return ids;
}
