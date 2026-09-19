import { describe, expect, test } from "vitest";

import { ROUTE_ORDER_STEP, canDeleteRoute, compareRoutes, nextRouteOrder } from "@/domain/routes";
import type { Encounter, Route } from "@/domain/types";

function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    id: "route-1",
    runId: "run-1",
    name: "Route 29",
    order: 100,
    isCustom: false,
    gameRouteId: "route-29",
    createdAt: "2026-09-17T00:00:00.000Z",
    updatedAt: "2026-09-17T00:00:00.000Z",
    ...overrides,
  };
}

function makeEncounter(overrides: Partial<Encounter> = {}): Encounter {
  return {
    id: "encounter-1",
    runId: "run-1",
    routeId: "route-1",
    status: "open",
    speciesId: null,
    level: null,
    monId: null,
    notes: null,
    createdAt: "2026-09-17T00:00:00.000Z",
    updatedAt: "2026-09-17T00:00:00.000Z",
    ...overrides,
  };
}

describe("nextRouteOrder", () => {
  test("returns ROUTE_ORDER_STEP for an empty list", () => {
    expect(nextRouteOrder([])).toBe(ROUTE_ORDER_STEP);
  });

  test("returns the single route's order plus the step", () => {
    const routes = [makeRoute({ order: 300 })];
    expect(nextRouteOrder(routes)).toBe(400);
  });

  test("uses the highest order when there are gaps, not the count", () => {
    const routes = [makeRoute({ id: "a", order: 100 }), makeRoute({ id: "b", order: 500 })];
    expect(nextRouteOrder(routes)).toBe(600);
  });

  test("uses the maximum order, not the last element, when input is out of order", () => {
    const routes = [
      makeRoute({ id: "a", order: 500 }),
      makeRoute({ id: "b", order: 100 }),
      makeRoute({ id: "c", order: 300 }),
    ];
    expect(nextRouteOrder(routes)).toBe(600);
  });
});

describe("compareRoutes", () => {
  test("sorts ascending by order", () => {
    const routes = [
      makeRoute({ id: "c", order: 300 }),
      makeRoute({ id: "a", order: 100 }),
      makeRoute({ id: "b", order: 200 }),
    ];

    const sorted = [...routes].sort(compareRoutes);

    expect(sorted.map((route) => route.id)).toEqual(["a", "b", "c"]);
  });
});

describe("canDeleteRoute", () => {
  test("is true for a custom route with no encounters logged against it", () => {
    const route = makeRoute({ isCustom: true });
    expect(canDeleteRoute(route, [])).toBe(true);
  });

  test("is false for a custom route with an encounter logged against it", () => {
    const route = makeRoute({ id: "route-1", isCustom: true });
    const encounters = [makeEncounter({ routeId: "route-1" })];
    expect(canDeleteRoute(route, encounters)).toBe(false);
  });

  test("is false for a seeded route even with no encounters", () => {
    const route = makeRoute({ isCustom: false });
    expect(canDeleteRoute(route, [])).toBe(false);
  });
});
