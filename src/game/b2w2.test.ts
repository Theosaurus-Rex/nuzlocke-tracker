import { describe, expect, test } from "vitest";

import { black2, white2 } from "@/game/data/b2w2";
import { black2Fights, white2Fights } from "@/game/data/b2w2/fights";
import { toSpecies } from "@/game/pokeapi/map";
import { typesIn } from "@/game/pokeapi/resolve";
import { seedFights, seedRoutes } from "@/game/seed";
import type { FightDef, GameData } from "@/game/types";
import { pokemonFixtures } from "@/test/pokeapi-fixtures";

/** Independently sourced ace levels, not derived from our own data. See docs/notes/game-data.md
 * for the sources and why. */
const VERIFIED_ACE_LEVELS: Record<string, number> = {
  "gym-cheren": 13,
  "gym-roxie": 18,
  "gym-burgh": 24,
  "gym-elesa": 30,
  "gym-clay": 33,
  "gym-skyla": 39,
  "gym-drayden": 48,
  "gym-marlon": 51,
  "elite-four-shauntal": 58,
  "elite-four-grimsley": 58,
  "elite-four-caitlin": 58,
  "elite-four-marshal": 58,
  "champion-iris": 59,
};

const aceOf = (fight: FightDef | undefined): number =>
  Math.max(...(fight?.roster.map((m) => m.level) ?? []));

const games: GameData[] = [black2, white2];

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

  test.each([
    "elite-four-shauntal",
    "elite-four-grimsley",
    "elite-four-caitlin",
    "elite-four-marshal",
    "champion-iris",
  ])("%s caps at its verified ace", (id) => {
    const milestone = game.levelCaps.find(({ until }) => "fight" in until && until.fight === id);
    expect(milestone?.cap).toBe(VERIFIED_ACE_LEVELS[id]);
  });

  test("caps never decrease and Iris's cap comes last", () => {
    const caps = game.levelCaps.map((m) => m.cap);
    expect(caps).toEqual(caps.toSorted((a, b) => a - b));
    expect(game.levelCaps.at(-1)?.until).toEqual({ fight: "champion-iris" });
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

  test("has 29 fights: 8 badges, 4 Hugh, 12 bosses, 4 Elite Four and 1 Champion", () => {
    expect(game.fights).toHaveLength(29);
    expect(count((f) => f.grantsBadge)).toBe(8);
    expect(count((f) => f.kind === "rival")).toBe(4);
    expect(count((f) => f.kind === "boss")).toBe(12);
    expect(count((f) => f.kind === "elite_four")).toBe(4);
    expect(count((f) => f.kind === "champion")).toBe(1);
  });

  test("Hugh has exactly 4 fights", () => {
    expect(game.fights.filter((f) => f.name.startsWith("Hugh")).map((f) => f.id)).toEqual([
      "rival-hugh-1",
      "rival-hugh-2",
      "rival-hugh-3",
      "rival-hugh-4",
    ]);
  });

  test("fight orders run 1 to 29 in traversal order", () => {
    expect(game.fights.map((f) => f.order)).toEqual(Array.from({ length: 29 }, (_, i) => i + 1));
    expect(game.fights.map((f) => f.id)).toEqual([
      "rival-hugh-1",
      "rival-hugh-2",
      "gym-cheren",
      "gym-roxie",
      "gym-burgh",
      "boss-colress-route-4",
      "gym-elesa",
      "gym-clay",
      "gym-skyla",
      "rival-hugh-3",
      "boss-zinzolin-lacunosa-town",
      "gym-drayden",
      "boss-zinzolin-opelucid-city",
      "boss-shadow-triad-opelucid-city",
      "gym-marlon",
      "boss-zinzolin-plasma-frigate-1",
      "boss-zinzolin-plasma-frigate-2",
      "boss-colress-plasma-frigate",
      "boss-shadow-triad-plasma-frigate-1",
      "boss-shadow-triad-plasma-frigate-2",
      "boss-shadow-triad-plasma-frigate-3",
      "boss-kyurem-giant-chasm",
      "boss-ghetsis-giant-chasm",
      "rival-hugh-4",
      "elite-four-shauntal",
      "elite-four-grimsley",
      "elite-four-caitlin",
      "elite-four-marshal",
      "champion-iris",
    ]);
  });

  test("the three Plasma Frigate Shadow Triad fights are separate", () => {
    const frigate = game.fights.filter((f) => f.id.startsWith("boss-shadow-triad-plasma-frigate"));
    expect(frigate.map((f) => f.roster.at(-1)?.species)).toEqual(["absol", "banette", "accelgor"]);
  });

  test("the badge fights use the sprite numbers 34 to 39, 41 and 42, never 33 or 40", () => {
    const numbers = game.fights
      .filter((f) => f.grantsBadge)
      .map((f) => f.badgeSprite)
      .toSorted((a, b) => (a ?? 0) - (b ?? 0));
    expect(numbers).toEqual([34, 35, 36, 37, 38, 39, 41, 42]);
    expect(numbers).not.toContain(33);
    expect(numbers).not.toContain(40);
  });

  test("the badges are named in gym order", () => {
    expect(game.fights.filter((f) => f.grantsBadge).map((f) => f.badge)).toEqual([
      "Basic",
      "Toxic",
      "Insect",
      "Bolt",
      "Quake",
      "Jet",
      "Legend",
      "Wave",
    ]);
  });

  test("has 39 routes and 29 fights, all in Unova", () => {
    expect(game.routes).toHaveLength(39);
    expect(game.routes.every((r) => r.region === "unova")).toBe(true);
    expect(game.fights.every((f) => f.region === "unova")).toBe(true);
    expect(game.generation).toBe(5);
  });

  test("Victory Road is the last route and the post-game places are gone", () => {
    const ids = game.routes.map((r) => r.id);
    expect(ids.at(-1)).toBe("victory-road");
    for (const gone of ["floccesy-town", "black-tower", "white-treehollow", "route-14"]) {
      expect(ids).not.toContain(gone);
    }
    expect(ids.indexOf("relic-passage")).toBe(ids.indexOf("driftveil-city") + 1);
  });

  test("the corrected values are used", () => {
    expect(level("gym-marlon", "jellicent-male")).toBe(51);
    expect(level("gym-marlon", "jellicent")).toBeUndefined();
    expect(game.fights.find((f) => f.id === "champion-iris")?.kind).toBe("champion");
    expect(game.fights.find((f) => f.id === "boss-zinzolin-lacunosa-town")?.roster).toEqual([
      { species: "cryogonal", level: 42 },
      { species: "sneasel", level: 44 },
    ]);
    expect(game.fights.find((f) => f.id === "boss-zinzolin-plasma-frigate-1")?.roster).toHaveLength(
      3,
    );
    expect(game.fights.some((f) => f.id.includes("tournament"))).toBe(false);
    expect(game.fights.some((f) => f.id.includes("ingo"))).toBe(false);
  });
});

describe("black 2 and white 2 differ in one fight", () => {
  test("exactly 1 fight differs, and the other 28 are the same values", () => {
    const differing = black2Fights.filter((f, i) => f !== white2Fights[i]);
    expect(differing.map((f) => f.id)).toEqual(["boss-kyurem-giant-chasm"]);
  });

  test("Black 2 has Black Kyurem and White 2 has White Kyurem, both at 55", () => {
    const roster = (game: GameData): FightDef["roster"] | undefined =>
      game.fights.find((f) => f.id === "boss-kyurem-giant-chasm")?.roster;
    expect(roster(black2)).toEqual([{ species: "kyurem-black", level: 55 }]);
    expect(roster(white2)).toEqual([{ species: "kyurem-white", level: 55 }]);
  });

  test("the two versions share routes and level caps", () => {
    expect(white2.routes).toBe(black2.routes);
    expect(white2.levelCaps).toBe(black2.levelCaps);
  });
});

describe.each(games)("$id runs", (game) => {
  test("a run seeds its routes and fights", () => {
    const routes = seedRoutes("run-1", game);
    const fights = seedFights("run-1", game);
    expect(routes.map((r) => r.gameRouteId)).toEqual(game.routes.map((r) => r.id));
    expect(fights.map((f) => f.gameFightId)).toEqual(game.fights.map((f) => f.id));
  });

  test("resolve in generation 5, where Clefairy is Normal", () => {
    const clefairy = toSpecies(pokemonFixtures.clefairy!);
    expect(typesIn(clefairy, game.generation)).toEqual(["normal"]);
  });
});

describe("a White 2 run seeds White Kyurem", () => {
  const kyuremOf = (game: GameData): string | undefined =>
    game.fights.find((f) => f.id === "boss-kyurem-giant-chasm")?.roster[0]?.species;

  test("White 2 seeds the fight with White Kyurem", () => {
    const ids = seedFights("run-1", white2).map((f) => f.gameFightId);
    expect(ids).toContain("boss-kyurem-giant-chasm");
    expect(kyuremOf(white2)).toBe("kyurem-white");
  });

  test("a Black 2 run seeds the same fight with Black Kyurem", () => {
    const ids = seedFights("run-1", black2).map((f) => f.gameFightId);
    expect(ids).toContain("boss-kyurem-giant-chasm");
    expect(kyuremOf(black2)).toBe("kyurem-black");
  });
});

describe.each(games)("$id only-routes", (game) => {
  test("exactly one route is flagged", () => {
    const flagged = Object.fromEntries(
      game.routes.filter((r) => r.only !== undefined).map((r) => [r.id, r.only]),
    );
    expect(flagged).toEqual({ "driftveil-city": "gift" });
  });

  test("the starter and routes with wild encounters are not flagged", () => {
    for (const id of ["starter", "route-4", "castelia-city", "aspertia-city"]) {
      expect(game.routes.find((r) => r.id === id)?.only, id).toBeUndefined();
    }
  });
});
