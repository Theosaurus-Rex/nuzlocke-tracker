import { describe, expect, test } from "vitest";

import { black, white } from "@/game/data/bw";
import { blackFights, whiteFights } from "@/game/data/bw/fights";
import { toSpecies } from "@/game/pokeapi/map";
import { typesIn } from "@/game/pokeapi/resolve";
import { seedFights, seedRoutes } from "@/game/seed";
import type { FightDef } from "@/game/types";
import { pokemonFixtures } from "@/test/pokeapi-fixtures";

/** Independently sourced ace levels, not derived from our own data. See docs/notes/game-data.md
 * for the sources and why. */
const VERIFIED_ACE_LEVELS: Record<string, number> = {
  "gym-striaton": 14,
  "gym-lenora": 20,
  "gym-burgh": 23,
  "gym-elesa": 27,
  "gym-clay": 31,
  "gym-skyla": 35,
  "gym-brycen": 39,
  "elite-four-shauntal": 50,
  "elite-four-grimsley": 50,
  "elite-four-caitlin": 50,
  "elite-four-marshal": 50,
  "boss-n-castle": 52,
  "boss-ghetsis-n-castle": 54,
};

const OPELUCID_ACE = 43;

const aceOf = (fight: FightDef | undefined): number =>
  Math.max(...(fight?.roster.map((m) => m.level) ?? []));

describe.each([
  [black, "gym-drayden"],
  [white, "gym-iris"],
])("$id spot-check and caps", (game, opelucid) => {
  const byId = new Map<string, FightDef>(game.fights.map((f) => [f.id, f]));
  const aces = { ...VERIFIED_ACE_LEVELS, [opelucid]: OPELUCID_ACE };

  test.each(Object.entries(aces))("%s has ace level %i", (id, expectedAce) => {
    expect(byId.get(id)).toBeDefined();
    expect(aceOf(byId.get(id))).toBe(expectedAce);
  });

  test("badge caps are the verified gym aces, lowest first", () => {
    const gymIds = game.fights.filter((f) => f.grantsBadge).map((f) => f.id);
    const caps = game.levelCaps.filter(({ until }) => "badges" in until).map((m) => m.cap);
    const gymAces = gymIds.map((id) => aces[id] ?? 0);
    expect(caps).toEqual(gymAces.toSorted((a, b) => a - b));
  });

  test.each([
    "elite-four-shauntal",
    "elite-four-grimsley",
    "elite-four-caitlin",
    "elite-four-marshal",
    "boss-n-castle",
    "boss-ghetsis-n-castle",
  ])("%s caps at its verified ace", (id) => {
    const milestone = game.levelCaps.find(({ until }) => "fight" in until && until.fight === id);
    expect(milestone?.cap).toBe(aces[id]);
  });

  test("Ghetsis's cap comes last", () => {
    expect(game.levelCaps.at(-1)?.until).toEqual({ fight: "boss-ghetsis-n-castle" });
  });

  test("only N's Castle and Ghetsis carry a cap among the boss fights", () => {
    const capped = new Set(
      game.levelCaps.flatMap(({ until }) => ("fight" in until ? [until.fight] : [])),
    );
    const cappedBosses = game.fights
      .filter((f) => f.kind === "boss" && capped.has(f.id))
      .map((f) => f.id);
    expect(cappedBosses).toEqual(["boss-n-castle", "boss-ghetsis-n-castle"]);
  });
});

describe.each([black, white])("$id shape", (game) => {
  const count = (pred: (f: FightDef) => boolean): number => game.fights.filter(pred).length;
  const level = (id: string, species: string): number | undefined =>
    game.fights.find((f) => f.id === id)?.roster.find((m) => m.species === species)?.level;

  test("has 30 fights: 8 badges, 4 Elite Four, 12 rival-kind, 6 bosses and no Champion", () => {
    expect(game.fights).toHaveLength(30);
    expect(count((f) => f.grantsBadge)).toBe(8);
    expect(count((f) => f.kind === "elite_four")).toBe(4);
    expect(count((f) => f.kind === "champion")).toBe(0);
    expect(count((f) => f.kind === "rival")).toBe(12);
    expect(count((f) => f.kind === "boss")).toBe(6);
  });

  test("Bianca has 5 fights, Cheren has 7 and every N fight is a boss", () => {
    expect(count((f) => f.id.startsWith("rival-bianca-"))).toBe(5);
    expect(count((f) => f.id.startsWith("rival-cheren-"))).toBe(7);
    const nFights = game.fights.filter((f) => f.id.startsWith("boss-n-"));
    expect(nFights).toHaveLength(5);
    expect(nFights.every((f) => f.kind === "boss")).toBe(true);
  });

  test("fight orders run 1 to 30 in traversal order", () => {
    expect(game.fights.map((f) => f.order)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(game.fights.map((f) => f.id)).toEqual([
      "rival-bianca-1",
      "rival-cheren-1",
      "boss-n-accumula-town",
      "rival-bianca-2",
      "rival-cheren-2",
      "gym-striaton",
      "rival-cheren-3",
      "boss-n-nacrene-city",
      "gym-lenora",
      "gym-burgh",
      "rival-bianca-3",
      "rival-cheren-4",
      "boss-n-nimbasa-city",
      "gym-elesa",
      "rival-cheren-5",
      "gym-clay",
      "rival-bianca-4",
      "boss-n-chargestone-cave",
      "gym-skyla",
      "rival-cheren-6",
      "gym-brycen",
      "rival-bianca-5",
      game.id === "black" ? "gym-drayden" : "gym-iris",
      "rival-cheren-7",
      "elite-four-shauntal",
      "elite-four-grimsley",
      "elite-four-caitlin",
      "elite-four-marshal",
      "boss-n-castle",
      "boss-ghetsis-n-castle",
    ]);
  });

  test("the badge fights use the sprite numbers 33, 34 and 36 to 41, never 35", () => {
    const numbers = game.fights
      .filter((f) => f.grantsBadge)
      .map((f) => f.badgeSprite)
      .toSorted((a, b) => (a ?? 0) - (b ?? 0));
    expect(numbers).toEqual([33, 34, 36, 37, 38, 39, 40, 41]);
    expect(numbers).not.toContain(35);
  });

  test("the badges are named in gym order", () => {
    expect(game.fights.filter((f) => f.grantsBadge).map((f) => f.badge)).toEqual([
      "Trio",
      "Basic",
      "Insect",
      "Bolt",
      "Quake",
      "Jet",
      "Freeze",
      "Legend",
    ]);
  });

  test("has 33 routes and 30 fights, all in Unova", () => {
    expect(game.routes).toHaveLength(33);
    expect(game.routes.every((r) => r.region === "unova")).toBe(true);
    expect(game.fights.every((f) => f.region === "unova")).toBe(true);
    expect(game.generation).toBe(5);
  });

  test("N's Castle is the last route and the post-game places are gone", () => {
    const ids = game.routes.map((r) => r.id);
    expect(ids.at(-1)).toBe("n-castle");
    for (const gone of ["castelia-city", "rumination-field", "route-11", "undella-town"]) {
      expect(ids).not.toContain(gone);
    }
  });

  test("Striaton is one fight holding all three leaders' teams", () => {
    const striaton = game.fights.filter((f) => f.id.includes("striaton"));
    expect(striaton).toHaveLength(1);
    expect(striaton[0]?.name).toBe("Chili / Cress / Cilan");
    const species = striaton[0]?.roster.map((m) => m.species);
    expect(species).toEqual(expect.arrayContaining(["pansear", "panpour", "pansage"]));
  });

  test("the corrected levels and species are used", () => {
    expect(level("rival-bianca-4", "musharna")).toBe(26);
    expect(level("rival-bianca-4", "munna")).toBeUndefined();
    for (const starter of ["tepig", "oshawott", "snivy"]) {
      expect(level("rival-cheren-2", starter)).toBe(8);
    }
    expect(level("elite-four-shauntal", "jellicent-male")).toBe(48);
    expect(level("elite-four-shauntal", "jellicent")).toBeUndefined();
  });

  test("N at Nacrene City is a boss and comes before Lenora", () => {
    const ids = game.fights.map((f) => f.id);
    expect(game.fights.find((f) => f.id === "boss-n-nacrene-city")?.kind).toBe("boss");
    expect(ids.indexOf("boss-n-nacrene-city")).toBeLessThan(ids.indexOf("gym-lenora"));
  });
});

describe("black and white differ in two fights", () => {
  test("exactly 2 fights differ, and the other 28 are the same values", () => {
    const differing = blackFights.filter((f, i) => f !== whiteFights[i]);
    expect(differing.map((f) => f.id)).toEqual(["gym-drayden", "boss-n-castle"]);
    const sharedIds = blackFights.map((f) => f.id).filter((id) => id !== "gym-drayden");
    for (const id of sharedIds.filter((i) => i !== "boss-n-castle")) {
      expect(
        whiteFights.find((f) => f.id === id),
        id,
      ).toBe(blackFights.find((f) => f.id === id));
    }
  });

  test("Black has Drayden and White has Iris, with the same team", () => {
    expect(black.fights.some((f) => f.id === "gym-drayden")).toBe(true);
    expect(black.fights.some((f) => f.id === "gym-iris")).toBe(false);
    expect(white.fights.some((f) => f.id === "gym-iris")).toBe(true);
    expect(white.fights.some((f) => f.id === "gym-drayden")).toBe(false);
    const drayden = black.fights.find((f) => f.id === "gym-drayden");
    const iris = white.fights.find((f) => f.id === "gym-iris");
    expect(iris?.roster).toEqual(drayden?.roster);
    expect(drayden?.name).toBe("Drayden");
    expect(iris?.name).toBe("Iris");
  });

  test("N leads with Zekrom in Black and Reshiram in White", () => {
    const lead = (game: typeof black): string | undefined =>
      game.fights.find((f) => f.id === "boss-n-castle")?.roster[0]?.species;
    expect(lead(black)).toBe("zekrom");
    expect(lead(white)).toBe("reshiram");
  });

  test("the two versions share routes and level caps", () => {
    expect(white.routes).toBe(black.routes);
    expect(white.levelCaps).toBe(black.levelCaps);
  });
});

describe.each([black, white])("$id runs", (game) => {
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

describe("a White run seeds Iris", () => {
  test("Iris, not Drayden", () => {
    const ids = seedFights("run-1", white).map((f) => f.gameFightId);
    expect(ids).toContain("gym-iris");
    expect(ids).not.toContain("gym-drayden");
  });

  test("a Black run seeds Drayden", () => {
    const ids = seedFights("run-1", black).map((f) => f.gameFightId);
    expect(ids).toContain("gym-drayden");
    expect(ids).not.toContain("gym-iris");
  });
});

describe.each([black, white])("$id only-routes", (game) => {
  test("exactly these routes are flagged", () => {
    const flagged = Object.fromEntries(
      game.routes.filter((r) => r.only !== undefined).map((r) => [r.id, r.only]),
    );
    expect(flagged).toEqual({ "nacrene-city": "gift", "n-castle": "static" });
  });

  test("a route with wild encounters is not flagged", () => {
    expect(game.routes.find((r) => r.id === "pinwheel-forest")?.only).toBeUndefined();
  });
});
