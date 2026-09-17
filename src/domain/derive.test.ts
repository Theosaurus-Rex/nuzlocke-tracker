import { describe, expect, test } from "vitest";

import { countByMonStatus, countRoutesCovered, summariseRun } from "@/domain/derive";
import type { Death, Encounter, Mon } from "@/domain/types";

const TIMESTAMP = "2026-09-17T00:00:00.000Z";

function makeMon(overrides: Partial<Mon> = {}): Mon {
  return {
    id: "mon-1",
    runId: "run-1",
    encounterId: null,
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

function makeDeath(overrides: Partial<Death> = {}): Death {
  return {
    id: "death-1",
    runId: "run-1",
    monId: "mon-1",
    level: 10,
    routeId: "route-1",
    cause: { type: "wild", species: "geodude", level: 10, move: "Rock Throw" },
    diedAt: TIMESTAMP,
    notes: null,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

describe("countByMonStatus", () => {
  test("tallies party, box and dead mons separately", () => {
    // Boxed (2) and dead (1) are deliberately unequal so a classification bug that swaps them
    // (e.g. counting a dead mon as boxed) cannot coincidentally still match this assertion.
    const mons = [
      makeMon({ id: "a", status: "party" }),
      makeMon({ id: "b", status: "box" }),
      makeMon({ id: "c", status: "box" }),
      makeMon({ id: "d", status: "dead" }),
    ];

    expect(countByMonStatus(mons)).toEqual({ party: 1, boxed: 2, dead: 1 });
  });

  test("returns all zeros for no mons", () => {
    expect(countByMonStatus([])).toEqual({ party: 0, boxed: 0, dead: 0 });
  });
});

describe("countRoutesCovered", () => {
  test("counts distinct routes with a non-open encounter", () => {
    const encounters = [
      makeEncounter({ id: "e1", routeId: "route-1", status: "caught" }),
      makeEncounter({ id: "e2", routeId: "route-2", status: "missed" }),
      makeEncounter({ id: "e3", routeId: "route-3", status: "skipped" }),
      makeEncounter({ id: "e4", routeId: "route-4", status: "open" }),
    ];

    expect(countRoutesCovered(encounters)).toBe(3);
  });

  test("counts a route once even with more than one non-open encounter on it", () => {
    const encounters = [
      makeEncounter({ id: "e1", routeId: "route-1", status: "caught" }),
      makeEncounter({ id: "e2", routeId: "route-1", status: "missed" }),
    ];

    expect(countRoutesCovered(encounters)).toBe(1);
  });

  test("returns 0 when every encounter is still open", () => {
    const encounters = [makeEncounter({ status: "open" })];
    expect(countRoutesCovered(encounters)).toBe(0);
  });
});

describe("summariseRun", () => {
  test("combines routes covered, mon status counts and the death count", () => {
    const summary = summariseRun({
      encounters: [
        makeEncounter({ id: "e1", routeId: "route-1", status: "caught" }),
        makeEncounter({ id: "e2", routeId: "route-2", status: "open" }),
      ],
      mons: [
        makeMon({ id: "a", status: "party" }),
        makeMon({ id: "b", status: "box" }),
        makeMon({ id: "c", status: "box" }),
        makeMon({ id: "d", status: "dead" }),
      ],
      deaths: [makeDeath({ id: "death-1", monId: "d" })],
    });

    expect(summary).toEqual({ routesCovered: 1, party: 1, boxed: 2, dead: 1 });
  });

  test("is all zeros for a freshly created run with no rows yet", () => {
    const summary = summariseRun({ encounters: [], mons: [], deaths: [] });
    expect(summary).toEqual({ routesCovered: 0, party: 0, boxed: 0, dead: 0 });
  });
});
