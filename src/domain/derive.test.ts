import { describe, expect, test } from "vitest";

import {
  countByMonStatus,
  countRoutesCovered,
  summariseRun,
  worstDeathStreak,
} from "@/domain/derive";
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
    shiny: false,
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
    // Boxed and dead counts are deliberately unequal so a bug that swaps them can't pass by luck.
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
    // The property `summariseRun` relies on to derive `dead` from `mons` rather than `deaths`.
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
    // No mon here is `dead`, so the count is 0 no matter how many `deaths` rows exist elsewhere.
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

function makeDeath(diedAt: string): Death {
  return {
    id: `death-${diedAt}`,
    runId: "run-1",
    monId: "mon-1",
    level: 5,
    routeId: null,
    cause: { type: "other", detail: "x" },
    diedAt,
    notes: null,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };
}

const at = (minute: number) => `2026-09-17T00:${String(minute).padStart(2, "0")}:00.000Z`;

describe("worstDeathStreak", () => {
  test("is 0 with no deaths", () => {
    expect(worstDeathStreak([], [makeMon()])).toBe(0);
  });

  test("is 1 for a single death", () => {
    expect(worstDeathStreak([makeDeath(at(5))], [])).toBe(1);
  });

  test("is the number of deaths when nothing was caught between them", () => {
    const deaths = [makeDeath(at(10)), makeDeath(at(20)), makeDeath(at(30))];
    expect(worstDeathStreak(deaths, [makeMon({ createdAt: at(1) })])).toBe(3);
  });

  test("a catch between the 2nd and 3rd deaths leaves a streak of 2", () => {
    const deaths = [makeDeath(at(10)), makeDeath(at(20)), makeDeath(at(30))];
    expect(worstDeathStreak(deaths, [makeMon({ createdAt: at(25) })])).toBe(2);
  });

  test("a catch at the same instant as a death does not break the streak", () => {
    const deaths = [makeDeath(at(10)), makeDeath(at(20))];
    const mons = [makeMon({ createdAt: at(10) }), makeMon({ createdAt: at(20) })];
    expect(worstDeathStreak(deaths, mons)).toBe(2);
  });

  test("sorts deaths before measuring", () => {
    const deaths = [makeDeath(at(30)), makeDeath(at(10)), makeDeath(at(20))];
    expect(worstDeathStreak(deaths, [makeMon({ createdAt: at(15) })])).toBe(2);
  });

  test("a later streak can be the worst", () => {
    const deaths = [makeDeath(at(10)), makeDeath(at(20)), makeDeath(at(30)), makeDeath(at(40))];
    expect(worstDeathStreak(deaths, [makeMon({ createdAt: at(15) })])).toBe(3);
  });
});
