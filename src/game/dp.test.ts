import { describe, expect, test } from "vitest";

import { diamond, pearl } from "@/game/data/dp";
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
  "gym-maylene": 30,
  "gym-crasher-wake": 30,
  "gym-fantina": 36,
  "gym-byron": 39,
  "gym-candice": 42,
  "gym-volkner": 49,
  "elite-four-aaron": 57,
  "elite-four-bertha": 59,
  "elite-four-flint": 61,
  "elite-four-lucian": 63,
  "champion-cynthia": 66,
};

const aceOf = (fight: FightDef | undefined): number =>
  Math.max(...(fight?.roster.map((m) => m.level) ?? []));

describe.each([diamond, pearl])("$id spot-check and caps", (game) => {
  const byId = new Map<string, FightDef>(game.fights.map((f) => [f.id, f]));

  test.each(Object.entries(VERIFIED_ACE_LEVELS))("%s has ace level %i", (id, expectedAce) => {
    expect(byId.get(id)).toBeDefined();
    expect(aceOf(byId.get(id))).toBe(expectedAce);
  });

  test("badge caps are the verified gym aces, lowest first", () => {
    const gymIds = game.fights.filter((f) => f.grantsBadge).map((f) => f.id);
    const caps = game.levelCaps.filter(({ until }) => "badges" in until).map((m) => m.cap);
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
    const milestone = game.levelCaps.find(({ until }) => "fight" in until && until.fight === id);
    expect(milestone?.cap).toBe(VERIFIED_ACE_LEVELS[id]);
  });

  test("the Champion's cap comes last", () => {
    expect(game.levelCaps.at(-1)?.until).toEqual({ fight: "champion-cynthia" });
  });

  test("boss fights have no cap", () => {
    const capped = new Set(
      game.levelCaps.flatMap(({ until }) => ("fight" in until ? [until.fight] : [])),
    );
    for (const fight of game.fights.filter((f) => f.kind === "boss")) {
      expect(capped.has(fight.id), fight.id).toBe(false);
    }
  });
});

describe.each([diamond, pearl])("$id shape", (game) => {
  const count = (pred: (f: FightDef) => boolean): number => game.fights.filter(pred).length;
  const level = (id: string, species: string): number | undefined =>
    game.fights.find((f) => f.id === id)?.roster.find((m) => m.species === species)?.level;

  test("has 26 fights: 8 badges, 5 Barry, 8 bosses, 4 Elite Four and a Champion", () => {
    expect(game.fights).toHaveLength(26);
    expect(count((f) => f.grantsBadge)).toBe(8);
    expect(count((f) => f.kind === "rival")).toBe(5);
    expect(count((f) => f.kind === "boss")).toBe(8);
    expect(count((f) => f.kind === "elite_four")).toBe(4);
    expect(count((f) => f.kind === "champion")).toBe(1);
  });

  test("Barry is named Barry in all five fights", () => {
    const barry = game.fights.filter((f) => f.kind === "rival");
    expect(barry.map((f) => f.id)).toEqual(["rival-1", "rival-2", "rival-3", "rival-4", "rival-5"]);
    expect(barry.every((f) => f.name === "Barry")).toBe(true);
  });

  test("fights are in traversal order", () => {
    expect(game.fights.map((f) => f.order)).toEqual(Array.from({ length: 26 }, (_, i) => i + 1));
    expect(game.fights.map((f) => f.id)).toEqual([
      "rival-1",
      "gym-roark",
      "boss-mars-valley-windworks",
      "gym-gardenia",
      "boss-jupiter-eterna-building",
      "rival-2",
      "gym-maylene",
      "gym-crasher-wake",
      "rival-3",
      "gym-fantina",
      "rival-4",
      "gym-byron",
      "boss-saturn-valor-cavern",
      "boss-mars-lake-verity",
      "gym-candice",
      "boss-cyrus-galactic-hq",
      "boss-saturn-galactic-hq",
      "boss-mars-jupiter-spear-pillar",
      "boss-cyrus-spear-pillar",
      "gym-volkner",
      "rival-5",
      "elite-four-aaron",
      "elite-four-bertha",
      "elite-four-flint",
      "elite-four-lucian",
      "champion-cynthia",
    ]);
  });

  test("the badge fights use the sprite numbers 25 to 32 in gym order", () => {
    const gyms = game.fights.filter((f) => f.grantsBadge);
    expect(gyms.map((f) => [f.badge, f.badgeSprite])).toEqual([
      ["Coal", 25],
      ["Forest", 26],
      ["Cobble", 27],
      ["Fen", 28],
      ["Relic", 29],
      ["Mine", 30],
      ["Icicle", 31],
      ["Beacon", 32],
    ]);
  });

  test("has 57 routes, all in Sinnoh, and every fight is in Sinnoh", () => {
    expect(game.routes).toHaveLength(57);
    expect(game.routes.every((r) => r.region === "sinnoh")).toBe(true);
    expect(game.fights.every((f) => f.region === "sinnoh")).toBe(true);
  });

  test("Spear Pillar comes after Lake Acuity", () => {
    const ids = game.routes.map((r) => r.id);
    expect(ids.indexOf("spear-pillar")).toBe(ids.indexOf("lake-acuity") + 1);
  });

  test("the story ends at the Pokémon League, with no post-game routes", () => {
    expect(game.routes.at(-1)?.id).toBe("pokemon-league");
    expect(game.routes.map((r) => r.id)).not.toContain("snowpoint-temple");
  });

  test("Veilstone City is not a route and the Ruin Maniac places are one", () => {
    const ids = game.routes.map((r) => r.id);
    expect(ids).not.toContain("veilstone-city");
    expect(ids).toContain("ruin-maniac-cave");
    expect(ids).not.toContain("ruin-maniac-tunnel");
  });

  test("Route 207, Lake Valor and Trophy Garden follow the walkthrough order", () => {
    const ids = game.routes.map((r) => r.id);
    expect(ids.indexOf("route-207")).toBeGreaterThan(ids.indexOf("wayward-cave"));
    expect(ids.indexOf("lake-valor")).toBeGreaterThan(ids.indexOf("iron-island"));
    expect(ids.indexOf("trophy-garden")).toBeGreaterThan(ids.indexOf("route-212"));
  });

  test("Cynthia's Lucario, Saturn's Bronzor and Jupiter's Golbat use the corrected levels", () => {
    expect(level("champion-cynthia", "lucario")).toBe(63);
    expect(level("boss-saturn-galactic-hq", "bronzor")).toBe(38);
    const golbats = game.fights
      .find((f) => f.id === "boss-mars-jupiter-spear-pillar")
      ?.roster.filter((m) => m.species === "golbat")
      .map((m) => m.level);
    expect(golbats).toEqual([42, 41]);
  });
});

describe("diamond and pearl share one dataset", () => {
  test("Pearl's routes, fights and level caps are the same as Diamond's", () => {
    expect(pearl.routes).toBe(diamond.routes);
    expect(pearl.fights).toBe(diamond.fights);
    expect(pearl.levelCaps).toBe(diamond.levelCaps);
  });
});

describe.each([diamond, pearl])("$id runs", (game) => {
  test("a run seeds its routes and fights", () => {
    const routes = seedRoutes("run-1", game);
    const fights = seedFights("run-1", game);
    expect(routes.map((r) => r.gameRouteId)).toEqual(game.routes.map((r) => r.id));
    expect(fights.map((f) => f.gameFightId)).toEqual(game.fights.map((f) => f.id));
  });

  test("resolve in generation 4, where Clefairy is Normal", () => {
    const clefairy = toSpecies(pokemonFixtures.clefairy!);
    expect(typesIn(clefairy, game.generation)).toEqual(["normal"]);
  });
});

describe.each([diamond, pearl])("$id only-routes", (game) => {
  test("exactly these routes are flagged", () => {
    const flagged = Object.fromEntries(
      game.routes.filter((r) => r.only !== undefined).map((r) => [r.id, r.only]),
    );
    expect(flagged).toEqual({
      "oreburgh-city": "gift",
      "hearthome-city": "gift",
      "snowpoint-city": "gift",
      "spear-pillar": "static",
    });
  });

  test("Floaroma Meadow and the starter are not flagged", () => {
    expect(game.routes.find((r) => r.id === "floaroma-meadow")?.only).toBeUndefined();
    expect(game.routes.find((r) => r.id === "starter")?.only).toBeUndefined();
  });
});
