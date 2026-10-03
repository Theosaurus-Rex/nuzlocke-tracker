/**
 * Builds the draft rows to seed a new run's routes and fights from its game data.
 */

import { FIGHT_ORDER_STEP } from "@/domain/fight-list";
import { ROUTE_ORDER_STEP } from "@/domain/routes";
import type { Draft, Fight, Route } from "@/domain/types";

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

export function seedFights(runId: string, game: GameData): Draft<Fight>[] {
  return game.fights.map((def) => ({
    runId,
    gameFightId: def.id,
    name: def.name,
    kind: def.kind,
    order: def.order * FIGHT_ORDER_STEP,
    grantsBadge: def.grantsBadge,
    levelCap: def.levelCap,
    status: "pending",
    clearedAt: null,
  }));
}
