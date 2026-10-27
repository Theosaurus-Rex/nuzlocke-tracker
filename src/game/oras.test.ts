import { describe, expect, test } from "vitest";

import { GAME_IDS } from "@/domain/types";
import { alphaSapphire, omegaRuby } from "@/game/data/oras";
import {
  alphaSapphireBosses,
  alphaSapphireFights,
  omegaRubyBosses,
  omegaRubyFights,
} from "@/game/data/oras/fights";
import { toSpecies } from "@/game/pokeapi/map";
import { typesIn } from "@/game/pokeapi/resolve";
import { GAMES } from "@/game/registry";
import { seedFights, seedRoutes } from "@/game/seed";
import type { FightDef, GameData, RouteDef } from "@/game/types";
import { pokemonFixtures } from "@/test/pokeapi-fixtures";

/** Independently sourced ace levels, not derived from our own data. See docs/notes/game-data.md
 * for the sources and why. */
const SHARED_ACE_LEVELS: Record<string, number> = {
  "rival-1": 5,
  "rival-2": 20,
  "rival-3": 33,
  "rival-4": 39,
  "wally-1": 17,
  "wally-2": 48,
  "gym-roxanne": 14,
  "gym-brawly": 16,
  "gym-wattson": 21,
  "gym-flannery": 28,
  "gym-norman": 30,
  "gym-winona": 35,
  "gym-tate-and-liza": 45,
  "gym-wallace": 46,
  "elite-four-sidney": 52,
  "elite-four-phoebe": 53,
  "elite-four-glacia": 54,
  "elite-four-drake": 55,
  "champion-steven": 59,
};

const OMEGA_RUBY_BOSS_ACES: Record<string, number> = {
  "boss-tabitha-meteor-falls": 23,
  "boss-tabitha-mt-chimney": 24,
  "boss-maxie-mt-chimney": 27,
  "boss-courtney-southern-island": 31,
  "boss-tabitha-weather-institute": 32,
  "boss-courtney-mt-pyre": 38,
  "boss-courtney-magma-hideout": 39,
  "boss-maxie-seafloor-cavern": 43,
};

const ALPHA_SAPPHIRE_BOSS_ACES: Record<string, number> = {
  "boss-shelly-meteor-falls": 23,
  "boss-shelly-mt-chimney": 24,
  "boss-archie-mt-chimney": 27,
  "boss-matt-southern-island": 31,
  "boss-shelly-weather-institute": 32,
  "boss-matt-mt-pyre": 38,
  "boss-matt-aqua-hideout": 39,
  "boss-archie-seafloor-cavern": 43,
};

const aceOf = (fight: FightDef | undefined): number =>
  Math.max(...(fight?.roster.map((m) => m.level) ?? []));

const games: GameData[] = [omegaRuby, alphaSapphire];
const bossAces = (game: GameData): Record<string, number> =>
  game === omegaRuby ? OMEGA_RUBY_BOSS_ACES : ALPHA_SAPPHIRE_BOSS_ACES;
const hideout = (game: GameData): RouteDef | undefined =>
  game.routes.find((r) => r.id === "lilycove-hideout");

describe.each(games)("$id spot-check and caps", (game) => {
  const byId = new Map<string, FightDef>(game.fights.map((f) => [f.id, f]));
  const aces = { ...SHARED_ACE_LEVELS, ...bossAces(game) };

  test.each(Object.entries(aces))("%s has ace level %i", (id, expectedAce) => {
    expect(byId.get(id)).toBeDefined();
    expect(aceOf(byId.get(id))).toBe(expectedAce);
  });

  test("badge caps are the verified gym aces, lowest first", () => {
    const gymIds = game.fights.filter((f) => f.grantsBadge).map((f) => f.id);
    const caps = game.levelCaps.filter(({ until }) => "badges" in until).map((m) => m.cap);
    const gymAces = gymIds.map((id) => SHARED_ACE_LEVELS[id] ?? 0);
    expect(caps).toEqual(gymAces.toSorted((a, b) => a - b));
  });

  test.each([
    "elite-four-sidney",
    "elite-four-phoebe",
    "elite-four-glacia",
    "elite-four-drake",
    "champion-steven",
  ])("%s caps at its verified ace", (id) => {
    const milestone = game.levelCaps.find(({ until }) => "fight" in until && until.fight === id);
    expect(milestone?.cap).toBe(SHARED_ACE_LEVELS[id]);
  });

  test("caps never decrease and the Champion's cap comes last", () => {
    const caps = game.levelCaps.map((m) => m.cap);
    expect(caps).toEqual(caps.toSorted((a, b) => a - b));
    expect(game.levelCaps.at(-1)?.until).toEqual({ fight: "champion-steven" });
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

  test("has 27 fights: 8 badges, 6 rival, 8 boss, 4 Elite Four and 1 Champion", () => {
    expect(game.fights).toHaveLength(27);
    expect(count((f) => f.grantsBadge)).toBe(8);
    expect(count((f) => f.kind === "rival")).toBe(6);
    expect(count((f) => f.kind === "boss")).toBe(8);
    expect(count((f) => f.kind === "elite_four")).toBe(4);
    expect(count((f) => f.kind === "champion")).toBe(1);
  });

  test("fights are in traversal order, with the bosses between the shared fights", () => {
    expect(game.fights.map((f) => f.order)).toEqual(Array.from({ length: 27 }, (_, i) => i + 1));
    expect(game.fights.map((f) => f.id).filter((id) => !id.startsWith("boss-"))).toEqual([
      "rival-1",
      "gym-roxanne",
      "gym-brawly",
      "rival-2",
      "wally-1",
      "gym-wattson",
      "gym-flannery",
      "gym-norman",
      "rival-3",
      "gym-winona",
      "rival-4",
      "gym-tate-and-liza",
      "gym-wallace",
      "wally-2",
      "elite-four-sidney",
      "elite-four-phoebe",
      "elite-four-glacia",
      "elite-four-drake",
      "champion-steven",
    ]);
    const bossSlots = game.fights.flatMap((f, i) => (f.kind === "boss" ? [i + 1] : []));
    expect(bossSlots).toEqual([7, 8, 9, 12, 13, 16, 18, 20]);
  });

  test("the badge fights use the sprite numbers 17 to 24 in gym order", () => {
    const badges = game.fights.filter((f) => f.grantsBadge);
    expect(badges.map((f) => f.badgeSprite)).toEqual([17, 18, 19, 20, 21, 22, 23, 24]);
    expect(badges.map((f) => f.badge)).toEqual([
      "Stone",
      "Knuckle",
      "Dynamo",
      "Heat",
      "Balance",
      "Feather",
      "Mind",
      "Rain",
    ]);
  });

  test("has 69 routes and 27 fights, all in Hoenn, generation 6", () => {
    expect(game.routes).toHaveLength(69);
    expect(game.routes.every((r) => r.region === "hoenn")).toBe(true);
    expect(game.fights.every((f) => f.region === "hoenn")).toBe(true);
    expect(game.generation).toBe(6);
    expect(game.released).toBe("2014-11-21");
  });

  test("the route order follows the walkthrough and leaves post-game places out", () => {
    const ids = game.routes.map((r) => r.id);
    expect(ids[0]).toBe("starter");
    expect(ids.indexOf("new-mauville")).toBeGreaterThan(ids.indexOf("cave-of-origin"));
    expect(ids.indexOf("scorched-slab")).toBe(ids.indexOf("sea-mauville") + 1);
    expect(ids.slice(-2)).toEqual(["ever-grande-city", "victory-road"]);
    for (const gone of [
      "sky-pillar",
      "battle-resort",
      "ss-tidal",
      "littleroot-town",
      "gnarled-den",
    ]) {
      expect(ids).not.toContain(gone);
    }
  });

  test("Steven is the Champion and Aarune is not a fight", () => {
    expect(game.fights.find((f) => f.id === "champion-steven")?.kind).toBe("champion");
    expect(game.fights.some((f) => f.id.includes("aarune"))).toBe(false);
  });

  test("the Southern Island multi battle lists both opponents' Pokemon", () => {
    const fight = game.fights.find((f) => f.id.endsWith("southern-island"));
    expect(fight?.roster).toHaveLength(2);
  });
});

describe("omega ruby and alpha sapphire differ in the villain fights and the hideout name", () => {
  test("Omega Ruby's bosses are Team Magma, Alpha Sapphire's are Team Aqua", () => {
    const leaders = (bosses: FightDef[]): string[] =>
      [...new Set(bosses.map((f) => f.name.split(" (")[0] ?? ""))].toSorted();
    expect(leaders(omegaRubyBosses)).toEqual(["Courtney", "Maxie", "Tabitha"]);
    expect(leaders(alphaSapphireBosses)).toEqual(["Archie", "Matt", "Shelly"]);
  });

  test("Maxie is only in Omega Ruby and Archie only in Alpha Sapphire", () => {
    const has = (game: GameData, id: string): boolean => game.fights.some((f) => f.id === id);
    expect(has(omegaRuby, "boss-maxie-mt-chimney")).toBe(true);
    expect(has(omegaRuby, "boss-maxie-seafloor-cavern")).toBe(true);
    expect(has(alphaSapphire, "boss-maxie-mt-chimney")).toBe(false);
    expect(has(alphaSapphire, "boss-maxie-seafloor-cavern")).toBe(false);
    expect(has(alphaSapphire, "boss-archie-mt-chimney")).toBe(true);
    expect(has(alphaSapphire, "boss-archie-seafloor-cavern")).toBe(true);
    expect(has(omegaRuby, "boss-archie-mt-chimney")).toBe(false);
  });

  test("exactly 8 fights differ, and the other 19 are the same values", () => {
    const differing = omegaRubyFights.filter((f, i) => f !== alphaSapphireFights[i]);
    expect(differing).toHaveLength(8);
    expect(differing.every((f) => f.kind === "boss")).toBe(true);
    for (const id of omegaRubyFights.filter((f) => f.kind !== "boss").map((f) => f.id)) {
      expect(
        alphaSapphireFights.find((f) => f.id === id),
        id,
      ).toBe(omegaRubyFights.find((f) => f.id === id));
    }
  });

  test("the hideout has one id and a name per version, and no tag", () => {
    expect(hideout(omegaRuby)?.name).toBe("Magma Hideout");
    expect(hideout(alphaSapphire)?.name).toBe("Aqua Hideout");
    expect(hideout(omegaRuby)?.only).toBeUndefined();
    expect(hideout(alphaSapphire)?.only).toBeUndefined();
    expect(omegaRuby.routes.map((r) => r.id)).toEqual(alphaSapphire.routes.map((r) => r.id));
  });

  test("every other route and the level caps are shared", () => {
    const others = (game: GameData): RouteDef[] =>
      game.routes.filter((r) => r.id !== "lilycove-hideout");
    expect(others(alphaSapphire)).toEqual(others(omegaRuby));
    expect(alphaSapphire.levelCaps).toBe(omegaRuby.levelCaps);
  });
});

describe("registration", () => {
  test("both games are game ids and registered", () => {
    expect(GAME_IDS).toContain("omegaruby");
    expect(GAME_IDS).toContain("alphasapphire");
    expect(GAMES.omegaruby).toBe(omegaRuby);
    expect(GAMES.alphasapphire).toBe(alphaSapphire);
    expect([omegaRuby.name, alphaSapphire.name]).toEqual(["Omega Ruby", "Alpha Sapphire"]);
  });
});

describe.each(games)("$id runs", (game) => {
  test("a run seeds its routes and fights", () => {
    const routes = seedRoutes("run-1", game);
    const fights = seedFights("run-1", game);
    expect(routes.map((r) => r.gameRouteId)).toEqual(game.routes.map((r) => r.id));
    expect(fights.map((f) => f.gameFightId)).toEqual(game.fights.map((f) => f.id));
  });

  test("resolve in generation 6, where Clefairy is Fairy", () => {
    const clefairy = toSpecies(pokemonFixtures.clefairy!);
    expect(typesIn(clefairy, game.generation)).toEqual(["fairy"]);
  });
});

describe.each(games)("$id only-routes", (game) => {
  test("the gift and static routes are flagged and nothing else", () => {
    const flagged = Object.fromEntries(
      game.routes.filter((r) => r.only !== undefined).map((r) => [r.id, r.only]),
    );
    expect(flagged).toEqual({
      "rustboro-city": "gift",
      "lavaridge-town": "gift",
      "southern-island": "gift",
      "fortree-city": "gift",
      "trackless-forest": "static",
      "nameless-cavern": "static",
      "pathless-plain": "static",
      "fabled-cave": "static",
      "crescent-isle": "static",
    });
  });

  test("the starter and routes with wild encounters are not flagged", () => {
    for (const id of ["starter", "route-119", "slateport-city", "lilycove-hideout", "soaring"]) {
      expect(game.routes.find((r) => r.id === id)?.only, id).toBeUndefined();
    }
  });
});
