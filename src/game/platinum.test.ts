import { describe, expect, test } from "vitest";

import { platinum } from "@/game/data/platinum";
import { toSpecies } from "@/game/pokeapi/map";
import { typesIn } from "@/game/pokeapi/resolve";
import { seedFights, seedRoutes } from "@/game/seed";
import type { FightDef } from "@/game/types";
import { pokemonFixtures } from "@/test/pokeapi-fixtures";

/** Independently sourced ace levels, not derived from our own data. See docs/notes/game-data.md
 * for the sources and why. */
const VERIFIED_ACE_LEVELS: Record<string, number> = {
  "gym-roark": 14,
  "gym-gardenia": 22,
  "gym-fantina": 26,
  "gym-maylene": 32,
  "gym-crasher-wake": 37,
  "gym-byron": 41,
  "gym-candice": 44,
  "gym-volkner": 50,
  "elite-four-aaron": 53,
  "elite-four-bertha": 55,
  "elite-four-flint": 57,
  "elite-four-lucian": 59,
  "champion-cynthia": 62,
};

const aceOf = (fight: FightDef | undefined): number =>
  Math.max(...(fight?.roster.map((m) => m.level) ?? []));

const byId = new Map<string, FightDef>(platinum.fights.map((f) => [f.id, f]));
const count = (pred: (f: FightDef) => boolean): number => platinum.fights.filter(pred).length;
const level = (id: string, species: string): number | undefined =>
  byId.get(id)?.roster.find((m) => m.species === species)?.level;

describe("platinum spot-check and caps", () => {
  test.each(Object.entries(VERIFIED_ACE_LEVELS))("%s has ace level %i", (id, expectedAce) => {
    expect(byId.get(id)).toBeDefined();
    expect(aceOf(byId.get(id))).toBe(expectedAce);
  });

  test("badge caps are the verified gym aces, lowest first", () => {
    const gymIds = platinum.fights.filter((f) => f.grantsBadge).map((f) => f.id);
    const caps = platinum.levelCaps.filter(({ until }) => "badges" in until).map((m) => m.cap);
    const aces = gymIds.map((id) => VERIFIED_ACE_LEVELS[id] ?? 0);
    expect(caps).toEqual(aces.toSorted((a, b) => a - b));
  });

  test.each([
    "elite-four-aaron",
    "elite-four-bertha",
    "elite-four-flint",
    "elite-four-lucian",
    "champion-cynthia",
  ])("%s caps at its verified ace", (id) => {
    const milestone = platinum.levelCaps.find(
      ({ until }) => "fight" in until && until.fight === id,
    );
    expect(milestone?.cap).toBe(VERIFIED_ACE_LEVELS[id]);
  });

  test("the Champion's cap comes last", () => {
    expect(platinum.levelCaps.at(-1)?.until).toEqual({ fight: "champion-cynthia" });
  });

  test("boss fights have no cap, including the Distortion World", () => {
    const capped = new Set(
      platinum.levelCaps.flatMap(({ until }) => ("fight" in until ? [until.fight] : [])),
    );
    for (const fight of platinum.fights.filter((f) => f.kind === "boss")) {
      expect(capped.has(fight.id), fight.id).toBe(false);
    }
  });
});

describe("platinum shape", () => {
  test("has 28 fights: 8 badges, 6 Barry, 9 bosses, 4 Elite Four and a Champion", () => {
    expect(platinum.fights).toHaveLength(28);
    expect(count((f) => f.grantsBadge)).toBe(8);
    expect(count((f) => f.kind === "rival")).toBe(6);
    expect(count((f) => f.kind === "boss")).toBe(9);
    expect(count((f) => f.kind === "elite_four")).toBe(4);
    expect(count((f) => f.kind === "champion")).toBe(1);
  });

  test("Barry is named Barry in all six fights", () => {
    const barry = platinum.fights.filter((f) => f.kind === "rival");
    expect(barry.map((f) => f.id)).toEqual([
      "rival-1",
      "rival-2",
      "rival-3",
      "rival-4",
      "rival-5",
      "rival-6",
    ]);
    expect(barry.every((f) => f.name === "Barry")).toBe(true);
  });

  test("fights are in traversal order", () => {
    expect(platinum.fights.map((f) => f.order)).toEqual(
      Array.from({ length: 28 }, (_, i) => i + 1),
    );
    expect(platinum.fights.map((f) => f.id)).toEqual([
      "rival-1",
      "rival-2",
      "gym-roark",
      "boss-mars-valley-windworks",
      "gym-gardenia",
      "boss-jupiter-eterna-building",
      "gym-fantina",
      "rival-3",
      "gym-maylene",
      "rival-4",
      "gym-crasher-wake",
      "boss-cyrus-celestic-ruins",
      "rival-5",
      "gym-byron",
      "boss-saturn-valor-cavern",
      "boss-mars-lake-verity",
      "gym-candice",
      "boss-cyrus-galactic-hq",
      "boss-saturn-galactic-hq",
      "boss-mars-jupiter-spear-pillar",
      "boss-cyrus-distortion-world",
      "gym-volkner",
      "rival-6",
      "elite-four-aaron",
      "elite-four-bertha",
      "elite-four-flint",
      "elite-four-lucian",
      "champion-cynthia",
    ]);
  });

  test("the badge sprites follow badge identity, so Fantina carries Relic", () => {
    const gyms = platinum.fights.filter((f) => f.grantsBadge);
    expect(gyms.map((f) => [f.id, f.badge, f.badgeSprite])).toEqual([
      ["gym-roark", "Coal", 25],
      ["gym-gardenia", "Forest", 26],
      ["gym-fantina", "Relic", 29],
      ["gym-maylene", "Cobble", 27],
      ["gym-crasher-wake", "Fen", 28],
      ["gym-byron", "Mine", 30],
      ["gym-candice", "Icicle", 31],
      ["gym-volkner", "Beacon", 32],
    ]);
  });

  test("Fantina is the third badge fight", () => {
    const gyms = platinum.fights.filter((f) => f.grantsBadge);
    expect(gyms[2]?.id).toBe("gym-fantina");
  });

  test("has 59 routes, all in Sinnoh, and every fight is in Sinnoh", () => {
    expect(platinum.routes).toHaveLength(59);
    expect(platinum.routes.every((r) => r.region === "sinnoh")).toBe(true);
    expect(platinum.fights.every((f) => f.region === "sinnoh")).toBe(true);
  });

  test("the story ends at the Pokémon League, with no post-game routes", () => {
    const ids = platinum.routes.map((r) => r.id);
    expect(ids.at(-1)).toBe("pokemon-league");
    expect(ids).not.toContain("snowpoint-temple");
    expect(ids).not.toContain("spear-pillar");
  });

  test("the Distortion World is a route and Cyrus fights there too", () => {
    const ids = platinum.routes.map((r) => r.id);
    expect(ids).toContain("distortion-world");
    expect(ids.indexOf("sendoff-spring")).toBe(ids.indexOf("distortion-world") + 1);
    expect(byId.get("boss-cyrus-distortion-world")?.kind).toBe("boss");
  });

  test("the Ruin Maniac places are one route", () => {
    const ids = platinum.routes.map((r) => r.id);
    expect(ids).toContain("ruin-maniac-cave");
    expect(ids).not.toContain("ruin-maniac-tunnel");
  });

  test("the routes follow the walkthrough order", () => {
    const ids = platinum.routes.map((r) => r.id);
    expect(ids.indexOf("route-207")).toBeGreaterThan(ids.indexOf("wayward-cave"));
    expect(ids.indexOf("old-chateau")).toBeGreaterThan(ids.indexOf("eterna-city"));
    expect(ids.indexOf("valley-windworks")).toBeGreaterThan(ids.indexOf("floaroma-meadow"));
    expect(ids.indexOf("route-213")).toBeLessThan(ids.indexOf("pastoria-city"));
    expect(ids.indexOf("lake-valor")).toBeGreaterThan(ids.indexOf("iron-island"));
    expect(ids.indexOf("trophy-garden")).toBeGreaterThan(ids.indexOf("route-212"));
  });

  test("Gardenia's Cherrim and Candice's Piloswine use the corrected levels", () => {
    expect(level("gym-gardenia", "cherrim")).toBe(20);
    expect(level("gym-gardenia", "cherubi")).toBeUndefined();
    expect(level("gym-candice", "piloswine")).toBe(40);
  });

  test("Mars and Jupiter at Spear Pillar are a double battle of two Golbat at 44", () => {
    const golbats = byId
      .get("boss-mars-jupiter-spear-pillar")
      ?.roster.filter((m) => m.species === "golbat")
      .map((m) => m.level);
    expect(golbats).toEqual([44, 44]);
  });
});

describe("platinum runs", () => {
  test("a run seeds its routes and fights", () => {
    const routes = seedRoutes("run-1", platinum);
    const fights = seedFights("run-1", platinum);
    expect(routes.map((r) => r.gameRouteId)).toEqual(platinum.routes.map((r) => r.id));
    expect(fights.map((f) => f.gameFightId)).toEqual(platinum.fights.map((f) => f.id));
  });

  test("resolve in generation 4, where Clefairy is Normal", () => {
    const clefairy = toSpecies(pokemonFixtures.clefairy!);
    expect(typesIn(clefairy, platinum.generation)).toEqual(["normal"]);
  });
});

describe("platinum only-routes", () => {
  test("exactly these routes are flagged", () => {
    const flagged = Object.fromEntries(
      platinum.routes.filter((r) => r.only !== undefined).map((r) => [r.id, r.only]),
    );
    expect(flagged).toEqual({
      "oreburgh-city": "gift",
      "hearthome-city": "gift",
      "veilstone-city": "gift",
      "snowpoint-city": "gift",
      "distortion-world": "static",
    });
  });

  test("Floaroma Meadow and the starter are not flagged", () => {
    expect(platinum.routes.find((r) => r.id === "floaroma-meadow")?.only).toBeUndefined();
    expect(platinum.routes.find((r) => r.id === "starter")?.only).toBeUndefined();
  });
});
