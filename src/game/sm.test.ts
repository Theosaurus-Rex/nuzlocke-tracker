import { describe, expect, test } from "vitest";

import { GAME_IDS } from "@/domain/types";
import { moon, sun } from "@/game/data/sm";
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
  "rival-hau-1": 5,
  "rival-hau-2": 7,
  "rival-ilima": 10,
  "gym-ilima": 12,
  "rival-hau-3": 14,
  "gym-hala": 15,
  "rival-dexio-sina": 16,
  "rival-hau-4": 17,
  "rival-gladion-1": 18,
  "gym-lana": 20,
  "gym-kiawe": 22,
  "gym-mallow": 24,
  "boss-plumeria-1": 26,
  "gym-olivia": 27,
  "rival-hau-5": 29,
  "rival-molayne": 30,
  "gym-sophocles": 29,
  "boss-guzma-1": 31,
  "gym-acerola": 33,
  "boss-plumeria-2": 35,
  "boss-guzma-2": 37,
  "rival-gladion-2": 38,
  "gym-nanu": 39,
  "boss-faba-1": 39,
  "boss-faba-2": 40,
  "boss-guzma-3": 41,
  "boss-lusamine-1": 41,
  "gym-hapu": 48,
  "gym-kommo-o": 45,
  "boss-lusamine-2": 50,
  "rival-gladion-3": 53,
  "rival-hau-6": 54,
  "elite-four-hala": 55,
  "elite-four-olivia": 55,
  "elite-four-acerola": 55,
  "elite-four-kahili": 55,
  "champion-kukui": 58,
};

const aceOf = (fight: FightDef | undefined): number =>
  Math.max(...(fight?.roster.map((m) => m.level) ?? []));

const E4 = ["elite-four-hala", "elite-four-olivia", "elite-four-acerola", "elite-four-kahili"];
const TRIALS = [
  ["gym-ilima", "Normalium Z"],
  ["gym-hala", "Fightinium Z"],
  ["gym-lana", "Waterium Z"],
  ["gym-kiawe", "Firium Z"],
  ["gym-mallow", "Grassium Z"],
  ["gym-olivia", "Rockium Z"],
  ["gym-sophocles", "Electrium Z"],
  ["gym-acerola", "Ghostium Z"],
  ["gym-nanu", "Darkinium Z"],
  ["gym-hapu", "Groundium Z"],
  ["gym-kommo-o", "Dragonium Z"],
] as const;
const BOSSES = [
  "boss-plumeria-1",
  "boss-plumeria-2",
  "boss-guzma-1",
  "boss-guzma-2",
  "boss-guzma-3",
  "boss-faba-1",
  "boss-faba-2",
  "boss-lusamine-1",
  "boss-lusamine-2",
];
const RIVALS = [
  "rival-hau-1",
  "rival-hau-2",
  "rival-hau-3",
  "rival-hau-4",
  "rival-hau-5",
  "rival-hau-6",
  "rival-ilima",
  "rival-dexio-sina",
  "rival-molayne",
  "rival-gladion-1",
  "rival-gladion-2",
  "rival-gladion-3",
];

const byId = new Map<string, FightDef>(sun.fights.map((f) => [f.id, f]));
const count = (pred: (f: FightDef) => boolean): number => sun.fights.filter(pred).length;
const level = (id: string, species: string): number | undefined =>
  byId.get(id)?.roster.find((m) => m.species === species)?.level;
const flagged = (game: typeof sun): Record<string, string | undefined> =>
  Object.fromEntries(game.routes.filter((r) => r.only !== undefined).map((r) => [r.id, r.only]));

describe("sun spot-check and caps", () => {
  test.each(Object.entries(VERIFIED_ACE_LEVELS))("%s has ace level %i", (id, expectedAce) => {
    expect(byId.get(id)).toBeDefined();
    expect(aceOf(byId.get(id))).toBe(expectedAce);
  });

  test("the cap table is derived from the aces, with two holds", () => {
    expect(sun.levelCaps).toEqual([
      { cap: 12, until: { fight: "gym-ilima" } },
      { cap: 15, until: { fight: "gym-hala" } },
      { cap: 20, until: { fight: "gym-lana" } },
      { cap: 22, until: { fight: "gym-kiawe" } },
      { cap: 24, until: { fight: "gym-mallow" } },
      { cap: 27, until: { fight: "gym-olivia" } },
      { cap: 30, until: { fight: "gym-sophocles" } },
      { cap: 33, until: { fight: "gym-acerola" } },
      { cap: 39, until: { fight: "gym-nanu" } },
      { cap: 41, until: { fight: "boss-lusamine-1" } },
      { cap: 48, until: { fight: "gym-hapu" } },
      { cap: 48, until: { fight: "gym-kommo-o" } },
      { cap: 50, until: { fight: "boss-lusamine-2" } },
      { cap: 54, until: { fight: "rival-hau-6" } },
      { cap: 55, until: { fight: "elite-four-hala" } },
      { cap: 55, until: { fight: "elite-four-olivia" } },
      { cap: 55, until: { fight: "elite-four-acerola" } },
      { cap: 55, until: { fight: "elite-four-kahili" } },
      { cap: 58, until: { fight: "champion-kukui" } },
    ]);
  });

  test("caps never decrease and every milestone waits on a real fight", () => {
    const caps = sun.levelCaps.map((m) => m.cap);
    expect(caps).toEqual(caps.toSorted((a, b) => a - b));
    for (const { until } of sun.levelCaps) {
      expect("fight" in until && byId.has(until.fight)).toBe(true);
    }
  });

  test("each cap is at least the ace of the fight it waits on", () => {
    for (const { cap, until } of sun.levelCaps) {
      if ("fight" in until)
        expect(cap, until.fight).toBeGreaterThanOrEqual(aceOf(byId.get(until.fight)));
    }
  });
});

describe("sun shape", () => {
  test("has 37 fights: 11 trial, 12 rival, 9 boss, 4 Elite Four and 1 champion", () => {
    expect(sun.fights).toHaveLength(37);
    expect(count((f) => f.kind === "gym")).toBe(11);
    expect(count((f) => f.kind === "rival")).toBe(12);
    expect(count((f) => f.kind === "boss")).toBe(9);
    expect(count((f) => f.kind === "elite_four")).toBe(4);
    expect(count((f) => f.kind === "champion")).toBe(1);
  });

  test("fight orders run 1 to 37 in traversal order", () => {
    expect(sun.fights.map((f) => f.order)).toEqual(Array.from({ length: 37 }, (_, i) => i + 1));
    expect(sun.fights.map((f) => f.id)).toEqual([
      "rival-hau-1",
      "rival-hau-2",
      "rival-ilima",
      "gym-ilima",
      "rival-hau-3",
      "gym-hala",
      "rival-dexio-sina",
      "rival-hau-4",
      "rival-gladion-1",
      "gym-lana",
      "gym-kiawe",
      "gym-mallow",
      "boss-plumeria-1",
      "gym-olivia",
      "rival-hau-5",
      "rival-molayne",
      "gym-sophocles",
      "boss-guzma-1",
      "gym-acerola",
      "boss-plumeria-2",
      "boss-guzma-2",
      "rival-gladion-2",
      "gym-nanu",
      "boss-faba-1",
      "boss-faba-2",
      "boss-guzma-3",
      "boss-lusamine-1",
      "gym-hapu",
      "gym-kommo-o",
      "boss-lusamine-2",
      "rival-gladion-3",
      "rival-hau-6",
      ...E4,
      "champion-kukui",
    ]);
  });

  test("the 11 trials grant a Z-Crystal as a badge with no sprite", () => {
    expect(count((f) => f.grantsBadge)).toBe(11);
    for (const [id, badge] of TRIALS) {
      expect(byId.get(id)?.kind, id).toBe("gym");
      expect(byId.get(id)?.grantsBadge, id).toBe(true);
      expect(byId.get(id)?.badge, id).toBe(badge);
      expect(byId.get(id)?.badgeSprite, id).toBeNull();
    }
  });

  test("rivals, bosses, the Elite Four and Kukui grant no badge", () => {
    for (const id of [...RIVALS, ...BOSSES, ...E4, "champion-kukui"]) {
      expect(byId.get(id)?.grantsBadge, id).toBe(false);
      expect(byId.get(id)?.badge, id).toBeNull();
    }
  });

  test("Hau, Gladion, Dexio and Sina, Molayne and Ilima's marina fight are rivals", () => {
    for (const id of RIVALS) expect(byId.get(id)?.kind, id).toBe("rival");
  });

  test("Guzma, Plumeria, Faba and Lusamine are bosses", () => {
    for (const id of BOSSES) expect(byId.get(id)?.kind, id).toBe("boss");
  });

  test("the Elite Four are elite_four and Kukui is the champion", () => {
    for (const id of E4) expect(byId.get(id)?.kind, id).toBe("elite_four");
    expect(byId.get("champion-kukui")?.kind).toBe("champion");
  });

  test("regions are the four islands, never alola", () => {
    const islands = new Set(["melemele", "akala", "ula'ula", "poni"]);
    for (const fight of sun.fights) expect(islands.has(fight.region), fight.id).toBe(true);
    for (const route of sun.routes) expect(islands.has(route.region), route.id).toBe(true);
    expect(byId.get("gym-ilima")?.region).toBe("melemele");
    expect(byId.get("gym-lana")?.region).toBe("akala");
    expect(byId.get("gym-sophocles")?.region).toBe("ula'ula");
    expect(byId.get("gym-hapu")?.region).toBe("poni");
    expect(byId.get("champion-kukui")?.region).toBe("poni");
    expect(sun.routes.find((r) => r.id === "route-1")?.region).toBe("melemele");
    expect(sun.routes.find((r) => r.id === "route-4")?.region).toBe("akala");
    expect(sun.routes.find((r) => r.id === "malie-city")?.region).toBe("ula'ula");
    expect(sun.routes.find((r) => r.id === "mount-lanakila")?.region).toBe("poni");
  });

  test("version and starter variants are listed together", () => {
    expect(byId.get("gym-ilima")?.name).toBe("Totem Gumshoos / Raticate (Ilima's trial)");
    expect(level("gym-ilima", "gumshoos")).toBe(12);
    expect(level("gym-ilima", "raticate-alola")).toBe(12);
    expect(byId.get("rival-dexio-sina")?.name).toBe("Dexio / Sina (Heahea City)");
    expect(level("rival-dexio-sina", "espeon")).toBe(16);
    expect(level("rival-dexio-sina", "glaceon")).toBe(16);
    for (const species of ["primarina", "decidueye", "incineroar"]) {
      expect(level("champion-kukui", species), species).toBe(58);
    }
    for (const species of ["brionne", "dartrix", "torracat"]) {
      expect(level("rival-hau-4", species), species).toBe(17);
    }
  });

  test("the optional and post-game fights are left out", () => {
    const names = sun.fights.map((f) => f.name).join("|");
    expect(names).not.toContain("School");
    expect(names).not.toContain("Royal");
    expect(sun.fights.some((f) => aceOf(f) > 58)).toBe(false);
  });
});

describe("routes", () => {
  test("both versions have 55 routes in unique increasing order, with the starter first", () => {
    for (const game of [sun, moon]) {
      expect(game.routes).toHaveLength(55);
      expect(game.routes.map((r) => r.order)).toEqual(Array.from({ length: 55 }, (_, i) => i + 1));
      expect(game.routes[0]?.id).toBe("starter");
      expect(game.routes[0]?.only).toBeUndefined();
      expect(new Set(game.routes.map((r) => r.id)).size).toBe(55);
    }
  });

  test("only the gift and static routes are flagged", () => {
    const expected = { "konikoni-city": "gift", "altar-of-the-sunne": "static" };
    expect(flagged(sun)).toEqual(expected);
    expect(flagged(moon)).toEqual(expected);
  });

  test("the starter and places with wild encounters beside a gift are not flagged", () => {
    for (const id of ["starter", "route-2", "paniola-ranch", "route-5", "malie-city"]) {
      expect(sun.routes.find((r) => r.id === id)?.only, id).toBeUndefined();
    }
  });

  test("the Altar is named per version and is the only difference", () => {
    const altar = (game: typeof sun) => game.routes.find((r) => r.id === "altar-of-the-sunne");
    expect(altar(sun)?.name).toBe("Altar of the Sunne");
    expect(altar(moon)?.name).toBe("Altar of the Moone");
    const withoutAltar = (game: typeof sun) =>
      game.routes.filter((r) => r.id !== "altar-of-the-sunne");
    expect(withoutAltar(moon)).toEqual(withoutAltar(sun));
  });

  test("Route 1 comes before Hau'oli Outskirts and post-game places are not routes", () => {
    const ids = sun.routes.map((r) => r.id);
    expect(ids.indexOf("route-1")).toBeLessThan(ids.indexOf("hauoli-outskirts"));
    for (const id of ["poni-grove", "resolution-cave", "berry-fields", "aether-house"]) {
      expect(ids, id).not.toContain(id);
    }
  });

  test("Haina Desert opens after the Thrifty Megamart trial, so it sits right after it", () => {
    const ids = sun.routes.map((r) => r.id);
    expect(ids.indexOf("haina-desert")).toBe(ids.indexOf("thrifty-megamart") + 1);
    expect(ids.indexOf("route-16")).toBe(ids.indexOf("haina-desert") + 1);
    expect(sun.routes.find((r) => r.id === "haina-desert")?.region).toBe("ula'ula");
    expect(sun.routes.find((r) => r.id === "haina-desert")?.only).toBeUndefined();
  });
});

describe("registration", () => {
  test("sun and moon are game ids and registered", () => {
    for (const [id, game, name] of [
      ["sun", sun, "Sun"],
      ["moon", moon, "Moon"],
    ] as const) {
      expect(GAME_IDS).toContain(id);
      expect(GAMES[id]).toBe(game);
      expect(game.name).toBe(name);
      expect(game.id).toBe(id);
    }
  });

  test("the two games share one fights list and one set of caps", () => {
    expect(moon.fights).toBe(sun.fights);
    expect(moon.levelCaps).toBe(sun.levelCaps);
  });

  test("they are generation 7 and released on the Japan date", () => {
    for (const game of [sun, moon]) {
      expect(game.generation).toBe(7);
      expect(game.released).toBe("2016-11-18");
    }
  });
});

describe("sun runs", () => {
  test("a Moon run seeds its routes and fights", () => {
    const routes = seedRoutes("run-1", moon);
    const fights = seedFights("run-1", moon);
    expect(routes.map((r) => r.gameRouteId)).toEqual(moon.routes.map((r) => r.id));
    expect(fights.map((f) => f.gameFightId)).toEqual(moon.fights.map((f) => f.id));
  });

  test("resolve in generation 7, where Clefairy is Fairy", () => {
    const clefairy = toSpecies(pokemonFixtures.clefairy!);
    expect(typesIn(clefairy, sun.generation)).toEqual(["fairy"]);
  });

  test("show nature, ability, held item, gender and shiny", () => {
    expect(monFields(sun)).toEqual({
      nature: true,
      ability: true,
      heldItem: true,
      gender: true,
      shiny: true,
    });
  });
});
