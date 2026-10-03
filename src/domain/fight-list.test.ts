import { describe, expect, test } from "vitest";

import { badgeCount, buildFightSections, type FightLookup } from "@/domain/fight-list";
import type { Death, Fight } from "@/domain/types";
import { heartgold } from "@/game/data/heartgold";

const TIMESTAMP = "2026-09-17T00:00:00.000Z";

function makeFight(overrides: Partial<Fight> = {}): Fight {
  return {
    id: "fight-1",
    runId: "run-1",
    gameFightId: "g1",
    name: "Fight",
    kind: "gym",
    order: 1,
    grantsBadge: true,
    levelCap: 10,
    status: "pending",
    clearedAt: null,
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
    routeId: null,
    cause: {
      type: "trainer",
      fightId: "fight-1",
      trainerName: null,
      species: "pidgey",
      level: 9,
      move: null,
    },
    diedAt: TIMESTAMP,
    notes: null,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

const lookup: FightLookup = (id) =>
  ({
    j1: { region: "johto", badge: "Zephyr" },
    j2: { region: "johto", badge: null },
    k1: { region: "kanto", badge: "Thunder" },
  })[id];

const ids = (sections: ReturnType<typeof buildFightSections>) =>
  sections.map((s) => s.rows.map((r) => r.fight.id));

describe("buildFightSections", () => {
  test("sorts by order whatever the input order", () => {
    const sections = buildFightSections(
      [
        makeFight({ id: "c", gameFightId: "j1", order: 3 }),
        makeFight({ id: "a", gameFightId: "j1", order: 1 }),
        makeFight({ id: "b", gameFightId: "j1", order: 2 }),
      ],
      lookup,
      [],
    );
    expect(ids(sections)).toEqual([["a", "b", "c"]]);
  });

  test("merges consecutive fights with the same label and splits on a change", () => {
    const sections = buildFightSections(
      [
        makeFight({ id: "a", gameFightId: "j1", order: 1 }),
        makeFight({ id: "b", gameFightId: "j2", order: 2 }),
        makeFight({ id: "c", gameFightId: "k1", order: 3 }),
      ],
      lookup,
      [],
    );
    expect(sections.map((s) => s.label)).toEqual(["Johto", "Kanto"]);
    expect(ids(sections)).toEqual([["a", "b"], ["c"]]);
  });

  test("puts the league in its own section between Johto and Kanto", () => {
    const sections = buildFightSections(
      [
        makeFight({ id: "a", gameFightId: "j1", order: 1 }),
        makeFight({ id: "e", gameFightId: "e1", kind: "elite_four", order: 2 }),
        makeFight({ id: "l", gameFightId: "l1", kind: "champion", order: 3 }),
        makeFight({ id: "k", gameFightId: "k1", order: 4 }),
      ],
      lookup,
      [],
    );
    expect(sections.map((s) => s.label)).toEqual(["Johto", "Elite Four", "Kanto"]);
    expect(ids(sections)).toEqual([["a"], ["e", "l"], ["k"]]);
  });

  test("a custom fight with no region joins the section before it", () => {
    const sections = buildFightSections(
      [
        makeFight({ id: "j", gameFightId: "j1", order: 1 }),
        makeFight({ id: "a", gameFightId: "k1", order: 2 }),
        makeFight({ id: "x", gameFightId: null, kind: "custom", order: 3 }),
      ],
      lookup,
      [],
    );
    expect(ids(sections)).toEqual([["j"], ["a", "x"]]);
  });

  test("a custom fight first takes the label of the first labelled fight", () => {
    const sections = buildFightSections(
      [
        makeFight({ id: "x", gameFightId: null, kind: "custom", order: 1 }),
        makeFight({ id: "a", gameFightId: "k1", order: 2 }),
      ],
      lookup,
      [],
    );
    expect(sections.map((s) => s.label)).toEqual(["Kanto"]);
    expect(ids(sections)).toEqual([["x", "a"]]);
  });

  test("next is the lowest-order uncleared fight even when a later one is cleared", () => {
    const rows = buildFightSections(
      [
        makeFight({ id: "a", gameFightId: "j1", order: 1, status: "cleared" }),
        makeFight({ id: "b", gameFightId: "j2", order: 2 }),
        makeFight({ id: "c", gameFightId: "j1", order: 3, status: "cleared" }),
        makeFight({ id: "d", gameFightId: "j1", order: 4 }),
      ],
      lookup,
      [],
    ).flatMap((s) => s.rows);
    expect(rows.map((r) => r.state)).toEqual(["cleared", "next", "cleared", "upcoming"]);
  });

  test("a rival can be next", () => {
    const rows = buildFightSections(
      [
        makeFight({ id: "a", gameFightId: "j1", order: 1, status: "cleared" }),
        makeFight({ id: "r", gameFightId: "j2", kind: "rival", grantsBadge: false, order: 2 }),
        makeFight({ id: "b", gameFightId: "j1", order: 3 }),
      ],
      lookup,
      [],
    ).flatMap((s) => s.rows);
    expect(rows.map((r) => r.state)).toEqual(["cleared", "next", "upcoming"]);
  });

  test("has no next when everything is cleared", () => {
    const rows = buildFightSections(
      [
        makeFight({ id: "a", gameFightId: "j1", order: 1, status: "cleared" }),
        makeFight({ id: "b", gameFightId: "j1", order: 2, status: "cleared" }),
      ],
      lookup,
      [],
    ).flatMap((s) => s.rows);
    expect(rows.map((r) => r.state)).toEqual(["cleared", "cleared"]);
  });

  test("carries the badge from the lookup", () => {
    const rows = buildFightSections(
      [
        makeFight({ id: "a", gameFightId: "j1", order: 1 }),
        makeFight({ id: "b", gameFightId: "j2", order: 2 }),
        makeFight({ id: "x", gameFightId: null, order: 3 }),
      ],
      lookup,
      [],
    ).flatMap((s) => s.rows);
    expect(rows.map((r) => r.badge)).toEqual(["Zephyr", null, null]);
  });

  test("attaches only trainer deaths for the fight itself", () => {
    const own = makeDeath({ id: "own" });
    const other = makeDeath({
      id: "other",
      cause: {
        type: "trainer",
        fightId: "fight-2",
        trainerName: null,
        species: "a",
        level: 1,
        move: null,
      },
    });
    const status = makeDeath({ id: "status", cause: { type: "status", status: "poison" } });
    const rows = buildFightSections(
      [
        makeFight({ id: "fight-1", gameFightId: "j1", order: 1 }),
        makeFight({ id: "fight-2", gameFightId: "j1", order: 2 }),
      ],
      lookup,
      [own, other, status],
    ).flatMap((s) => s.rows);
    expect(rows[0]!.losses.map((d) => d.id)).toEqual(["own"]);
    expect(rows[1]!.losses.map((d) => d.id)).toEqual(["other"]);
  });

  test("sections the real HeartGold data as Johto, Elite Four, Kanto with 16 badges", () => {
    const fights = heartgold.fights.map((def) =>
      makeFight({
        id: def.id,
        gameFightId: def.id,
        kind: def.kind,
        order: def.order,
        grantsBadge: def.grantsBadge,
      }),
    );
    const byId = new Map(heartgold.fights.map((f) => [f.id, f]));
    const sections = buildFightSections(fights, (id) => byId.get(id), []);
    expect(sections.map((s) => s.label)).toEqual(["Johto", "Elite Four", "Kanto"]);
    expect(badgeCount(fights).total).toBe(16);
    expect(sections.flatMap((s) => s.rows).filter((r) => r.badge).length).toBe(16);
  });
});

describe("badgeCount", () => {
  test("counts only badge fights, and earned only when cleared", () => {
    expect(
      badgeCount([
        makeFight({ id: "a", status: "cleared" }),
        makeFight({ id: "b" }),
        makeFight({ id: "r", grantsBadge: false, status: "cleared" }),
      ]),
    ).toEqual({ earned: 1, total: 2 });
  });
});
