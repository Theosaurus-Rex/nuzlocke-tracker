import { describe, expect, test } from "vitest";

import { emerald } from "@/game/data/emerald";
import { toSpecies } from "@/game/pokeapi/map";
import { typesIn } from "@/game/pokeapi/resolve";
import { seedFights, seedRoutes } from "@/game/seed";
import type { FightDef } from "@/game/types";
import { pokemonFixtures } from "@/test/pokeapi-fixtures";

/** Independently sourced ace levels, not derived from our own data. See docs/notes/game-data.md
 * for the sources and why. */
const VERIFIED_ACE_LEVELS: Record<string, number> = {
  "gym-roxanne": 15,
  "gym-brawly": 19,
  "gym-wattson": 24,
  "gym-flannery": 29,
  "gym-norman": 31,
  "gym-winona": 33,
  "gym-tate-and-liza": 42,
  "gym-juan": 46,
  "elite-four-sidney": 49,
  "elite-four-phoebe": 51,
  "elite-four-glacia": 53,
  "elite-four-drake": 55,
  "champion-wallace": 58,
  "boss-steven-meteor-falls": 78,
};

const byId = new Map<string, FightDef>(emerald.fights.map((f) => [f.id, f]));
const aceOf = (fight: FightDef | undefined): number =>
  Math.max(...(fight?.roster.map((m) => m.level) ?? []));

describe("emerald spot-check: independently verified ace levels", () => {
  test.each(Object.entries(VERIFIED_ACE_LEVELS))("%s has ace level %i", (id, expectedAce) => {
    expect(byId.get(id)).toBeDefined();
    expect(aceOf(byId.get(id))).toBe(expectedAce);
  });
});

describe("emerald level caps", () => {
  const gymIds = emerald.fights.filter((f) => f.grantsBadge).map((f) => f.id);

  test("badge caps are the verified gym aces, lowest first", () => {
    const caps = emerald.levelCaps.filter(({ until }) => "badges" in until).map((m) => m.cap);
    const aces = gymIds.map((id) => VERIFIED_ACE_LEVELS[id] ?? 0);
    expect(caps).toEqual(aces.toSorted((a, b) => a - b));
  });

  test.each([
    "elite-four-sidney",
    "elite-four-phoebe",
    "elite-four-glacia",
    "elite-four-drake",
    "champion-wallace",
    "boss-steven-meteor-falls",
  ])("%s caps at its verified ace", (id) => {
    const milestone = emerald.levelCaps.find(({ until }) => "fight" in until && until.fight === id);
    expect(milestone?.cap).toBe(VERIFIED_ACE_LEVELS[id]);
  });

  test("Steven's cap comes last", () => {
    const last = emerald.levelCaps.at(-1);
    expect(last?.until).toEqual({ fight: "boss-steven-meteor-falls" });
  });

  test("the other boss fights have no cap", () => {
    const capped = new Set(
      emerald.levelCaps.flatMap(({ until }) => ("fight" in until ? [until.fight] : [])),
    );
    for (const fight of emerald.fights.filter((f) => f.kind === "boss")) {
      if (fight.id === "boss-steven-meteor-falls") continue;
      expect(capped.has(fight.id), fight.id).toBe(false);
    }
  });
});

describe("emerald shape", () => {
  const count = (pred: (f: FightDef) => boolean): number => emerald.fights.filter(pred).length;

  test("has 8 badges, 4 Elite Four members, a Champion, 5 rival-kind fights and 9 bosses", () => {
    expect(emerald.fights).toHaveLength(27);
    expect(count((f) => f.grantsBadge)).toBe(8);
    expect(count((f) => f.kind === "elite_four")).toBe(4);
    expect(count((f) => f.kind === "champion")).toBe(1);
    expect(count((f) => f.kind === "rival")).toBe(5);
    expect(count((f) => f.kind === "boss")).toBe(9);
  });

  test("the badge fights use the sprite numbers 17 to 24 once each", () => {
    const numbers = emerald.fights
      .filter((f) => f.grantsBadge)
      .map((f) => f.badgeSprite)
      .toSorted((a, b) => (a ?? 0) - (b ?? 0));
    expect(numbers).toEqual([17, 18, 19, 20, 21, 22, 23, 24]);
  });

  test("has 69 routes, all in Hoenn", () => {
    expect(emerald.routes).toHaveLength(69);
    expect(emerald.routes.every((r) => r.region === "hoenn")).toBe(true);
  });

  test("Sky Pillar is a core route and the four post-game routes follow Victory Road", () => {
    const ids = emerald.routes.map((r) => r.id);
    expect(ids.indexOf("sky-pillar")).toBeLessThan(ids.indexOf("victory-road"));
    expect(ids.slice(ids.indexOf("victory-road") + 1)).toEqual([
      "desert-underpass",
      "altering-cave",
      "terra-cave",
      "marine-cave",
    ]);
  });

  test("Aqua Hideout is a route and Littleroot Town is not", () => {
    const ids = emerald.routes.map((r) => r.id);
    expect(ids).toContain("aqua-hideout");
    expect(ids).not.toContain("littleroot-town");
  });

  test("every fight is in Hoenn", () => {
    expect(emerald.fights.every((f) => f.region === "hoenn")).toBe(true);
  });

  test("Matt has no Sharpedo and Archie has Crobat", () => {
    const matt = byId.get("boss-matt-aqua-hideout")?.roster.map((m) => m.species);
    const archie = byId.get("boss-archie-seafloor-cavern")?.roster.map((m) => m.species);
    expect(matt).not.toContain("sharpedo");
    expect(archie).toContain("crobat");
    expect(archie).not.toContain("golbat");
  });

  test("Maxie fights at Mt. Chimney", () => {
    expect(byId.get("boss-maxie-mt-chimney")).toBeDefined();
  });

  test("the optional fights are not listed", () => {
    expect(emerald.fights.map((f) => f.id)).not.toContain("boss-shelly-seafloor-cavern");
    const rivals = emerald.fights.filter((f) => f.id.startsWith("rival-")).map((f) => f.id);
    expect(rivals).toEqual(["rival-1", "rival-2", "rival-3"]);
  });
});

describe("emerald runs", () => {
  test("an Emerald run seeds its routes and fights", () => {
    const routes = seedRoutes("run-1", emerald);
    const fights = seedFights("run-1", emerald);
    expect(routes.map((r) => r.gameRouteId)).toEqual(emerald.routes.map((r) => r.id));
    expect(fights.map((f) => f.gameFightId)).toEqual(emerald.fights.map((f) => f.id));
    expect(fights.filter((f) => f.kind === "boss")).toHaveLength(9);
  });

  test("resolve in generation 3, where Clefairy is Normal", () => {
    const clefairy = toSpecies(pokemonFixtures.clefairy!);
    expect(typesIn(clefairy, emerald.generation)).toEqual(["normal"]);
  });
});
