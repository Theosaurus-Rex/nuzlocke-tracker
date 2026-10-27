import { describe, expect, test } from "vitest";

import { GAME_IDS } from "@/domain/types";
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
  "gym-brock": 12,
  "gym-misty": 21,
  "gym-lt-surge": 28,
  "gym-erika": 32,
  "gym-sabrina": 50,
  "gym-koga": 50,
  "gym-blaine": 54,
  "gym-giovanni": 55,
  "elite-four-lorelei": 56,
  "elite-four-bruno": 58,
  "elite-four-agatha": 60,
  "elite-four-lance": 62,
  "champion-blue": 65,
  "boss-giovanni-rocket-hideout": 29,
  "boss-giovanni-silph-co": 41,
  "boss-jessie-james-mt-moon": 14,
  "boss-jessie-james-rocket-hideout": 25,
  "boss-jessie-james-pokemon-tower": 27,
  "boss-jessie-james-silph-co": 31,
  "rival-blue-1": 5,
  "rival-blue-2": 18,
  "rival-blue-3": 20,
  "rival-blue-4": 25,
  "rival-blue-5": 40,
  "rival-blue-6": 53,
};

const aceOf = (fight: FightDef | undefined): number =>
  Math.max(...(fight?.roster.map((m) => m.level) ?? []));

const E4 = ["elite-four-lorelei", "elite-four-bruno", "elite-four-agatha", "elite-four-lance"];
const JESSIE_JAMES = [
  "boss-jessie-james-mt-moon",
  "boss-jessie-james-rocket-hideout",
  "boss-jessie-james-pokemon-tower",
  "boss-jessie-james-silph-co",
];

const byId = new Map<string, FightDef>(yellow.fights.map((f) => [f.id, f]));
const count = (pred: (f: FightDef) => boolean): number => yellow.fights.filter(pred).length;
const level = (id: string, species: string): number | undefined =>
  byId.get(id)?.roster.find((m) => m.species === species)?.level;

describe("yellow spot-check and caps", () => {
  test.each(Object.entries(VERIFIED_ACE_LEVELS))("%s has ace level %i", (id, expectedAce) => {
    expect(byId.get(id)).toBeDefined();
    expect(aceOf(byId.get(id))).toBe(expectedAce);
  });

  test("badge caps are the verified gym aces, lowest first", () => {
    const gymIds = yellow.fights.filter((f) => f.grantsBadge).map((f) => f.id);
    const caps = yellow.levelCaps.filter(({ until }) => "badges" in until).map((m) => m.cap);
    const gymAces = gymIds.map((id) => VERIFIED_ACE_LEVELS[id] ?? 0);
    expect(caps).toEqual(gymAces.toSorted((a, b) => a - b));
  });

  test.each([...E4, "champion-blue"])("%s caps at its verified ace", (id) => {
    const milestone = yellow.levelCaps.find(({ until }) => "fight" in until && until.fight === id);
    expect(milestone?.cap).toBe(VERIFIED_ACE_LEVELS[id]);
  });

  test("caps never decrease and the Champion's cap comes last", () => {
    const caps = yellow.levelCaps.map((m) => m.cap);
    expect(caps).toEqual(caps.toSorted((a, b) => a - b));
    expect(yellow.levelCaps.at(-1)?.until).toEqual({ fight: "champion-blue" });
  });

  test("no boss fight carries a cap", () => {
    const capped = new Set(
      yellow.levelCaps.flatMap(({ until }) => ("fight" in until ? [until.fight] : [])),
    );
    expect(yellow.fights.filter((f) => f.kind === "boss" && capped.has(f.id))).toEqual([]);
  });
});

describe("yellow shape", () => {
  test("has 25 fights: 8 badges, 6 rival, 6 boss, 4 Elite Four and 1 Champion", () => {
    expect(yellow.fights).toHaveLength(25);
    expect(count((f) => f.grantsBadge)).toBe(8);
    expect(count((f) => f.kind === "rival")).toBe(6);
    expect(count((f) => f.kind === "boss")).toBe(6);
    expect(count((f) => f.kind === "elite_four")).toBe(4);
    expect(count((f) => f.kind === "champion")).toBe(1);
  });

  test("fight orders run 1 to 25 in traversal order", () => {
    expect(yellow.fights.map((f) => f.order)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    expect(yellow.fights.map((f) => f.id)).toEqual([
      "rival-blue-1",
      "gym-brock",
      "boss-jessie-james-mt-moon",
      "gym-misty",
      "rival-blue-2",
      "rival-blue-3",
      "gym-lt-surge",
      "gym-erika",
      "boss-jessie-james-rocket-hideout",
      "boss-giovanni-rocket-hideout",
      "rival-blue-4",
      "boss-jessie-james-pokemon-tower",
      "rival-blue-5",
      "boss-jessie-james-silph-co",
      "boss-giovanni-silph-co",
      "gym-sabrina",
      "gym-koga",
      "gym-blaine",
      "gym-giovanni",
      "rival-blue-6",
      ...E4,
      "champion-blue",
    ]);
  });

  test("the badge fights use the sprite numbers 1 to 8 in badge order", () => {
    const badges = yellow.fights
      .filter((f) => f.grantsBadge)
      .toSorted((a, b) => (a.badgeSprite ?? 0) - (b.badgeSprite ?? 0));
    expect(badges.map((f) => f.badgeSprite)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(badges.map((f) => [f.id, f.badge])).toEqual([
      ["gym-brock", "Boulder"],
      ["gym-misty", "Cascade"],
      ["gym-lt-surge", "Thunder"],
      ["gym-erika", "Rainbow"],
      ["gym-koga", "Soul"],
      ["gym-sabrina", "Marsh"],
      ["gym-blaine", "Volcano"],
      ["gym-giovanni", "Earth"],
    ]);
  });

  test("has 45 routes and 25 fights, all in Kanto, generation 1", () => {
    expect(yellow.routes).toHaveLength(45);
    expect(yellow.routes.map((r) => r.order)).toEqual(Array.from({ length: 45 }, (_, i) => i + 1));
    expect(yellow.routes.every((r) => r.region === "kanto")).toBe(true);
    expect(yellow.fights.every((f) => f.region === "kanto")).toBe(true);
    expect(yellow.generation).toBe(1);
    expect(yellow.released).toBe("1999-10-18");
  });

  test("the route order has the starter first and leaves post-game places out", () => {
    const ids = yellow.routes.map((r) => r.id);
    expect(ids[0]).toBe("starter");
    expect(ids.at(-1)).toBe("victory-road");
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain("cerulean-cave");
  });

  test("Giovanni's story fights and all four Jessie and James fights are bosses", () => {
    for (const id of ["boss-giovanni-rocket-hideout", "boss-giovanni-silph-co", ...JESSIE_JAMES]) {
      expect(byId.get(id)?.kind, id).toBe("boss");
    }
    expect(byId.get("gym-giovanni")?.kind).toBe("gym");
    expect(byId.get("champion-blue")?.kind).toBe("champion");
  });

  test("Jessie and James are one team of three each", () => {
    for (const id of JESSIE_JAMES) {
      expect(byId.get(id)?.roster, id).toHaveLength(3);
    }
  });

  test("the Champion lists all three Eevee lines, with the Yellow levels", () => {
    expect(level("champion-blue", "jolteon")).toBe(65);
    expect(level("champion-blue", "flareon")).toBe(65);
    expect(level("champion-blue", "vaporeon")).toBe(65);
    expect(level("champion-blue", "sandslash")).toBe(61);
    expect(level("champion-blue", "alakazam")).toBe(59);
  });

  test("later rivals list all three Eevee lines", () => {
    expect(level("rival-blue-5", "jolteon")).toBe(40);
    expect(level("rival-blue-5", "flareon")).toBe(40);
    expect(level("rival-blue-5", "vaporeon")).toBe(40);
    expect(level("rival-blue-6", "jolteon")).toBe(53);
    expect(level("rival-blue-6", "flareon")).toBe(53);
    expect(level("rival-blue-6", "vaporeon")).toBe(53);
  });

  test("the Oak's Lab rival is only Eevee", () => {
    expect(byId.get("rival-blue-1")?.roster).toEqual([{ species: "eevee", level: 5 }]);
  });

  test("Lance tops out at Dragonite 62 and keeps both Dragonair", () => {
    const lance = byId.get("elite-four-lance")?.roster;
    expect(lance?.filter((m) => m.species === "dragonair")).toHaveLength(2);
    expect(level("elite-four-lance", "dragonite")).toBe(62);
  });

  test("the optional first Route 22 rival battle is not a fight", () => {
    expect(
      yellow.fights.some((f) => f.roster.some((m) => m.species === "spearow" && m.level === 9)),
    ).toBe(false);
  });
});

describe("starter gifts", () => {
  test("Bulbasaur, Charmander and Squirtle sit on routes that exist and carry no tag", () => {
    for (const id of ["cerulean-city", "route-24", "vermilion-city"]) {
      const route = yellow.routes.find((r) => r.id === id);
      expect(route, id).toBeDefined();
      expect(route?.only, id).toBeUndefined();
    }
  });
});

describe("registration", () => {
  test("yellow is a game id and registered", () => {
    expect(GAME_IDS).toContain("yellow");
    expect(GAMES.yellow).toBe(yellow);
    expect(yellow.name).toBe("Yellow");
  });
});

describe("yellow runs", () => {
  test("a run seeds its routes and fights", () => {
    const routes = seedRoutes("run-1", yellow);
    const fights = seedFights("run-1", yellow);
    expect(routes.map((r) => r.gameRouteId)).toEqual(yellow.routes.map((r) => r.id));
    expect(fights.map((f) => f.gameFightId)).toEqual(yellow.fights.map((f) => f.id));
  });

  test("resolve in generation 1, where Clefairy is Normal", () => {
    const clefairy = toSpecies(pokemonFixtures.clefairy!);
    expect(typesIn(clefairy, yellow.generation)).toEqual(["normal"]);
  });

  test("hide nature, ability, held item, gender and shiny", () => {
    expect(monFields(yellow)).toEqual({
      nature: false,
      ability: false,
      heldItem: false,
      gender: false,
      shiny: false,
    });
  });
});

describe("yellow only-routes", () => {
  test("the gift routes are flagged and nothing else", () => {
    const flagged = Object.fromEntries(
      yellow.routes.filter((r) => r.only !== undefined).map((r) => [r.id, r.only]),
    );
    expect(flagged).toEqual({ "saffron-city": "gift", "silph-co": "gift" });
  });

  test("the starter and routes with wild water are not flagged", () => {
    for (const id of ["starter", "route-4", "cinnabar-island", "celadon-city", "cerulean-city"]) {
      expect(yellow.routes.find((r) => r.id === id)?.only, id).toBeUndefined();
    }
  });
});
