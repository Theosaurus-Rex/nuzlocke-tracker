import { describe, expect, test } from "vitest";

import { ruby, sapphire } from "@/game/data/rs";
import { rubyBosses, rubyFights, sapphireBosses, sapphireFights } from "@/game/data/rs/fights";
import { toSpecies } from "@/game/pokeapi/map";
import { typesIn } from "@/game/pokeapi/resolve";
import { seedFights, seedRoutes } from "@/game/seed";
import type { FightDef } from "@/game/types";
import { pokemonFixtures } from "@/test/pokeapi-fixtures";

/** Independently sourced ace levels, not derived from our own data. See docs/notes/game-data.md
 * for the sources and why. */
const VERIFIED_ACE_LEVELS: Record<string, number> = {
  "gym-roxanne": 15,
  "gym-brawly": 18,
  "gym-wattson": 23,
  "gym-flannery": 28,
  "gym-norman": 31,
  "gym-winona": 33,
  "gym-tate-and-liza": 42,
  "gym-wallace": 43,
  "elite-four-sidney": 49,
  "elite-four-phoebe": 51,
  "elite-four-glacia": 53,
  "elite-four-drake": 55,
  "champion-steven": 58,
};

const aceOf = (fight: FightDef | undefined): number =>
  Math.max(...(fight?.roster.map((m) => m.level) ?? []));

describe.each([ruby, sapphire])("$id spot-check and caps", (game) => {
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
    "elite-four-sidney",
    "elite-four-phoebe",
    "elite-four-glacia",
    "elite-four-drake",
    "champion-steven",
  ])("%s caps at its verified ace", (id) => {
    const milestone = game.levelCaps.find(({ until }) => "fight" in until && until.fight === id);
    expect(milestone?.cap).toBe(VERIFIED_ACE_LEVELS[id]);
  });

  test("the Champion's cap comes last", () => {
    expect(game.levelCaps.at(-1)?.until).toEqual({ fight: "champion-steven" });
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

describe.each([ruby, sapphire])("$id shape", (game) => {
  const count = (pred: (f: FightDef) => boolean): number => game.fights.filter(pred).length;

  test("has 24 fights: 8 badges, 4 Elite Four, a Champion, 5 rival-kind and 6 bosses", () => {
    expect(game.fights).toHaveLength(24);
    expect(count((f) => f.grantsBadge)).toBe(8);
    expect(count((f) => f.kind === "elite_four")).toBe(4);
    expect(count((f) => f.kind === "champion")).toBe(1);
    expect(count((f) => f.kind === "rival")).toBe(5);
    expect(count((f) => f.kind === "boss")).toBe(6);
  });

  test("fights are in traversal order, with the bosses between the shared fights", () => {
    expect(game.fights.map((f) => f.order)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
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
    expect(bossSlots).toEqual([7, 8, 12, 14, 16, 17]);
  });

  test("the badge fights use the sprite numbers 17 to 24 once each", () => {
    const numbers = game.fights
      .filter((f) => f.grantsBadge)
      .map((f) => f.badgeSprite)
      .toSorted((a, b) => (a ?? 0) - (b ?? 0));
    expect(numbers).toEqual([17, 18, 19, 20, 21, 22, 23, 24]);
  });

  test("has 62 routes and 24 fights, all in Hoenn", () => {
    expect(game.routes).toHaveLength(62);
    expect(game.routes.every((r) => r.region === "hoenn")).toBe(true);
    expect(game.fights.every((f) => f.region === "hoenn")).toBe(true);
  });

  test("Sky Pillar follows Victory Road and is the last route", () => {
    const ids = game.routes.map((r) => r.id);
    expect(ids.indexOf("sky-pillar")).toBe(ids.indexOf("victory-road") + 1);
    expect(ids.at(-1)).toBe("sky-pillar");
  });

  test("the Lilycove hideout is one route and the Emerald areas are gone", () => {
    const ids = game.routes.map((r) => r.id);
    expect(ids).toContain("lilycove-hideout");
    for (const gone of ["littleroot-town", "altering-cave", "desert-underpass", "mirage-island"]) {
      expect(ids).not.toContain(gone);
    }
  });

  test("the rival's Route 119 fight comes before the Weather Institute", () => {
    const ids = game.fights.map((f) => f.id);
    const institute = ids.findIndex((id) => id.includes("weather-institute"));
    expect(ids.indexOf("rival-3")).toBeLessThan(institute);
  });

  test("the optional Lilycove rival fight is not listed", () => {
    const rivals = game.fights.filter((f) => f.id.startsWith("rival-")).map((f) => f.id);
    expect(rivals).toEqual(["rival-1", "rival-2", "rival-3"]);
  });

  test("Drake's Salamence, Steven's Skarmory and Wally's Ralts use the corrected levels", () => {
    const level = (id: string, species: string): number | undefined =>
      game.fights.find((f) => f.id === id)?.roster.find((m) => m.species === species)?.level;
    expect(level("elite-four-drake", "salamence")).toBe(55);
    expect(level("champion-steven", "skarmory")).toBe(57);
    expect(level("wally-1", "ralts")).toBe(16);
  });
});

describe("ruby and sapphire differ only in the villain fights", () => {
  test("Ruby's bosses are Team Magma, Sapphire's are Team Aqua", () => {
    const leaders = (bosses: FightDef[]): string[] =>
      [...new Set(bosses.map((f) => f.name.split(" (")[0] ?? ""))].toSorted();
    expect(leaders(rubyBosses)).toEqual(["Courtney", "Maxie", "Tabitha"]);
    expect(leaders(sapphireBosses)).toEqual(["Archie", "Matt", "Shelly"]);
  });

  test("exactly 6 fights differ, and the other 18 are the same values", () => {
    const differing = rubyFights.filter((f, i) => f !== sapphireFights[i]);
    expect(differing).toHaveLength(6);
    expect(differing.every((f) => f.kind === "boss")).toBe(true);
    const sharedIds = rubyFights.filter((f) => f.kind !== "boss").map((f) => f.id);
    for (const id of sharedIds) {
      const a = rubyFights.find((f) => f.id === id);
      expect(
        sapphireFights.find((f) => f.id === id),
        id,
      ).toBe(a);
    }
  });

  test("the two versions share routes and level caps", () => {
    expect(sapphire.routes).toBe(ruby.routes);
    expect(sapphire.levelCaps).toBe(ruby.levelCaps);
  });

  test("the Mt. Chimney leader is Maxie in Ruby and Archie in Sapphire", () => {
    expect(ruby.fights.some((f) => f.id === "boss-maxie-mt-chimney")).toBe(true);
    expect(sapphire.fights.some((f) => f.id === "boss-archie-mt-chimney")).toBe(true);
    expect(sapphire.fights.some((f) => f.id === "boss-maxie-mt-chimney")).toBe(false);
  });
});

describe.each([ruby, sapphire])("$id runs", (game) => {
  test("a run seeds its routes and fights", () => {
    const routes = seedRoutes("run-1", game);
    const fights = seedFights("run-1", game);
    expect(routes.map((r) => r.gameRouteId)).toEqual(game.routes.map((r) => r.id));
    expect(fights.map((f) => f.gameFightId)).toEqual(game.fights.map((f) => f.id));
  });

  test("resolve in generation 3, where Clefairy is Normal", () => {
    const clefairy = toSpecies(pokemonFixtures.clefairy!);
    expect(typesIn(clefairy, game.generation)).toEqual(["normal"]);
  });
});

describe("a Sapphire run seeds Sapphire's bosses", () => {
  test("Team Aqua, not Team Magma", () => {
    const ids = seedFights("run-1", sapphire)
      .filter((f) => f.kind === "boss")
      .map((f) => f.gameFightId);
    expect(ids).toEqual(sapphireBosses.map((f) => f.id));
    expect(ids).not.toContain("boss-tabitha-mt-chimney");
  });

  test("a Ruby run seeds Team Magma", () => {
    const ids = seedFights("run-1", ruby)
      .filter((f) => f.kind === "boss")
      .map((f) => f.gameFightId);
    expect(ids).toEqual(rubyBosses.map((f) => f.id));
  });
});

describe.each([ruby, sapphire])("$id only-routes", (game) => {
  test("exactly these routes are flagged", () => {
    const flagged = Object.fromEntries(
      game.routes.filter((r) => r.only !== undefined).map((r) => [r.id, r.only]),
    );
    expect(flagged).toEqual({
      "rustboro-city": "gift",
      "lavaridge-town": "gift",
      "fortree-city": "gift",
      "lilycove-hideout": "static",
    });
  });

  test("a route with wild encounters is not flagged", () => {
    expect(game.routes.find((r) => r.id === "route-119")?.only).toBeUndefined();
  });
});
