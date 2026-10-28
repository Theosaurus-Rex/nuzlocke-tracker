import { describe, expect, test } from "vitest";

import { GAME_IDS } from "@/domain/types";
import { crystal, gold, silver } from "@/game/data/gsc";
import { yellow } from "@/game/data/yellow";
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
  "gym-falkner": 9,
  "gym-bugsy": 16,
  "gym-whitney": 20,
  "gym-morty": 25,
  "gym-chuck": 30,
  "gym-jasmine": 35,
  "gym-pryce": 31,
  "gym-clair": 40,
  "gym-lt-surge": 46,
  "gym-sabrina": 48,
  "gym-erika": 46,
  "gym-janine": 39,
  "gym-misty": 47,
  "gym-brock": 44,
  "gym-blaine": 50,
  "gym-blue": 58,
  "elite-four-will": 42,
  "elite-four-koga": 44,
  "elite-four-bruno": 46,
  "elite-four-karen": 47,
  "champion-lance": 50,
  "rival-red": 81,
  "rival-silver-1": 5,
  "rival-silver-2": 16,
  "rival-silver-3": 32,
  "rival-silver-4": 38,
  "boss-petrel-rocket-hideout": 24,
  "boss-ariana-rocket-hideout": 25,
  "boss-petrel-radio-tower": 32,
  "boss-proton-radio-tower": 36,
  "boss-archer-radio-tower": 35,
};

const aceOf = (fight: FightDef | undefined): number =>
  Math.max(...(fight?.roster.map((m) => m.level) ?? []));

const E4 = ["elite-four-will", "elite-four-koga", "elite-four-bruno", "elite-four-karen"];
const ROCKET = [
  "boss-petrel-rocket-hideout",
  "boss-ariana-rocket-hideout",
  "boss-petrel-radio-tower",
  "boss-proton-radio-tower",
  "boss-archer-radio-tower",
];
const JOHTO_BADGES = [
  ["gym-falkner", "Zephyr", 9],
  ["gym-bugsy", "Hive", 10],
  ["gym-whitney", "Plain", 11],
  ["gym-morty", "Fog", 12],
  ["gym-chuck", "Storm", 13],
  ["gym-jasmine", "Mineral", 14],
  ["gym-pryce", "Glacier", 15],
  ["gym-clair", "Rising", 16],
] as const;
const KANTO_BADGES = [
  ["gym-brock", "Boulder", 1],
  ["gym-misty", "Cascade", 2],
  ["gym-lt-surge", "Thunder", 3],
  ["gym-erika", "Rainbow", 4],
  ["gym-janine", "Soul", 5],
  ["gym-sabrina", "Marsh", 6],
  ["gym-blaine", "Volcano", 7],
  ["gym-blue", "Earth", 8],
] as const;

const byId = new Map<string, FightDef>(gold.fights.map((f) => [f.id, f]));
const count = (pred: (f: FightDef) => boolean): number => gold.fights.filter(pred).length;
const level = (id: string, species: string): number | undefined =>
  byId.get(id)?.roster.find((m) => m.species === species)?.level;
const flagged = (game: typeof gold): Record<string, string | undefined> =>
  Object.fromEntries(game.routes.filter((r) => r.only !== undefined).map((r) => [r.id, r.only]));

describe("gold spot-check and caps", () => {
  test.each(Object.entries(VERIFIED_ACE_LEVELS))("%s has ace level %i", (id, expectedAce) => {
    expect(byId.get(id)).toBeDefined();
    expect(aceOf(byId.get(id))).toBe(expectedAce);
  });

  test("Johto badge caps are the gym aces, with Pryce held at Jasmine's 35", () => {
    const caps = gold.levelCaps.filter(({ until }) => "badges" in until).map((m) => m.cap);
    expect(caps.slice(0, 8)).toEqual([9, 16, 20, 25, 30, 35, 35, 40]);
  });

  test("Kanto badge caps are 50 for the first seven, then Blue's 58", () => {
    const caps = gold.levelCaps.filter(({ until }) => "badges" in until).map((m) => m.cap);
    expect(caps.slice(8)).toEqual([50, 50, 50, 50, 50, 50, 50, 58]);
  });

  test.each([...E4, "champion-lance"])("%s caps at its verified ace", (id) => {
    const milestone = gold.levelCaps.find(({ until }) => "fight" in until && until.fight === id);
    expect(milestone?.cap).toBe(VERIFIED_ACE_LEVELS[id]);
  });

  test("caps never decrease and Red's cap of 81 comes last", () => {
    const caps = gold.levelCaps.map((m) => m.cap);
    expect(caps).toEqual(caps.toSorted((a, b) => a - b));
    expect(gold.levelCaps.at(-1)).toEqual({ cap: 81, until: { fight: "rival-red" } });
  });

  test("no boss fight carries a cap", () => {
    const capped = new Set(
      gold.levelCaps.flatMap(({ until }) => ("fight" in until ? [until.fight] : [])),
    );
    expect(gold.fights.filter((f) => f.kind === "boss" && capped.has(f.id))).toEqual([]);
  });
});

describe("gold shape", () => {
  test("has 31 fights: 16 gym, 4 Elite Four, 1 champion, 5 rival and 5 boss", () => {
    expect(gold.fights).toHaveLength(31);
    expect(count((f) => f.kind === "gym")).toBe(16);
    expect(count((f) => f.grantsBadge)).toBe(16);
    expect(count((f) => f.kind === "elite_four")).toBe(4);
    expect(count((f) => f.kind === "champion")).toBe(1);
    expect(count((f) => f.kind === "rival")).toBe(5);
    expect(count((f) => f.kind === "boss")).toBe(5);
  });

  test("fight orders run 1 to 31 in traversal order", () => {
    expect(gold.fights.map((f) => f.order)).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
    expect(gold.fights.map((f) => f.id)).toEqual([
      "rival-silver-1",
      "gym-falkner",
      "gym-bugsy",
      "rival-silver-2",
      "gym-whitney",
      "gym-morty",
      "gym-chuck",
      "gym-jasmine",
      "boss-petrel-rocket-hideout",
      "boss-ariana-rocket-hideout",
      "gym-pryce",
      "boss-petrel-radio-tower",
      "rival-silver-3",
      "boss-proton-radio-tower",
      "boss-archer-radio-tower",
      "gym-clair",
      "rival-silver-4",
      ...E4,
      "champion-lance",
      "gym-lt-surge",
      "gym-sabrina",
      "gym-erika",
      "gym-janine",
      "gym-misty",
      "gym-brock",
      "gym-blaine",
      "gym-blue",
      "rival-red",
    ]);
  });

  test("Johto badge sprites are 9 to 16 and Kanto's are 1 to 8", () => {
    for (const [id, badge, sprite] of [...JOHTO_BADGES, ...KANTO_BADGES]) {
      expect([byId.get(id)?.badge, byId.get(id)?.badgeSprite], id).toEqual([badge, sprite]);
    }
  });

  test("Johto fights are in Johto and the Kanto gyms and Red are in Kanto", () => {
    for (const [id] of KANTO_BADGES) expect(byId.get(id)?.region, id).toBe("kanto");
    expect(byId.get("rival-red")?.region).toBe("kanto");
    for (const [id] of JOHTO_BADGES) expect(byId.get(id)?.region, id).toBe("johto");
    expect(byId.get("champion-lance")?.region).toBe("johto");
  });

  test("the five Rocket executive fights are bosses with no badge", () => {
    for (const id of ROCKET) {
      expect(byId.get(id)?.kind, id).toBe("boss");
      expect(byId.get(id)?.grantsBadge, id).toBe(false);
    }
  });

  test("the skippable Burned Tower and Mt. Moon Silver fights and the rematch are left out", () => {
    expect(gold.fights.map((f) => f.id)).not.toContain("rival-silver-5");
    expect(gold.fights.some((f) => f.kind === "rival" && aceOf(f) === 22)).toBe(false);
    expect(gold.fights.some((f) => f.kind === "rival" && aceOf(f) === 45)).toBe(false);
    expect(gold.fights.some((f) => f.kind === "rival" && aceOf(f) === 50)).toBe(false);
  });

  test("Silver fights list all three starter lines", () => {
    for (const species of ["bayleef", "quilava", "croconaw"]) {
      expect(level("rival-silver-2", species), species).toBe(16);
    }
    for (const species of ["meganium", "typhlosion", "feraligatr"]) {
      expect(level("rival-silver-4", species), species).toBe(38);
    }
    expect(byId.get("rival-silver-1")?.roster.map((m) => m.species)).toEqual([
      "chikorita",
      "cyndaquil",
      "totodile",
    ]);
  });

  test("Lance is a champion and keeps three Dragonite", () => {
    expect(byId.get("champion-lance")?.kind).toBe("champion");
    expect(
      byId.get("champion-lance")?.roster.filter((m) => m.species === "dragonite"),
    ).toHaveLength(3);
  });

  test("Blue is a gym and Red is a rival", () => {
    expect(byId.get("gym-blue")?.kind).toBe("gym");
    expect(byId.get("rival-red")?.kind).toBe("rival");
  });
});

describe("routes", () => {
  test("Gold has 84 routes in unique increasing order, with the starter first", () => {
    expect(gold.routes).toHaveLength(84);
    expect(gold.routes.map((r) => r.order)).toEqual(Array.from({ length: 84 }, (_, i) => i + 1));
    expect(gold.routes[0]?.id).toBe("starter");
    expect(gold.routes[0]?.only).toBeUndefined();
    expect(new Set(gold.routes.map((r) => r.id)).size).toBe(84);
  });

  test("Crystal has 85 routes in unique increasing order, with the Power Plant after Route 10", () => {
    expect(crystal.routes).toHaveLength(85);
    expect(crystal.routes.map((r) => r.order)).toEqual(Array.from({ length: 85 }, (_, i) => i + 1));
    const ids = crystal.routes.map((r) => r.id);
    expect(ids.indexOf("power-plant")).toBe(ids.indexOf("route-10") + 1);
    expect(ids.filter((id) => id !== "power-plant")).toEqual(gold.routes.map((r) => r.id));
  });

  test("the Power Plant is in Crystal and not in Gold or Silver", () => {
    expect(crystal.routes.map((r) => r.id)).toContain("power-plant");
    expect(gold.routes.map((r) => r.id)).not.toContain("power-plant");
    expect(silver.routes.map((r) => r.id)).not.toContain("power-plant");
  });

  test("only the gift and static routes are flagged", () => {
    expect(flagged(gold)).toEqual({
      "goldenrod-city": "gift",
      "pewter-city": "gift",
      "rocket-hideout": "static",
    });
    expect(flagged(crystal)).toEqual({
      "goldenrod-city": "gift",
      "pewter-city": "gift",
      "rocket-hideout": "static",
      "power-plant": "gift",
    });
  });

  test("the town and water routes are not flagged", () => {
    for (const id of ["starter", "cianwood-city", "celadon-city", "violet-city", "route-34"]) {
      expect(gold.routes.find((r) => r.id === id)?.only, id).toBeUndefined();
    }
  });

  test("places the games lack or exclude are not routes", () => {
    const ids = crystal.routes.map((r) => r.id);
    for (const id of ["mahogany-town", "indigo-plateau", "saffron-city", "safari-zone"]) {
      expect(ids, id).not.toContain(id);
    }
    expect(ids).toContain("vermilion-city");
    expect(ids).toContain("fuchsia-city");
    expect(ids.indexOf("tin-tower")).toBeGreaterThan(ids.indexOf("lake-of-rage"));
  });
});

describe("registration", () => {
  test("gold, silver and crystal are game ids and registered", () => {
    for (const [id, game, name] of [
      ["gold", gold, "Gold"],
      ["silver", silver, "Silver"],
      ["crystal", crystal, "Crystal"],
    ] as const) {
      expect(GAME_IDS).toContain(id);
      expect(GAMES[id]).toBe(game);
      expect(game.name).toBe(name);
      expect(game.id).toBe(id);
    }
  });

  test("the three games share one fights list and one set of caps", () => {
    expect(silver.fights).toBe(gold.fights);
    expect(crystal.fights).toBe(gold.fights);
    expect(silver.levelCaps).toBe(gold.levelCaps);
    expect(crystal.levelCaps).toBe(gold.levelCaps);
    expect(silver.routes).toBe(gold.routes);
  });

  test("they are generation 2 and sort after Yellow by Japan release date", () => {
    for (const game of [gold, silver, crystal]) expect(game.generation).toBe(2);
    expect(gold.released).toBe("1999-11-21");
    expect(silver.released).toBe("1999-11-21");
    expect(crystal.released).toBe("2000-12-14");
    expect(gold.released > yellow.released).toBe(true);
  });
});

describe("gold runs", () => {
  test("a Crystal run seeds its routes and fights", () => {
    const routes = seedRoutes("run-1", crystal);
    const fights = seedFights("run-1", crystal);
    expect(routes.map((r) => r.gameRouteId)).toEqual(crystal.routes.map((r) => r.id));
    expect(fights.map((f) => f.gameFightId)).toEqual(crystal.fights.map((f) => f.id));
  });

  test("resolve in generation 2, where Clefairy is Normal", () => {
    const clefairy = toSpecies(pokemonFixtures.clefairy!);
    expect(typesIn(clefairy, gold.generation)).toEqual(["normal"]);
  });

  test("show held item, gender and shiny and hide nature and ability", () => {
    expect(monFields(gold)).toEqual({
      nature: false,
      ability: false,
      heldItem: true,
      gender: true,
      shiny: true,
    });
  });
});
