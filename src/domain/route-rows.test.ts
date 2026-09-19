import { describe, expect, test } from "vitest";

import { buildRouteRows } from "@/domain/route-rows";
import type { Encounter, Mon, Route } from "@/domain/types";

const TIMESTAMP = "2026-09-17T00:00:00.000Z";

function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    id: "route-1",
    runId: "run-1",
    name: "Route 1",
    order: 100,
    isCustom: false,
    gameRouteId: "route-1",
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
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
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

function makeMon(overrides: Partial<Mon> = {}): Mon {
  return {
    id: "mon-1",
    runId: "run-1",
    encounterId: "encounter-1",
    speciesId: "chikorita",
    speciesIdCaught: "chikorita",
    nickname: null,
    gender: null,
    level: 5,
    levelCaught: 5,
    nature: null,
    ability: null,
    heldItem: null,
    moves: [],
    status: "party",
    partySlot: 0,
    boxOrder: null,
    caughtRouteId: null,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

describe("buildRouteRows", () => {
  test("a route with no encounter renders not-encountered with no mon", () => {
    const rows = buildRouteRows({
      routes: [makeRoute({ id: "route-1" })],
      encounters: [],
      mons: [],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.route.id).toBe("route-1");
    expect(rows[0]?.encounter).toBeNull();
    expect(rows[0]?.mon).toBeNull();
    expect(rows[0]?.status).toBe("not-encountered");
  });

  test("a caught encounter whose mon is alive renders caught", () => {
    const route = makeRoute({ id: "route-1" });
    const encounter = makeEncounter({
      id: "encounter-1",
      routeId: "route-1",
      status: "caught",
      monId: "mon-1",
    });
    const mon = makeMon({ id: "mon-1", status: "party" });

    const [row] = buildRouteRows({ routes: [route], encounters: [encounter], mons: [mon] });

    expect(row?.status).toBe("caught");
    expect(row?.mon?.id).toBe("mon-1");
  });

  test("a caught encounter whose mon is dead renders dead, not caught", () => {
    const route = makeRoute({ id: "route-1" });
    const encounter = makeEncounter({
      id: "encounter-1",
      routeId: "route-1",
      status: "caught",
      monId: "mon-1",
    });
    const mon = makeMon({ id: "mon-1", status: "dead" });

    const [row] = buildRouteRows({ routes: [route], encounters: [encounter], mons: [mon] });

    // The encounter's own status is "caught". Only the mon's status flips this to "dead", so a
    // passthrough of encounter.status would give the wrong answer here.
    expect(encounter.status).toBe("caught");
    expect(row?.status).toBe("dead");
  });

  test("a caught encounter whose monId matches no mon does not crash, and resolves mon to null", () => {
    const route = makeRoute({ id: "route-1" });
    const encounter = makeEncounter({
      id: "encounter-1",
      routeId: "route-1",
      status: "caught",
      monId: "missing-mon",
    });

    const [row] = buildRouteRows({ routes: [route], encounters: [encounter], mons: [] });

    expect(row?.mon).toBeNull();
    expect(row?.status).toBe("caught");
  });

  test.each(["missed", "skipped", "open"] as const)(
    "a %s encounter renders its own status",
    (status) => {
      const route = makeRoute({ id: "route-1" });
      const encounter = makeEncounter({ id: "encounter-1", routeId: "route-1", status });

      const [row] = buildRouteRows({ routes: [route], encounters: [encounter], mons: [] });

      expect(row?.status).toBe(status);
      expect(row?.encounter?.id).toBe("encounter-1");
    },
  );

  test("row order follows the input routes order, not ascending route.order", () => {
    const routeC = makeRoute({ id: "route-c", order: 300, name: "Route C" });
    const routeA = makeRoute({ id: "route-a", order: 100, name: "Route A" });
    const routeB = makeRoute({ id: "route-b", order: 200, name: "Route B" });

    const rows = buildRouteRows({
      routes: [routeC, routeA, routeB],
      encounters: [],
      mons: [],
    });

    expect(rows.map((row) => row.route.id)).toEqual(["route-c", "route-a", "route-b"]);
  });

  test("two encounters on one route resolve to the earliest by createdAt", () => {
    const route = makeRoute({ id: "route-1" });
    const later = makeEncounter({
      id: "encounter-later",
      routeId: "route-1",
      status: "missed",
      createdAt: "2026-09-18T00:00:00.000Z",
    });
    const earlier = makeEncounter({
      id: "encounter-earlier",
      routeId: "route-1",
      status: "skipped",
      createdAt: "2026-09-15T00:00:00.000Z",
    });

    const [row] = buildRouteRows({
      routes: [route],
      encounters: [later, earlier],
      mons: [],
    });

    expect(row?.encounter?.id).toBe("encounter-earlier");
    expect(row?.status).toBe("skipped");
  });
});
