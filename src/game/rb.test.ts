import { describe, expect, test } from "vitest";

import { GAME_IDS } from "@/domain/types";
import { blue, red } from "@/game/data/rb";
import { monFields } from "@/game/fields";
import { toSpecies } from "@/game/pokeapi/map";
import { typesIn } from "@/game/pokeapi/resolve";
import { GAMES } from "@/game/registry";
import { seedFights, seedRoutes } from "@/game/seed";
import type { FightDef, GameData } from "@/game/types";
import { pokemonFixtures } from "@/test/pokeapi-fixtures";

/** Independently sourced ace levels, not derived from our own data. See docs/notes/game-data.md
 * for the sources and why. */
const VERIFIED_ACE_LEVELS: Record<string, number> = {
  "gym-brock": 14,
  "gym-misty": 21,
  "gym-lt-surge": 24,
  "gym-erika": 29,
  "gym-sabrina": 43,
  "gym-koga": 43,
  "gym-blaine": 47,
  "gym-giovanni": 50,
  "elite-four-lorelei": 56,
  "elite-four-bruno": 58,
  "elite-four-agatha": 60,
  "elite-four-lance": 62,
  "champion-blue": 65,
  "boss-giovanni-rocket-hideout": 29,
  "boss-giovanni-silph-co": 41,
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

const games: GameData[] = [red, blue];

describe.each(games)("$id spot-check and caps", (game) => {
  const byId = new Map<string, FightDef>(game.fights.map((f) => [f.id, f]));

  test.each(Object.entries(VERIFIED_ACE_LEVELS))("%s has ace level %i", (id, expectedAce) => {
    expect(byId.get(id)).toBeDefined();
    expect(aceOf(byId.get(id))).toBe(expectedAce);
  });

  test("badge caps are the verified gym aces, lowest first", () => {
    const gymIds = game.fights.filter((f) => f.grantsBadge).map((f) => f.id);
    const caps = game.levelCaps.filter(({ until }) => "badges" in until).map((m) => m.cap);
    const gymAces = gymIds.map((id) => VERIFIED_ACE_LEVELS[id] ?? 0);
    expect(caps).toEqual(gymAces.toSorted((a, b) => a - b));
  });

  test.each([...E4, "champion-blue"])("%s caps at its verified ace", (id) => {
    const milestone = game.levelCaps.find(({ until }) => "fight" in until && until.fight === id);
    expect(milestone?.cap).toBe(VERIFIED_ACE_LEVELS[id]);
  });

  test("caps never decrease and the Champion's cap comes last", () => {
    const caps = game.levelCaps.map((m) => m.cap);
    expect(caps).toEqual(caps.toSorted((a, b) => a - b));
    expect(game.levelCaps.at(-1)?.until).toEqual({ fight: "champion-blue" });
  });

  test("no boss fight carries a cap", () => {
    const capped = new Set(
      game.levelCaps.flatMap(({ until }) => ("fight" in until ? [until.fight] : [])),
    );
    expect(game.fights.filter((f) => f.kind === "boss" && capped.has(f.id))).toEqual([]);
  });
});

describe.each(games)("$id shape", (game) => {
  const count = (pred: (f: FightDef) => boolean): number => game.fights.filter(pred).length;
  const level = (id: string, species: string): number | undefined =>
    game.fights.find((f) => f.id === id)?.roster.find((m) => m.species === species)?.level;

  test("has 21 fights: 8 badges, 6 rival, 2 boss, 4 Elite Four and 1 Champion", () => {
    expect(game.fights).toHaveLength(21);
    expect(count((f) => f.grantsBadge)).toBe(8);
    expect(count((f) => f.kind === "rival")).toBe(6);
    expect(count((f) => f.kind === "boss")).toBe(2);
    expect(count((f) => f.kind === "elite_four")).toBe(4);
    expect(count((f) => f.kind === "champion")).toBe(1);
  });

  test("fight orders run 1 to 21 in traversal order", () => {
    expect(game.fights.map((f) => f.order)).toEqual(Array.from({ length: 21 }, (_, i) => i + 1));
    expect(game.fights.map((f) => f.id)).toEqual([
      "rival-blue-1",
      "gym-brock",
      "gym-misty",
      "rival-blue-2",
      "rival-blue-3",
      "gym-lt-surge",
      "gym-erika",
      "boss-giovanni-rocket-hideout",
      "rival-blue-4",
      "rival-blue-5",
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
    const badges = game.fights
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

  test("has 45 routes and 21 fights, all in Kanto, generation 1", () => {
    expect(game.routes).toHaveLength(45);
    expect(game.routes.map((r) => r.order)).toEqual(Array.from({ length: 45 }, (_, i) => i + 1));
    expect(game.routes.every((r) => r.region === "kanto")).toBe(true);
    expect(game.fights.every((f) => f.region === "kanto")).toBe(true);
    expect(game.generation).toBe(1);
    expect(game.released).toBe("1996-02-27");
  });

  test("the route order has the starter first and leaves post-game places out", () => {
    const ids = game.routes.map((r) => r.id);
    expect(ids[0]).toBe("starter");
    expect(ids.at(-1)).toBe("victory-road");
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain("cerulean-cave");
  });

  test("the Giovanni story fights are bosses and the Viridian one is a gym", () => {
    const kinds = (id: string) => game.fights.find((f) => f.id === id)?.kind;
    expect(kinds("boss-giovanni-rocket-hideout")).toBe("boss");
    expect(kinds("boss-giovanni-silph-co")).toBe("boss");
    expect(kinds("gym-giovanni")).toBe("gym");
    expect(kinds("champion-blue")).toBe("champion");
  });

  test("the Champion lists all three starter lines, with the Gen 1 levels", () => {
    expect(level("champion-blue", "venusaur")).toBe(65);
    expect(level("champion-blue", "charizard")).toBe(65);
    expect(level("champion-blue", "blastoise")).toBe(65);
    expect(level("champion-blue", "pidgeot")).toBe(61);
    expect(level("champion-blue", "alakazam")).toBe(59);
    expect(level("rival-blue-2", "abra")).toBe(15);
    expect(level("rival-blue-5", "alakazam")).toBe(35);
    expect(level("rival-blue-6", "alakazam")).toBe(50);
  });

  test("the optional first Route 22 rival battle is not a fight", () => {
    expect(game.fights.some((f) => f.roster.some((m) => m.species === "pidgey"))).toBe(false);
  });
});

describe("red and blue share one dataset", () => {
  test("only the id and name differ", () => {
    expect(blue.routes).toBe(red.routes);
    expect(blue.fights).toBe(red.fights);
    expect(blue.levelCaps).toBe(red.levelCaps);
    expect([red.name, blue.name]).toEqual(["Red", "Blue"]);
  });
});

describe("registration", () => {
  test("red and blue are game ids and registered", () => {
    expect(GAME_IDS).toContain("red");
    expect(GAME_IDS).toContain("blue");
    expect(GAMES.red).toBe(red);
    expect(GAMES.blue).toBe(blue);
  });
});

describe.each(games)("$id runs", (game) => {
  test("a run seeds its routes and fights", () => {
    const routes = seedRoutes("run-1", game);
    const fights = seedFights("run-1", game);
    expect(routes.map((r) => r.gameRouteId)).toEqual(game.routes.map((r) => r.id));
    expect(fights.map((f) => f.gameFightId)).toEqual(game.fights.map((f) => f.id));
  });

  test("resolve in generation 1, where Clefairy is Normal", () => {
    const clefairy = toSpecies(pokemonFixtures.clefairy!);
    expect(typesIn(clefairy, game.generation)).toEqual(["normal"]);
  });

  test("hide nature, ability, held item, gender and shiny", () => {
    expect(monFields(game)).toEqual({
      nature: false,
      ability: false,
      heldItem: false,
      gender: false,
      shiny: false,
    });
  });
});

describe.each(games)("$id only-routes", (game) => {
  test("the gift routes are flagged and nothing else", () => {
    const flagged = Object.fromEntries(
      game.routes.filter((r) => r.only !== undefined).map((r) => [r.id, r.only]),
    );
    expect(flagged).toEqual({ "saffron-city": "gift", "silph-co": "gift" });
  });

  test("the starter and routes with wild water are not flagged", () => {
    for (const id of ["starter", "route-4", "cinnabar-island", "celadon-city", "cerulean-city"]) {
      expect(game.routes.find((r) => r.id === id)?.only, id).toBeUndefined();
    }
  });
});
