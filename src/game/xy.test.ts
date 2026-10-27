import { describe, expect, test } from "vitest";

import { GAME_IDS } from "@/domain/types";
import { x, y } from "@/game/data/xy";
import { GAMES } from "@/game/registry";
import { toSpecies } from "@/game/pokeapi/map";
import { typesIn } from "@/game/pokeapi/resolve";
import { seedFights, seedRoutes } from "@/game/seed";
import type { FightDef, GameData } from "@/game/types";
import { pokemonFixtures } from "@/test/pokeapi-fixtures";

/** Independently sourced ace levels, not derived from our own data. See docs/notes/game-data.md
 * for the sources and why. */
const VERIFIED_ACE_LEVELS: Record<string, number> = {
  "gym-viola": 12,
  "gym-grant": 25,
  "gym-korrina": 32,
  "gym-ramos": 34,
  "gym-clemont": 37,
  "gym-valerie": 42,
  "gym-olympia": 48,
  "gym-wulfric": 59,
  "elite-four-malva": 65,
  "elite-four-siebold": 65,
  "elite-four-wikstrom": 65,
  "elite-four-drasna": 65,
  "champion-diantha": 68,
  "boss-aliana-power-plant": 38,
  "boss-celosia-bryony-poke-ball-factory": 41,
  "boss-mable-frost-cavern": 48,
  "boss-lysandre-lysandre-labs": 49,
  "boss-aliana-lysandre-labs": 48,
  "boss-celosia-lysandre-labs": 48,
  "boss-bryony-lysandre-labs": 48,
  "boss-mable-lysandre-labs": 48,
  "boss-xerosic-lysandre-labs": 48,
  "boss-lysandre-team-flare-secret-hq-1": 51,
  "boss-lysandre-team-flare-secret-hq-2": 53,
  "rival-shauna-1": 5,
  "rival-sycamore-1": 10,
  "rival-tierno-1": 12,
  "rival-trevor-tierno": 16,
  "rival-korrina-1": 25,
  "rival-calem-serena-1": 30,
  "rival-korrina-2": 32,
  "rival-calem-serena-2": 33,
  "rival-calem-serena-3": 37,
  "rival-calem-serena-4": 46,
  "rival-sycamore-2": 50,
  "rival-shauna-2": 51,
  "rival-tierno-2": 52,
  "rival-trevor-1": 51,
  "rival-calem-serena-5": 61,
};

const aceOf = (fight: FightDef | undefined): number =>
  Math.max(...(fight?.roster.map((m) => m.level) ?? []));

const E4 = ["elite-four-malva", "elite-four-siebold", "elite-four-wikstrom", "elite-four-drasna"];

const games: GameData[] = [x, y];

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

  test.each([...E4, "champion-diantha"])("%s caps at its verified ace", (id) => {
    const milestone = game.levelCaps.find(({ until }) => "fight" in until && until.fight === id);
    expect(milestone?.cap).toBe(VERIFIED_ACE_LEVELS[id]);
  });

  test("caps never decrease and Diantha's cap comes last", () => {
    const caps = game.levelCaps.map((m) => m.cap);
    expect(caps).toEqual(caps.toSorted((a, b) => a - b));
    expect(game.levelCaps.at(-1)?.until).toEqual({ fight: "champion-diantha" });
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

  test("has 39 fights: 8 badges, 15 rival, 11 boss, 4 Elite Four and 1 Champion", () => {
    expect(game.fights).toHaveLength(39);
    expect(count((f) => f.grantsBadge)).toBe(8);
    expect(count((f) => f.kind === "rival")).toBe(15);
    expect(count((f) => f.kind === "boss")).toBe(11);
    expect(count((f) => f.kind === "elite_four")).toBe(4);
    expect(count((f) => f.kind === "champion")).toBe(1);
  });

  test("fight orders run 1 to 39 in traversal order", () => {
    expect(game.fights.map((f) => f.order)).toEqual(Array.from({ length: 39 }, (_, i) => i + 1));
    expect(game.fights.map((f) => f.id)).toEqual([
      "rival-shauna-1",
      "gym-viola",
      "rival-sycamore-1",
      "rival-tierno-1",
      "rival-trevor-tierno",
      "gym-grant",
      "rival-korrina-1",
      "rival-calem-serena-1",
      "gym-korrina",
      "rival-korrina-2",
      "rival-calem-serena-2",
      "gym-ramos",
      "boss-aliana-power-plant",
      "gym-clemont",
      "rival-calem-serena-3",
      "gym-valerie",
      "boss-celosia-bryony-poke-ball-factory",
      "boss-mable-frost-cavern",
      "rival-calem-serena-4",
      "gym-olympia",
      "boss-lysandre-lysandre-labs",
      "boss-aliana-lysandre-labs",
      "boss-celosia-lysandre-labs",
      "boss-bryony-lysandre-labs",
      "boss-mable-lysandre-labs",
      "boss-xerosic-lysandre-labs",
      "boss-lysandre-team-flare-secret-hq-1",
      "boss-lysandre-team-flare-secret-hq-2",
      "rival-sycamore-2",
      "rival-shauna-2",
      "rival-tierno-2",
      "rival-trevor-1",
      "gym-wulfric",
      "rival-calem-serena-5",
      ...E4,
      "champion-diantha",
    ]);
  });

  test("the badge fights use the sprite numbers 43 to 50 in gym order", () => {
    const badges = game.fights.filter((f) => f.grantsBadge);
    expect(badges.map((f) => f.badgeSprite)).toEqual([43, 44, 45, 46, 47, 48, 49, 50]);
    expect(badges.map((f) => f.badge)).toEqual([
      "Bug",
      "Cliff",
      "Rumble",
      "Plant",
      "Voltage",
      "Fairy",
      "Psychic",
      "Iceberg",
    ]);
  });

  test("has 43 routes and 39 fights, all in Kalos", () => {
    expect(game.routes).toHaveLength(43);
    expect(game.routes.every((r) => r.region === "kalos")).toBe(true);
    expect(game.fights.every((f) => f.region === "kalos")).toBe(true);
    expect(game.generation).toBe(6);
    expect(game.released).toBe("2013-10-12");
  });

  test("Route 22 appears once, Terminus Cave follows Route 18, post-game places are gone", () => {
    const ids = game.routes.map((r) => r.id);
    expect(ids.filter((id) => id === "route-22")).toHaveLength(1);
    expect(ids.indexOf("terminus-cave")).toBe(ids.indexOf("route-18") + 1);
    expect(ids.at(-1)).toBe("victory-road");
    for (const gone of ["friend-safari", "sea-spirits-den", "kiloude-city", "battle-chateau"]) {
      expect(ids).not.toContain(gone);
    }
  });

  test("the corrected values are used", () => {
    expect(level("rival-korrina-2", "lucario")).toBe(32);
    expect(level("rival-calem-serena-5", "greninja")).toBe(61);
    expect(level("rival-calem-serena-5", "chesnaught")).toBe(61);
    expect(level("champion-diantha", "gourgeist-average")).toBe(65);
    expect(level("champion-diantha", "gourgeist-large")).toBeUndefined();
    expect(level("elite-four-malva", "pyroar-male")).toBe(63);
    expect(level("elite-four-malva", "pyroar")).toBeUndefined();
    expect(level("gym-olympia", "meowstic-female")).toBe(48);
    expect(level("rival-calem-serena-1", "meowstic-male")).toBe(28);
    expect(game.fights.some((f) => f.id.includes("az"))).toBe(false);
  });
});

describe("x and y share one dataset", () => {
  test("only the id and name differ", () => {
    expect(y.routes).toBe(x.routes);
    expect(y.fights).toBe(x.fights);
    expect(y.levelCaps).toBe(x.levelCaps);
    expect([x.name, y.name]).toEqual(["X", "Y"]);
  });
});

describe("registration", () => {
  test("x and y are game ids and registered", () => {
    expect(GAME_IDS).toContain("x");
    expect(GAME_IDS).toContain("y");
    expect(GAMES.x).toBe(x);
    expect(GAMES.y).toBe(y);
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
      "santalune-city": "gift",
      "lumiose-city": "gift",
      "tower-of-mastery": "gift",
      "snowbelle-city": "gift",
      "team-flare-secret-hq": "static",
    });
  });

  test("the starter and routes with wild encounters are not flagged", () => {
    for (const id of ["starter", "route-7", "route-12", "ambrette-town", "cyllage-city"]) {
      expect(game.routes.find((r) => r.id === id)?.only, id).toBeUndefined();
    }
  });
});
