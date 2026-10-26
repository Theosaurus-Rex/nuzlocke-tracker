import { describe, expect, test } from "vitest";

import { firered, leafgreen } from "@/game/data/frlg";
import { toSpecies } from "@/game/pokeapi/map";
import { typesIn } from "@/game/pokeapi/resolve";
import { seedFights, seedRoutes } from "@/game/seed";
import type { FightDef } from "@/game/types";
import { pokemonFixtures } from "@/test/pokeapi-fixtures";

/** Independently sourced ace levels, not derived from our own data. See docs/notes/game-data.md
 * for the sources and why. */
const VERIFIED_ACE_LEVELS: Record<string, number> = {
  "gym-brock": 14,
  "gym-misty": 21,
  "gym-lt-surge": 24,
  "gym-erika": 29,
  "gym-koga": 43,
  "gym-sabrina": 43,
  "gym-blaine": 47,
  "gym-giovanni": 50,
  "elite-four-lorelei": 54,
  "elite-four-bruno": 56,
  "elite-four-agatha": 58,
  "elite-four-lance": 60,
  "champion-blue": 63,
};

const byId = new Map<string, FightDef>(firered.fights.map((f) => [f.id, f]));
const aceOf = (fight: FightDef | undefined): number =>
  Math.max(...(fight?.roster.map((m) => m.level) ?? []));

describe("firered spot-check: independently verified ace levels", () => {
  test.each(Object.entries(VERIFIED_ACE_LEVELS))("%s has ace level %i", (id, expectedAce) => {
    expect(byId.get(id)).toBeDefined();
    expect(aceOf(byId.get(id))).toBe(expectedAce);
  });
});

describe("firered level caps", () => {
  const gymIds = firered.fights.filter((f) => f.grantsBadge).map((f) => f.id);

  test("badge caps are the verified gym aces, lowest first", () => {
    const caps = firered.levelCaps.filter(({ until }) => "badges" in until).map((m) => m.cap);
    const aces = gymIds.map((id) => VERIFIED_ACE_LEVELS[id] ?? 0);
    expect(caps).toEqual(aces.toSorted((a, b) => a - b));
  });

  test.each([
    "elite-four-lorelei",
    "elite-four-bruno",
    "elite-four-agatha",
    "elite-four-lance",
    "champion-blue",
  ])("%s caps at its verified ace", (id) => {
    const milestone = firered.levelCaps.find(({ until }) => "fight" in until && until.fight === id);
    expect(milestone?.cap).toBe(VERIFIED_ACE_LEVELS[id]);
  });

  test("boss fights have no cap", () => {
    for (const fight of firered.fights.filter((f) => f.kind === "boss")) {
      const capped = firered.levelCaps.some(
        ({ until }) => "fight" in until && until.fight === fight.id,
      );
      expect(capped, fight.id).toBe(false);
    }
  });
});

describe("firered shape", () => {
  const count = (pred: (f: FightDef) => boolean): number => firered.fights.filter(pred).length;

  test("has 8 badges, 4 Elite Four members, a Champion, 7 rivals and 2 bosses", () => {
    expect(count((f) => f.grantsBadge)).toBe(8);
    expect(count((f) => f.kind === "elite_four")).toBe(4);
    expect(count((f) => f.kind === "champion")).toBe(1);
    expect(count((f) => f.kind === "rival")).toBe(7);
    expect(count((f) => f.kind === "boss")).toBe(2);
  });

  test("the badge fights use the sprite numbers 1 to 8 once each", () => {
    const numbers = firered.fights
      .filter((f) => f.grantsBadge)
      .map((f) => f.badgeSprite)
      .toSorted((a, b) => (a ?? 0) - (b ?? 0));
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  test("has 72 routes, 46 in Kanto and 26 in the Sevii Islands", () => {
    expect(firered.routes).toHaveLength(72);
    expect(firered.routes.filter((r) => r.region === "kanto")).toHaveLength(46);
    expect(firered.routes.filter((r) => r.region === "sevii")).toHaveLength(26);
  });

  test("the Sevii Islands open after Pokemon Mansion and Cerulean Cave closes the list", () => {
    const ids = firered.routes.map((r) => r.id);
    expect(ids.indexOf("one-island")).toBe(ids.indexOf("pokemon-mansion") + 1);
    expect(ids.at(-1)).toBe("cerulean-cave");
  });

  test("Moltres is on Mt. Ember and Lapras has Silph Co.", () => {
    const ids = firered.routes.map((r) => r.id);
    expect(ids).toContain("mt-ember");
    expect(ids).toContain("silph-co");
    expect(ids).toContain("three-isle-port");
  });

  test("uses the official spellings of Vermilion and Fuchsia", () => {
    const ids = firered.routes.map((r) => r.id);
    expect(ids).toContain("vermilion-city");
    expect(ids).toContain("fuchsia-city");
  });

  test("the Cerulean rival has Abra at 16", () => {
    const abra = byId.get("rival-blue-3")?.roster.find((m) => m.species === "abra");
    expect(abra?.level).toBe(16);
  });

  test("every fight is in Kanto", () => {
    expect(firered.fights.every((f) => f.region === "kanto")).toBe(true);
  });

  test("LeafGreen shares FireRed's data under its own id and name", () => {
    expect(leafgreen).toEqual({ ...firered, id: "leafgreen", name: "LeafGreen" });
  });
});

describe("firered runs", () => {
  test.each([firered, leafgreen])("a $name run seeds its routes and fights", (game) => {
    const routes = seedRoutes("run-1", game);
    const fights = seedFights("run-1", game);
    expect(routes.map((r) => r.gameRouteId)).toEqual(game.routes.map((r) => r.id));
    expect(fights.map((f) => f.gameFightId)).toEqual(game.fights.map((f) => f.id));
    expect(fights.filter((f) => f.kind === "boss")).toHaveLength(2);
  });

  test("resolve in generation 3, where Clefairy is Normal", () => {
    const clefairy = toSpecies(pokemonFixtures.clefairy!);
    expect(typesIn(clefairy, firered.generation)).toEqual(["normal"]);
    expect(typesIn(clefairy, leafgreen.generation)).toEqual(["normal"]);
  });
});

describe("firered only-routes", () => {
  test("exactly these routes are flagged", () => {
    const flagged = Object.fromEntries(
      firered.routes.filter((r) => r.only !== undefined).map((r) => [r.id, r.only]),
    );
    expect(flagged).toEqual({
      "saffron-city": "gift",
      "silph-co": "gift",
    });
  });

  test("a route with wild encounters is not flagged", () => {
    expect(firered.routes.find((r) => r.id === "celadon-city")?.only).toBeUndefined();
  });
});
