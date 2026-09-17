import { describe, expect, test } from "vitest";

import { countByMonStatus, countRoutesCovered, summariseRun } from "@/domain/derive";
import type { Encounter, Mon } from "@/domain/types";

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

  test("party + boxed + dead always sum to the number of mons (partition invariant)", () => {
    // This is the property `summariseRun` relies on to treat party/boxed/dead as a breakdown of
    // one roster rather than three independently-sourced numbers — see the comment on
    // `summariseRun`. Checked across several mixes, including the empty and single-mon cases.
    const fixtures: Mon[][] = [
      [],
      [makeMon({ status: "party" })],
      [makeMon({ status: "box" })],
      [makeMon({ status: "dead" })],
      [
        makeMon({ id: "a", status: "party" }),
        makeMon({ id: "b", status: "party" }),
        makeMon({ id: "c", status: "box" }),
        makeMon({ id: "d", status: "dead" }),
        makeMon({ id: "e", status: "dead" }),
      ],
    ];

    for (const mons of fixtures) {
      const { party, boxed, dead } = countByMonStatus(mons);
      expect(party + boxed + dead).toBe(mons.length);
    }
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
  test("combines routes covered with a mons-status breakdown", () => {
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
    });

    expect(summary).toEqual({ routesCovered: 1, party: 1, boxed: 2, dead: 1 });
  });

  test("dead comes from mons whose status is 'dead', not from a deaths table row count", () => {
    // A death row's mon that is somehow not (or no longer) marked `dead` — possible via a
    // hand-edited import, since `backup.ts` validates the `monId` reference but not that mon's
    // status — must NOT inflate the card's dead count. Only three mons here, none `dead`, so the
    // count must be 0 regardless of how many `deaths` rows might exist elsewhere for this run.
    const summary = summariseRun({
      encounters: [],
      mons: [
        makeMon({ id: "a", status: "party" }),
        makeMon({ id: "b", status: "box" }),
        makeMon({ id: "c", status: "party" }),
      ],
    });

    expect(summary.dead).toBe(0);
  });

  test("is all zeros for a freshly created run with no rows yet", () => {
    const summary = summariseRun({ encounters: [], mons: [] });
    expect(summary).toEqual({ routesCovered: 0, party: 0, boxed: 0, dead: 0 });
  });
});
