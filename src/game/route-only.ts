import type { Route } from "@/domain/types";
import type { GameData, RouteDef } from "@/game/types";

export function routeOnly(game: GameData | undefined, route: Route): RouteDef["only"] {
  if (game === undefined || route.isCustom || route.gameRouteId === null) return undefined;
  return game.routes.find((r) => r.id === route.gameRouteId)?.only;
}
