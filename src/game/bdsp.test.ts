import { describe, expect, test } from "vitest";

import { GAME_IDS } from "@/domain/types";
import { brilliantDiamond, shiningPearl } from "@/game/data/bdsp";
import { monFields } from "@/game/fields";
import { toSpecies } from "@/game/pokeapi/map";
import { typesIn } from "@/game/pokeapi/resolve";
import { GAMES } from "@/game/registry";
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
  "rival-1": 9,
  "boss-mars-valley-windworks": 16,
  "boss-jupiter-eterna-building": 20,
  "rival-2": 21,
  "rival-3": 31,
  "rival-4": 37,
  "boss-saturn-valor-cavern": 37,
  "boss-mars-lake-verity": 39,
  "boss-cyrus-galactic-hq": 43,
  "boss-saturn-galactic-hq": 40,
  "boss-mars-jupiter-spear-pillar": 46,
  "boss-cyrus-spear-pillar": 48,
  "rival-5": 55,
};

const aceOf = (fight: FightDef | undefined): number =>
  Math.max(...(fight?.roster.map((m) => m.level) ?? []));

describe.each([brilliantDiamond, shiningPearl])("$id spot-check and caps", (game) => {
  const byId = new Map<string, FightDef>(game.fights.map((f) => [f.id, f]));

  test.each(Object.entries(VERIFIED_ACE_LEVELS))("%s has ace level %i", (id, expectedAce) => {
    expect(byId.get(id)).toBeDefined();
    expect(aceOf(byId.get(id))).toBe(expectedAce);
  });

  test("every fight has a verified ace", () => {
    expect(Object.keys(VERIFIED_ACE_LEVELS).toSorted()).toEqual(
      game.fights.map((f) => f.id).toSorted(),
    );
  });

  test("the cap table follows the source", () => {
    expect(game.levelCaps).toEqual([
      { cap: 14, until: { badges: 1 } },
      { cap: 22, until: { badges: 2 } },
      { cap: 30, until: { badges: 3 } },
      { cap: 30, until: { badges: 4 } },
      { cap: 36, until: { badges: 5 } },
      { cap: 39, until: { badges: 6 } },
      { cap: 42, until: { badges: 7 } },
      { cap: 49, until: { badges: 8 } },
      { cap: 57, until: { fight: "elite-four-aaron" } },
      { cap: 59, until: { fight: "elite-four-bertha" } },
      { cap: 61, until: { fight: "elite-four-flint" } },
      { cap: 63, until: { fight: "elite-four-lucian" } },
      { cap: 66, until: { fight: "champion-cynthia" } },
    ]);
  });

  test("caps never decrease", () => {
    const caps = game.levelCaps.map((m) => m.cap);
    expect(caps).toEqual(caps.toSorted((a, b) => a - b));
  });

  test("no fight's ace is above the cap in force when it is reached, in story order", () => {
    const gate = (id: string): number => byId.get(id)?.order ?? 0;
    for (const fight of game.fights.toSorted((a, b) => a.order - b.order)) {
      const held = game.fights.filter((f) => f.grantsBadge && f.order < fight.order).length;
      const open = game.levelCaps.find(({ until }) =>
        "badges" in until ? until.badges > held : gate(until.fight) >= fight.order,
      );
      expect(open, fight.id).toBeDefined();
      expect(aceOf(fight), fight.id).toBeLessThanOrEqual(open?.cap ?? 0);
    }
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

describe.each([brilliantDiamond, shiningPearl])("$id shape", (game) => {
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

  test("has 58 routes, all in Sinnoh, and every fight is in Sinnoh", () => {
    expect(game.routes).toHaveLength(58);
    expect(game.routes.every((r) => r.region === "sinnoh")).toBe(true);
    expect(game.fights.every((f) => f.region === "sinnoh")).toBe(true);
  });

  test("Spear Pillar comes after Lake Acuity", () => {
    const ids = game.routes.map((r) => r.id);
    expect(ids.indexOf("spear-pillar")).toBe(ids.indexOf("lake-acuity") + 1);
  });

  test("the Grand Underground is one route, right after Eterna City", () => {
    const ids = game.routes.map((r) => r.id);
    expect(ids.indexOf("grand-underground")).toBe(ids.indexOf("eterna-city") + 1);
    expect(game.routes.find((r) => r.id === "grand-underground")?.name).toBe("Grand Underground");
    expect(game.routes.find((r) => r.id === "grand-underground")?.only).toBeUndefined();
  });

  test("route orders run 1 to 58", () => {
    expect(game.routes.map((r) => r.order)).toEqual(Array.from({ length: 58 }, (_, i) => i + 1));
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

  test("Barry's Pastoria, Canalave and League rosters differ from Diamond and Pearl", () => {
    const levels = (id: string): number[] =>
      game.fights.find((f) => f.id === id)?.roster.map((m) => m.level) ?? [];
    expect(levels("rival-3")).toEqual([26, 26, 27, 27, 31, 31, 31]);
    expect(levels("rival-4")).toEqual([32, 33, 32, 34, 34, 37, 37, 37]);
    expect(levels("rival-5")).toEqual([49, 51, 52, 49, 49, 49, 55, 55, 55]);
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

describe("brilliant diamond and shining pearl share one dataset", () => {
  test("Shining Pearl's routes, fights and level caps are the same as Brilliant Diamond's", () => {
    expect(shiningPearl.routes).toBe(brilliantDiamond.routes);
    expect(shiningPearl.fights).toBe(brilliantDiamond.fights);
    expect(shiningPearl.levelCaps).toBe(brilliantDiamond.levelCaps);
  });
});

describe("registration", () => {
  test("both games are ids and registered under their names", () => {
    for (const [id, game, name] of [
      ["brilliantdiamond", brilliantDiamond, "Brilliant Diamond"],
      ["shiningpearl", shiningPearl, "Shining Pearl"],
    ] as const) {
      expect(GAME_IDS).toContain(id);
      expect(GAMES[id]).toBe(game);
      expect(game.name).toBe(name);
      expect(game.id).toBe(id);
    }
  });

  test("they are generation 8, released on the worldwide date", () => {
    for (const game of [brilliantDiamond, shiningPearl]) {
      expect(game.generation).toBe(8);
      expect(game.released).toBe("2021-11-19");
    }
  });
});

describe.each([brilliantDiamond, shiningPearl])("$id runs", (game) => {
  test("a run seeds its routes and fights", () => {
    const routes = seedRoutes("run-1", game);
    const fights = seedFights("run-1", game);
    expect(routes.map((r) => r.gameRouteId)).toEqual(game.routes.map((r) => r.id));
    expect(fights.map((f) => f.gameFightId)).toEqual(game.fights.map((f) => f.id));
  });

  test("resolve in generation 8, where Clefairy is Fairy", () => {
    const clefairy = toSpecies(pokemonFixtures.clefairy!);
    expect(typesIn(clefairy, game.generation)).toEqual(["fairy"]);
  });

  test("show nature, ability, held item, gender and shiny", () => {
    expect(monFields(game)).toEqual({
      nature: true,
      ability: true,
      heldItem: true,
      gender: true,
      shiny: true,
    });
  });
});

describe.each([brilliantDiamond, shiningPearl])("$id only-routes", (game) => {
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
