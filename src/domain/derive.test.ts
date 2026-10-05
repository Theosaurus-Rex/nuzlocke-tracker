import { describe, expect, test } from "vitest";

import { countByMonStatus, countRoutesCovered, summariseRun } from "@/domain/derive";
import type { Mon } from "@/domain/types";
import { makeEncounter, makeMon } from "@/test/factories";

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
