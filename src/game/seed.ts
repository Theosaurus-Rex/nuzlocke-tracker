/**
 * Builds the draft rows to seed a new run's routes from its game data.
 */

import { ROUTE_ORDER_STEP } from "@/domain/routes";
import type { Draft, Route } from "@/domain/types";

import type { GameData } from "./types";

/**
 * `order` is `def.order * ROUTE_ORDER_STEP`, not the array index, so a row's order stays
 * traceable to the game data and any gap a hand-edit of the route list introduces is preserved.
 */
export function seedRoutes(runId: string, game: GameData): Draft<Route>[] {
  return game.routes.map((def) => ({
    runId,
    name: def.name,
    order: def.order * ROUTE_ORDER_STEP,
    isCustom: false,
    gameRouteId: def.id,
  }));
}
