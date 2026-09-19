import { describe, expect, test } from "vitest";

import { ROUTE_ORDER_STEP } from "@/domain/routes";

import { seedRoutes } from "@/game/seed";
import type { GameData, RouteDef } from "@/game/types";

function makeGame(routes: RouteDef[]): GameData {
  return {
    id: "heartgold",
    name: "Test Game",
    generation: 4,
    routes,
    fights: [],
  };
}

describe("seedRoutes", () => {
  test("produces one draft per game route", () => {
    const game = makeGame([
      { id: "route-29", name: "Route 29", order: 1, region: "johto" },
      { id: "route-30", name: "Route 30", order: 2, region: "johto" },
      { id: "route-31", name: "Route 31", order: 3, region: "johto" },
    ]);

    const drafts = seedRoutes("run-1", game);

    expect(drafts).toHaveLength(3);
  });

  test("each draft carries the run id, the game route id, and isCustom: false", () => {
    const game = makeGame([{ id: "route-29", name: "Route 29", order: 1, region: "johto" }]);

    const [draft] = seedRoutes("run-1", game);

    expect(draft).toMatchObject({
      runId: "run-1",
      name: "Route 29",
      gameRouteId: "route-29",
      isCustom: false,
    });
  });

  test("orders are the declared order multiplied by ROUTE_ORDER_STEP, spacing them apart", () => {
    const game = makeGame([
      { id: "route-29", name: "Route 29", order: 1, region: "johto" },
      { id: "route-30", name: "Route 30", order: 2, region: "johto" },
      { id: "route-31", name: "Route 31", order: 5, region: "johto" },
    ]);

    const orders = seedRoutes("run-1", game).map((draft) => draft.order);

    expect(orders).toEqual([1 * ROUTE_ORDER_STEP, 2 * ROUTE_ORDER_STEP, 5 * ROUTE_ORDER_STEP]);
  });
});
