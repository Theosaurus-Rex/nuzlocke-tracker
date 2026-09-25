/**
 * Covers the pure helpers in `route-presentation.tsx` directly, once, so `route-table.test.tsx`
 * and `route-card-list.test.tsx` don't each need to prove the same mapping when rendering it.
 */

import { describe, expect, it } from "vitest";

import { buildRouteRows, type RouteRow } from "@/domain/route-rows";
import { summariseRun } from "@/domain/derive";
import type { Encounter, Mon, Route } from "@/domain/types";

import {
  chipForRouteRow,
  filterRouteRows,
  routeBucket,
  rowSpeciesId,
  searchRouteRows,
  summariseRouteRows,
} from "./route-presentation";

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

function makeRow(overrides: Partial<RouteRow> = {}): RouteRow {
  return {
    route: makeRoute(),
    encounter: null,
    mon: null,
    status: "not-encountered",
    ...overrides,
  };
}

describe("chipForRouteRow", () => {
  it("maps not-encountered and open to the log chip", () => {
    expect(chipForRouteRow(makeRow({ status: "not-encountered" })).status).toBe("log");
    expect(
      chipForRouteRow(makeRow({ status: "open", encounter: makeEncounter({ status: "open" }) }))
        .status,
    ).toBe("log");
  });

  it("maps missed to the missed chip", () => {
    expect(chipForRouteRow(makeRow({ status: "missed" })).status).toBe("missed");
  });

  it("maps dead to the fainted chip", () => {
    expect(chipForRouteRow(makeRow({ status: "dead" })).status).toBe("fainted");
  });

  it("maps skipped to the grid chip, labelled skipped rather than the generic clause text", () => {
    const chip = chipForRouteRow(makeRow({ status: "skipped" }));
    expect(chip.status).toBe("clause");
    expect(chip.label).toBe("skipped");
  });

  it("maps a caught row with a party mon to the party chip, not the generic caught chip", () => {
    const chip = chipForRouteRow(makeRow({ status: "caught", mon: makeMon({ status: "party" }) }));
    expect(chip.status).toBe("party");
  });

  it("maps a caught row with a boxed mon to the boxed chip", () => {
    const chip = chipForRouteRow(makeRow({ status: "caught", mon: makeMon({ status: "box" }) }));
    expect(chip.status).toBe("boxed");
  });

  it("falls back to the generic caught chip when a caught row's mon can't be found", () => {
    const chip = chipForRouteRow(makeRow({ status: "caught", mon: null }));
    expect(chip.status).toBe("caught");
  });
});

describe("rowSpeciesId", () => {
  it("returns the mon's species when one is caught", () => {
    const row = makeRow({ status: "caught", mon: makeMon({ speciesId: "clefairy" }) });
    expect(rowSpeciesId(row)).toBe("clefairy");
  });

  it("falls back to the encounter's species when there is no mon yet", () => {
    const row = makeRow({
      status: "missed",
      encounter: makeEncounter({ status: "missed", speciesId: "geodude" }),
    });
    expect(rowSpeciesId(row)).toBe("geodude");
  });

  it("returns null when neither a mon nor an encounter names a species", () => {
    expect(rowSpeciesId(makeRow({ status: "not-encountered" }))).toBeNull();
  });
});

describe("routeBucket and summariseRouteRows", () => {
  it("buckets every RouteRowStatus", () => {
    expect(routeBucket(makeRow({ status: "not-encountered" }))).toBe("pending");
    expect(routeBucket(makeRow({ status: "open" }))).toBe("pending");
    expect(routeBucket(makeRow({ status: "caught" }))).toBe("caught");
    expect(routeBucket(makeRow({ status: "missed" }))).toBe("missed");
    expect(routeBucket(makeRow({ status: "skipped" }))).toBe("skipped");
    expect(routeBucket(makeRow({ status: "dead" }))).toBe("fainted");
  });

  it("tallies each bucket and derives covered from the total minus pending", () => {
    const rows = [
      makeRow({ route: makeRoute({ id: "r1" }), status: "caught" }),
      makeRow({ route: makeRoute({ id: "r2" }), status: "caught" }),
      makeRow({ route: makeRoute({ id: "r3" }), status: "missed" }),
      makeRow({ route: makeRoute({ id: "r4" }), status: "dead" }),
      makeRow({ route: makeRoute({ id: "r5" }), status: "skipped" }),
      makeRow({ route: makeRoute({ id: "r6" }), status: "not-encountered" }),
      makeRow({ route: makeRoute({ id: "r7" }), status: "open" }),
    ];

    const summary = summariseRouteRows(rows);

    expect(summary).toEqual({ caught: 2, missed: 1, fainted: 1, pending: 2, covered: 5, total: 7 });
  });
});

describe("filterRouteRows", () => {
  const rows = [
    makeRow({ route: makeRoute({ id: "r1" }), status: "caught" }),
    makeRow({ route: makeRoute({ id: "r2" }), status: "missed" }),
    makeRow({ route: makeRoute({ id: "r3" }), status: "dead" }),
    makeRow({ route: makeRoute({ id: "r4" }), status: "not-encountered" }),
    makeRow({ route: makeRoute({ id: "r5" }), status: "skipped" }),
  ];

  it("returns every row, unfiltered, when no bucket is active", () => {
    expect(filterRouteRows(rows, new Set())).toHaveLength(5);
  });

  it("keeps only rows in an active bucket, plus skipped rows regardless", () => {
    const filtered = filterRouteRows(rows, new Set(["caught"]));

    expect(filtered.map((row) => row.route.id)).toEqual(["r1", "r5"]);
  });

  it("keeps skipped rows reachable even when every other bucket is filtered out", () => {
    const filtered = filterRouteRows(rows, new Set(["missed"]));

    expect(filtered.map((row) => row.route.id)).toEqual(["r2", "r5"]);
  });
});

describe("searchRouteRows", () => {
  const rows = [
    makeRow({ route: makeRoute({ id: "r1", name: "Route 29" }) }),
    makeRow({ route: makeRoute({ id: "r2", name: "Union Cave" }) }),
    makeRow({ route: makeRoute({ id: "r3", name: "Dark Cave" }) }),
    makeRow({ route: makeRoute({ id: "r4", name: "Route 30", isCustom: true }) }),
  ];

  it("returns every row when the search is empty", () => {
    expect(searchRouteRows(rows, "")).toHaveLength(4);
  });

  it("returns every row when the search is only whitespace", () => {
    expect(searchRouteRows(rows, "   ")).toHaveLength(4);
  });

  it("matches a number anywhere in the name", () => {
    expect(searchRouteRows(rows, "29").map((row) => row.route.id)).toEqual(["r1"]);
  });

  it("matches every route with the text anywhere in the name, custom routes included", () => {
    expect(searchRouteRows(rows, "cave").map((row) => row.route.id)).toEqual(["r2", "r3"]);
    expect(searchRouteRows(rows, "30").map((row) => row.route.id)).toEqual(["r4"]);
  });

  it("is case-insensitive", () => {
    expect(searchRouteRows(rows, "UNION").map((row) => row.route.id)).toEqual(["r2"]);
  });

  it("returns no rows when nothing matches", () => {
    expect(searchRouteRows(rows, "xyz")).toEqual([]);
  });
});

/**
 * The sidebar's Routes counter and this screen's total are computed by different functions from
 * the same data, and both render as `24/31` on the same page. Nothing but this test stops them
 * disagreeing.
 */
describe("summariseRouteRows against summariseRun", () => {
  it("calls the same routes covered as the sidebar does", () => {
    const routes = [
      makeRoute({ id: "r1", name: "Route 1", order: 100 }),
      makeRoute({ id: "r2", name: "Route 2", order: 200 }),
      makeRoute({ id: "r3", name: "Route 3", order: 300 }),
      makeRoute({ id: "r4", name: "Route 4", order: 400 }),
      makeRoute({ id: "r5", name: "Route 5", order: 500 }),
    ];
    const encounters = [
      makeEncounter({ id: "e1", routeId: "r1", status: "caught", monId: "m1" }),
      makeEncounter({ id: "e2", routeId: "r2", status: "caught", monId: "m2" }),
      makeEncounter({ id: "e3", routeId: "r3", status: "missed" }),
      makeEncounter({ id: "e4", routeId: "r4", status: "skipped" }),
    ];
    const mons = [
      makeMon({ id: "m1", encounterId: "e1", status: "party", partySlot: 0 }),
      makeMon({ id: "m2", encounterId: "e2", status: "dead", partySlot: null }),
    ];

    const counters = summariseRouteRows(buildRouteRows({ routes, encounters, mons }));

    expect(counters.covered).toBe(summariseRun({ encounters, mons }).routesCovered);
    expect(counters.total).toBe(routes.length);
    expect(counters.pending).toBe(routes.length - counters.covered);
  });
});
