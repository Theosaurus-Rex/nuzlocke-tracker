import { describe, expect, test } from "vitest";

import { firered } from "@/game/data/frlg";
import { routeOnly } from "@/game/route-only";
import { makeRoute } from "@/test/factories";

describe("routeOnly", () => {
  test("reads the flag from game data, not the saved name", () => {
    expect(routeOnly(firered, makeRoute({ name: "Whatever", gameRouteId: "silph-co" }))).toBe(
      "gift",
    );
  });

  test("is undefined for an unflagged route", () => {
    expect(routeOnly(firered, makeRoute({ gameRouteId: "route-1" }))).toBeUndefined();
  });

  test("is undefined for a custom route", () => {
    expect(
      routeOnly(firered, makeRoute({ isCustom: true, gameRouteId: "silph-co" })),
    ).toBeUndefined();
  });

  test("is undefined for a route with no game route id", () => {
    expect(routeOnly(firered, makeRoute({ gameRouteId: null }))).toBeUndefined();
  });

  test("is undefined while the game is loading", () => {
    expect(routeOnly(undefined, makeRoute({ gameRouteId: "silph-co" }))).toBeUndefined();
  });
});
