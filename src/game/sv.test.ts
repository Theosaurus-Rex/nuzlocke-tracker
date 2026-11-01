import { describe, expect, test } from "vitest";

import { currentLevelCaps } from "@/domain/rules-summary";
import { GAME_IDS } from "@/domain/types";
import type { Fight } from "@/domain/types";
import { scarlet, violet } from "@/game/data/sv";
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
  "rival-nemona-1": 5,
  "rival-arven-1": 5,
  "rival-nemona-2": 9,
  "gym-katy": 15,
  "boss-klawf": 16,
  "gym-brassius": 17,
  "boss-bombirdier": 20,
  "boss-giacomo": 21,
  "rival-nemona-3": 22,
  "gym-iono": 24,
  "boss-mela": 27,
  "boss-orthworm": 29,
  "gym-kofu": 30,
  "boss-atticus": 33,
  "gym-larry": 36,
  "rival-nemona-4": 37,
  "gym-ryme": 42,
  "boss-great-tusk-iron-treads": 45,
  "gym-tulip": 45,
  "rival-nemona-5": 43,
  "gym-grusha": 48,
  "boss-ortega": 51,
  "boss-dondozo-tatsugiri": 57,
  "boss-eri": 56,
  "elite-four-rika": 58,
  "elite-four-poppy": 59,
  "elite-four-larry": 60,
  "elite-four-hassel": 61,
  "champion-geeta": 62,
  "rival-nemona-6": 66,
  "rival-arven-2": 63,
  "boss-clavell": 61,
  "boss-penny": 63,
  "boss-ai-sada-turo": 67,
};

const aceOf = (fight: FightDef | undefined): number =>
  Math.max(...(fight?.roster.map((m) => m.level) ?? []));

const games = [scarlet, violet];
const GYMS = [
  "gym-katy",
  "gym-brassius",
  "gym-iono",
  "gym-kofu",
  "gym-larry",
  "gym-ryme",
  "gym-tulip",
  "gym-grusha",
];
const FLAGGED = {
  cortondo: "gift",
  levincia: "gift",
  cascarrafa: "gift",
  "naranja-uva-academy": "gift",
};

const idMap = (game: typeof scarlet): Map<string, FightDef> =>
  new Map(game.fights.map((f) => [f.id, f]));
const level = (id: string, species: string): number | undefined =>
  idMap(scarlet)
    .get(id)
    ?.roster.find((m) => m.species === species)?.level;

describe.each(games)("$id spot-check and caps", (game) => {
  const byId = idMap(game);

  test.each(Object.entries(VERIFIED_ACE_LEVELS))("%s has ace level %i", (id, expectedAce) => {
    expect(byId.get(id)).toBeDefined();
    expect(aceOf(byId.get(id))).toBe(expectedAce);
  });

  test("every fight has a verified ace", () => {
    expect(Object.keys(VERIFIED_ACE_LEVELS).toSorted()).toEqual(
      game.fights.map((f) => f.id).toSorted(),
    );
  });

  test("the cap table has three paths and then the final fight", () => {
    expect(game.levelCaps).toEqual([
      { cap: 15, until: { badges: 1 }, path: "Gyms" },
      { cap: 17, until: { badges: 2 }, path: "Gyms" },
      { cap: 24, until: { badges: 3 }, path: "Gyms" },
      { cap: 30, until: { badges: 4 }, path: "Gyms" },
      { cap: 36, until: { badges: 5 }, path: "Gyms" },
      { cap: 42, until: { badges: 6 }, path: "Gyms" },
      { cap: 45, until: { badges: 7 }, path: "Gyms" },
      { cap: 48, until: { badges: 8 }, path: "Gyms" },
      { cap: 58, until: { fight: "elite-four-rika" }, path: "Gyms" },
      { cap: 59, until: { fight: "elite-four-poppy" }, path: "Gyms" },
      { cap: 60, until: { fight: "elite-four-larry" }, path: "Gyms" },
      { cap: 61, until: { fight: "elite-four-hassel" }, path: "Gyms" },
      { cap: 62, until: { fight: "champion-geeta" }, path: "Gyms" },
      { cap: 66, until: { fight: "rival-nemona-6" }, path: "Gyms" },
      { cap: 16, until: { fight: "boss-klawf" }, path: "Titans" },
      { cap: 20, until: { fight: "boss-bombirdier" }, path: "Titans" },
      { cap: 29, until: { fight: "boss-orthworm" }, path: "Titans" },
      { cap: 45, until: { fight: "boss-great-tusk-iron-treads" }, path: "Titans" },
      { cap: 57, until: { fight: "boss-dondozo-tatsugiri" }, path: "Titans" },
      { cap: 63, until: { fight: "rival-arven-2" }, path: "Titans" },
      { cap: 21, until: { fight: "boss-giacomo" }, path: "Team Star" },
      { cap: 27, until: { fight: "boss-mela" }, path: "Team Star" },
      { cap: 33, until: { fight: "boss-atticus" }, path: "Team Star" },
      { cap: 51, until: { fight: "boss-ortega" }, path: "Team Star" },
      { cap: 56, until: { fight: "boss-eri" }, path: "Team Star" },
      { cap: 61, until: { fight: "boss-clavell" }, path: "Team Star" },
      { cap: 63, until: { fight: "boss-penny" }, path: "Team Star" },
      { cap: 67, until: { fight: "boss-ai-sada-turo" } },
    ]);
  });

  test("each fight cap is at least the ace of the fight it waits on", () => {
    for (const { cap, until } of game.levelCaps) {
      if ("fight" in until)
        expect(cap, until.fight).toBeGreaterThanOrEqual(aceOf(byId.get(until.fight)));
    }
  });

  test("each path lists the paths in order and the final fight has none", () => {
    const names = [...new Set(game.levelCaps.map((m) => m.path))];
    expect(names).toEqual(["Gyms", "Titans", "Team Star", undefined]);
  });

  test("in the listed order no fight's ace is above the highest path cap", () => {
    const badgeIds = new Set(game.fights.filter((f) => f.grantsBadge).map((f) => f.id));
    const rows: Fight[] = game.fights.map((f) => ({
      id: f.id,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      runId: "r",
      gameFightId: f.id,
      name: f.name,
      kind: f.kind,
      order: f.order,
      grantsBadge: f.grantsBadge,
      levelCap: null,
      status: "pending",
      clearedAt: null,
    }));
    for (const row of rows) {
      const caps = currentLevelCaps(rows, game.levelCaps, badgeIds).map(({ cap }) => cap);
      expect(caps.length, row.id).toBeGreaterThan(0);
      expect(aceOf(byId.get(row.id)), row.id).toBeLessThanOrEqual(Math.max(...caps));
      row.status = "cleared";
    }
    expect(currentLevelCaps(rows, game.levelCaps, badgeIds)).toEqual([]);
  });
});

describe.each(games)("$id shape", (game) => {
  const byId = idMap(game);
  const count = (pred: (f: FightDef) => boolean): number => game.fights.filter(pred).length;

  test("has 34 fights: 8 gym, 13 boss, 4 Elite Four, 1 champion and 8 rival", () => {
    expect(game.fights).toHaveLength(34);
    expect(count((f) => f.kind === "gym")).toBe(8);
    expect(count((f) => f.kind === "boss")).toBe(13);
    expect(count((f) => f.kind === "elite_four")).toBe(4);
    expect(count((f) => f.kind === "champion")).toBe(1);
    expect(count((f) => f.kind === "rival")).toBe(8);
  });

  test("fight orders run 1 to 34 in the walkthrough order", () => {
    expect(game.fights.map((f) => f.order)).toEqual(Array.from({ length: 34 }, (_, i) => i + 1));
    expect(game.fights.map((f) => f.id)).toEqual([
      "rival-nemona-1",
      "rival-arven-1",
      "rival-nemona-2",
      "gym-katy",
      "boss-klawf",
      "gym-brassius",
      "boss-bombirdier",
      "boss-giacomo",
      "rival-nemona-3",
      "gym-iono",
      "boss-mela",
      "boss-orthworm",
      "gym-kofu",
      "boss-atticus",
      "gym-larry",
      "rival-nemona-4",
      "gym-ryme",
      "boss-great-tusk-iron-treads",
      "gym-tulip",
      "rival-nemona-5",
      "gym-grusha",
      "boss-ortega",
      "boss-dondozo-tatsugiri",
      "boss-eri",
      "elite-four-rika",
      "elite-four-poppy",
      "elite-four-larry",
      "elite-four-hassel",
      "champion-geeta",
      "rival-nemona-6",
      "rival-arven-2",
      "boss-clavell",
      "boss-penny",
      "boss-ai-sada-turo",
    ]);
  });

  test("kinds follow the model", () => {
    for (const id of GYMS) expect(byId.get(id)?.kind, id).toBe("gym");
    for (const f of game.fights.filter((f) => f.id.startsWith("boss-")))
      expect(f.kind, f.id).toBe("boss");
    for (const f of game.fights.filter((f) => f.id.startsWith("rival-")))
      expect(f.kind, f.id).toBe("rival");
    for (const f of game.fights.filter((f) => f.id.startsWith("elite-four-")))
      expect(f.kind, f.id).toBe("elite_four");
    expect(byId.get("champion-geeta")?.kind).toBe("champion");
  });

  test("only the eight gyms grant a badge, with sprites 70 to 77 in gym order", () => {
    for (const f of game.fights) {
      expect(f.grantsBadge, f.id).toBe(f.kind === "gym");
      expect(f.badge === null, f.id).toBe(f.kind !== "gym");
      expect(f.badgeSprite === null, f.id).toBe(f.kind !== "gym");
    }
    const gyms = game.fights.filter((f) => f.grantsBadge);
    expect(gyms.map((f) => f.id)).toEqual(GYMS);
    expect(gyms.map((f) => f.badgeSprite)).toEqual([70, 71, 72, 73, 74, 75, 76, 77]);
    expect(gyms.map((f) => f.badge)).toEqual([
      "Bug",
      "Grass",
      "Electric",
      "Water",
      "Normal",
      "Ghost",
      "Psychic",
      "Ice",
    ]);
  });

  test("every fight and route is in Paldea", () => {
    expect(game.fights.every((f) => f.region === "paldea")).toBe(true);
    expect(game.routes.every((r) => r.region === "paldea")).toBe(true);
  });

  test("the version fights are one shared fight listing both teams", () => {
    expect(byId.get("boss-great-tusk-iron-treads")?.name).toContain("Great Tusk / Iron Treads");
    expect(level("boss-great-tusk-iron-treads", "great-tusk")).toBe(45);
    expect(level("boss-great-tusk-iron-treads", "iron-treads")).toBe(45);
    expect(byId.get("boss-ai-sada-turo")?.name).toContain("AI Sada / AI Turo");
    expect(level("boss-ai-sada-turo", "roaring-moon")).toBe(67);
    expect(level("boss-ai-sada-turo", "iron-valiant")).toBe(67);
  });

  test("PokeAPI form names are used", () => {
    expect(level("gym-larry", "dudunsparce-two-segment")).toBe(35);
    expect(level("boss-dondozo-tatsugiri", "tatsugiri-curly")).toBe(57);
    expect(level("gym-ryme", "mimikyu-disguised")).toBe(41);
    expect(level("gym-ryme", "toxtricity-low-key")).toBe(42);
    expect(level("elite-four-larry", "oricorio-pom-pom")).toBe(59);
  });

  test("Poppy's Tinkaton is 59 and the post-credits fights are left out", () => {
    expect(level("elite-four-poppy", "tinkaton")).toBe(59);
    expect(game.fights.some((f) => aceOf(f) > 67)).toBe(false);
    const names = game.fights.map((f) => f.name).join("|");
    for (const gone of ["Harrison", "Salvatore", "Kieran", "Carmine"]) {
      expect(names).not.toContain(gone);
    }
  });
});

describe("routes", () => {
  test("both versions have 37 routes in unique increasing order, starter and Area Zero at the ends", () => {
    for (const game of games) {
      expect(game.routes).toHaveLength(37);
      expect(game.routes.map((r) => r.order)).toEqual(Array.from({ length: 37 }, (_, i) => i + 1));
      expect(game.routes[0]?.id).toBe("starter");
      expect(game.routes[0]?.only).toBeUndefined();
      expect(game.routes.at(-1)?.id).toBe("area-zero");
      expect(new Set(game.routes.map((r) => r.id)).size).toBe(37);
    }
  });

  test("the two versions share one routes list, fights list and cap table", () => {
    expect(violet.routes).toBe(scarlet.routes);
    expect(violet.fights).toBe(scarlet.fights);
    expect(violet.levelCaps).toBe(scarlet.levelCaps);
  });

  test("only the four gift places are flagged", () => {
    for (const game of games) {
      expect(
        Object.fromEntries(
          game.routes.filter((r) => r.only !== undefined).map((r) => [r.id, r.only]),
        ),
      ).toEqual(FLAGGED);
    }
  });

  test("the starter and places with wild encounters are not flagged", () => {
    for (const id of ["starter", "cabo-poco", "pokemon-league", "area-zero", "socarrat-trail"]) {
      expect(scarlet.routes.find((r) => r.id === id)?.only, id).toBeUndefined();
    }
  });

  test("Cabo Poco is a route and Koraidon and Miraidon are not", () => {
    const ids = scarlet.routes.map((r) => r.id);
    expect(ids).toContain("cabo-poco");
    for (const id of ["koraidon", "miraidon", "zero-lab", "academy-ace-tournament"]) {
      expect(ids, id).not.toContain(id);
    }
  });

  test("the academy gift has a name that fits both versions", () => {
    expect(scarlet.routes.find((r) => r.id === "naranja-uva-academy")?.name).toBe(
      "Naranja / Uva Academy",
    );
  });
});

describe("registration", () => {
  test("scarlet and violet are game ids and registered", () => {
    for (const [id, game, name] of [
      ["scarlet", scarlet, "Scarlet"],
      ["violet", violet, "Violet"],
    ] as const) {
      expect(GAME_IDS).toContain(id);
      expect(GAMES[id]).toBe(game);
      expect(game.name).toBe(name);
      expect(game.id).toBe(id);
    }
  });

  test("they are generation 9, released on the worldwide date", () => {
    for (const game of games) {
      expect(game.generation).toBe(9);
      expect(game.released).toBe("2022-11-18");
    }
  });

  test("the league is headed Paldea League", () => {
    expect(scarlet.league).toBe("Paldea League");
    expect(violet.league).toBe("Paldea League");
  });
});

describe("scarlet and violet runs", () => {
  test("a Violet run seeds its routes and fights", () => {
    const routes = seedRoutes("run-1", violet);
    const fights = seedFights("run-1", violet);
    expect(routes.map((r) => r.gameRouteId)).toEqual(violet.routes.map((r) => r.id));
    expect(fights.map((f) => f.gameFightId)).toEqual(violet.fights.map((f) => f.id));
  });

  test("resolve in generation 9, where Clefairy is Fairy", () => {
    const clefairy = toSpecies(pokemonFixtures.clefairy!);
    expect(typesIn(clefairy, scarlet.generation)).toEqual(["fairy"]);
  });

  test("show nature, ability, held item, gender and shiny", () => {
    expect(monFields(scarlet)).toEqual({
      nature: true,
      ability: true,
      heldItem: true,
      gender: true,
      shiny: true,
    });
  });
});
