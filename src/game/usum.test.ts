import { describe, expect, test } from "vitest";

import { GAME_IDS } from "@/domain/types";
import { ultraMoon, ultraSun } from "@/game/data/usum";
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
  "rival-emily": 10,
  "rival-ilima": 11,
  "gym-ilima": 12,
  "rival-ultra-recon-1": 13,
  "rival-hau-3": 13,
  "gym-hala": 16,
  "rival-dexio-sina": 15,
  "rival-hau-4": 16,
  "rival-gladion-1": 18,
  "gym-lana": 20,
  "rival-ultra-recon-2": 20,
  "gym-kiawe": 22,
  "gym-mallow": 24,
  "boss-plumeria-1": 27,
  "gym-olivia": 28,
  "rival-hau-5": 30,
  "gym-sophocles": 33,
  "boss-guzma-1": 34,
  "gym-acerola": 35,
  "boss-plumeria-2": 38,
  "boss-guzma-2": 41,
  "rival-gladion-2": 43,
  "gym-nanu": 44,
  "boss-faba-1": 43,
  "boss-faba-2": 45,
  "boss-guzma-3": 45,
  "rival-ultra-recon-3": 47,
  "boss-lusamine-1": 47,
  "rival-ultra-recon-4": 49,
  "gym-kommo-o": 49,
  "boss-necrozma-1": 50,
  "boss-necrozma-2": 60,
  "rival-mina": 51,
  "rival-captain-ilima": 51,
  "rival-captain-mallow-lana": 51,
  "rival-captain-kiawe": 51,
  "rival-captain-sophocles-nanu": 53,
  "gym-mina": 55,
  "gym-hapu": 54,
  "rival-gladion-3": 55,
  "elite-four-molayne": 57,
  "elite-four-olivia": 57,
  "elite-four-acerola": 57,
  "elite-four-kahili": 57,
  "champion-hau": 60,
};

const aceOf = (fight: FightDef | undefined): number =>
  Math.max(...(fight?.roster.map((m) => m.level) ?? []));

const E4 = ["elite-four-molayne", "elite-four-olivia", "elite-four-acerola", "elite-four-kahili"];
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
  ["gym-mina", "Fairium Z"],
] as const;
const BOSSES = [
  "boss-plumeria-1",
  "boss-guzma-1",
  "boss-plumeria-2",
  "boss-guzma-2",
  "boss-faba-1",
  "boss-faba-2",
  "boss-guzma-3",
  "boss-lusamine-1",
  "boss-necrozma-1",
  "boss-necrozma-2",
];
const RIVALS = [
  "rival-hau-1",
  "rival-hau-2",
  "rival-emily",
  "rival-ilima",
  "rival-ultra-recon-1",
  "rival-hau-3",
  "rival-dexio-sina",
  "rival-hau-4",
  "rival-gladion-1",
  "rival-ultra-recon-2",
  "rival-hau-5",
  "rival-gladion-2",
  "rival-ultra-recon-3",
  "rival-ultra-recon-4",
  "rival-mina",
  "rival-captain-ilima",
  "rival-captain-mallow-lana",
  "rival-captain-kiawe",
  "rival-captain-sophocles-nanu",
  "rival-gladion-3",
];
const FLAGGED = {
  "heahea-beach": "gift",
  "heahea-city": "gift",
  "royal-avenue": "gift",
  "konikoni-city": "static",
  "ultra-megalopolis": "gift",
  "mahalo-trail": "static",
};

const byId = new Map<string, FightDef>(ultraSun.fights.map((f) => [f.id, f]));
const count = (pred: (f: FightDef) => boolean): number => ultraSun.fights.filter(pred).length;
const level = (id: string, species: string): number | undefined =>
  byId.get(id)?.roster.find((m) => m.species === species)?.level;
const flagged = (game: typeof ultraSun): Record<string, string | undefined> =>
  Object.fromEntries(game.routes.filter((r) => r.only !== undefined).map((r) => [r.id, r.only]));

describe("ultra sun spot-check and caps", () => {
  test.each(Object.entries(VERIFIED_ACE_LEVELS))("%s has ace level %i", (id, expectedAce) => {
    expect(byId.get(id)).toBeDefined();
    expect(aceOf(byId.get(id))).toBe(expectedAce);
  });

  test("every fight has a verified ace", () => {
    expect(Object.keys(VERIFIED_ACE_LEVELS).toSorted()).toEqual(
      ultraSun.fights.map((f) => f.id).toSorted(),
    );
  });

  test("the cap table follows the source and holds 60 after Ultra Necrozma", () => {
    expect(ultraSun.levelCaps).toEqual([
      { cap: 10, until: { fight: "rival-emily" } },
      { cap: 12, until: { fight: "gym-ilima" } },
      { cap: 16, until: { fight: "gym-hala" } },
      { cap: 20, until: { fight: "gym-lana" } },
      { cap: 22, until: { fight: "gym-kiawe" } },
      { cap: 24, until: { fight: "gym-mallow" } },
      { cap: 28, until: { fight: "gym-olivia" } },
      { cap: 33, until: { fight: "gym-sophocles" } },
      { cap: 35, until: { fight: "gym-acerola" } },
      { cap: 44, until: { fight: "gym-nanu" } },
      { cap: 49, until: { fight: "gym-kommo-o" } },
      { cap: 50, until: { fight: "boss-necrozma-1" } },
      { cap: 60, until: { fight: "champion-hau" } },
    ]);
  });

  test("caps never decrease and every milestone waits on a real fight", () => {
    const caps = ultraSun.levelCaps.map((m) => m.cap);
    expect(caps).toEqual(caps.toSorted((a, b) => a - b));
    for (const { until } of ultraSun.levelCaps) {
      expect("fight" in until && byId.has(until.fight)).toBe(true);
    }
  });

  test("each cap is at least the ace of the fight it waits on", () => {
    for (const { cap, until } of ultraSun.levelCaps) {
      if ("fight" in until)
        expect(cap, until.fight).toBeGreaterThanOrEqual(aceOf(byId.get(until.fight)));
    }
  });

  test("no fight's ace is above the cap in force when it is reached", () => {
    const fights = ultraSun.fights.toSorted((a, b) => a.order - b.order);
    const waitsOn = ultraSun.levelCaps.map((m) => ("fight" in m.until ? m.until.fight : ""));
    for (const fight of fights) {
      const open = ultraSun.levelCaps.find((_, i) => {
        const gate = byId.get(waitsOn[i] ?? "");
        return gate !== undefined && gate.order >= fight.order;
      });
      expect(open, fight.id).toBeDefined();
      expect(aceOf(fight), fight.id).toBeLessThanOrEqual(open?.cap ?? 0);
    }
  });
});

describe("ultra sun shape", () => {
  test("has 47 fights: 12 trial, 20 rival, 10 boss, 4 Elite Four and 1 champion", () => {
    expect(ultraSun.fights).toHaveLength(47);
    expect(count((f) => f.kind === "gym")).toBe(12);
    expect(count((f) => f.kind === "rival")).toBe(20);
    expect(count((f) => f.kind === "boss")).toBe(10);
    expect(count((f) => f.kind === "elite_four")).toBe(4);
    expect(count((f) => f.kind === "champion")).toBe(1);
  });

  test("fight orders run 1 to 47 in traversal order", () => {
    expect(ultraSun.fights.map((f) => f.order)).toEqual(
      Array.from({ length: 47 }, (_, i) => i + 1),
    );
    expect(ultraSun.fights.map((f) => f.id)).toEqual([
      "rival-hau-1",
      "rival-hau-2",
      "rival-emily",
      "rival-ilima",
      "gym-ilima",
      "rival-ultra-recon-1",
      "rival-hau-3",
      "gym-hala",
      "rival-dexio-sina",
      "rival-hau-4",
      "rival-gladion-1",
      "gym-lana",
      "rival-ultra-recon-2",
      "gym-kiawe",
      "gym-mallow",
      "boss-plumeria-1",
      "gym-olivia",
      "rival-hau-5",
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
      "rival-ultra-recon-3",
      "boss-lusamine-1",
      "rival-ultra-recon-4",
      "gym-kommo-o",
      "boss-necrozma-1",
      "boss-necrozma-2",
      "rival-mina",
      "rival-captain-ilima",
      "rival-captain-mallow-lana",
      "rival-captain-kiawe",
      "rival-captain-sophocles-nanu",
      "gym-mina",
      "gym-hapu",
      "rival-gladion-3",
      ...E4,
      "champion-hau",
    ]);
  });

  test("the 12 trials grant a Z-Crystal as a badge with no sprite", () => {
    expect(count((f) => f.grantsBadge)).toBe(12);
    for (const [id, badge] of TRIALS) {
      expect(byId.get(id)?.kind, id).toBe("gym");
      expect(byId.get(id)?.grantsBadge, id).toBe(true);
      expect(byId.get(id)?.badge, id).toBe(badge);
      expect(byId.get(id)?.badgeSprite, id).toBeNull();
    }
  });

  test("rivals, bosses, the Elite Four and Hau as Champion grant no badge", () => {
    for (const id of [...RIVALS, ...BOSSES, ...E4, "champion-hau"]) {
      expect(byId.get(id)?.grantsBadge, id).toBe(false);
      expect(byId.get(id)?.badge, id).toBeNull();
    }
  });

  test("kinds follow the model: forced duels are rivals, villains and Necrozma are bosses", () => {
    for (const id of RIVALS) expect(byId.get(id)?.kind, id).toBe("rival");
    for (const id of BOSSES) expect(byId.get(id)?.kind, id).toBe("boss");
    for (const id of E4) expect(byId.get(id)?.kind, id).toBe("elite_four");
    expect(byId.get("champion-hau")?.kind).toBe("champion");
    expect(byId.get("rival-emily")?.kind).toBe("rival");
    expect(byId.get("boss-necrozma-1")?.kind).toBe("boss");
    expect(byId.get("boss-necrozma-2")?.kind).toBe("boss");
  });

  test("the Necrozma fights use PokeAPI form names", () => {
    expect(level("boss-necrozma-1", "necrozma-dusk")).toBe(50);
    expect(level("boss-necrozma-1", "necrozma-dawn")).toBe(50);
    expect(level("boss-necrozma-2", "necrozma-ultra")).toBe(60);
  });

  test("fights sit on the island they happen on", () => {
    expect(byId.get("rival-hau-1")?.region).toBe("melemele");
    expect(byId.get("gym-lana")?.region).toBe("akala");
    expect(byId.get("gym-sophocles")?.region).toBe("ula'ula");
    expect(byId.get("gym-hapu")?.region).toBe("poni");
    expect(byId.get("champion-hau")?.region).toBe("poni");
    expect(byId.get("rival-captain-ilima")?.region).toBe("melemele");
    expect(ultraSun.routes.find((r) => r.id === "route-1")?.region).toBe("melemele");
    expect(ultraSun.routes.find((r) => r.id === "route-4")?.region).toBe("akala");
    expect(ultraSun.routes.find((r) => r.id === "malie-city")?.region).toBe("ula'ula");
    expect(ultraSun.routes.find((r) => r.id === "mount-lanakila")?.region).toBe("poni");
    const regions = new Set([...ultraSun.fights, ...ultraSun.routes].map((r) => r.region));
    expect([...regions].toSorted()).toEqual(["akala", "melemele", "poni", "ula'ula"]);
  });

  test("version and starter variants are listed together", () => {
    expect(byId.get("gym-ilima")?.name).toBe("Totem Gumshoos / Raticate (Ilima's trial)");
    expect(level("gym-ilima", "gumshoos")).toBe(12);
    expect(level("gym-ilima", "raticate-alola")).toBe(12);
    expect(byId.get("rival-dexio-sina")?.name).toBe("Dexio / Sina (Heahea City)");
    expect(level("rival-dexio-sina", "smoochum")).toBe(15);
    expect(byId.get("rival-captain-mallow-lana")?.name).toBe("Mallow / Lana (Lush Jungle)");
    expect(level("rival-captain-mallow-lana", "araquanid")).toBe(51);
    expect(level("rival-captain-sophocles-nanu", "persian-alola")).toBe(53);
    expect(level("rival-captain-sophocles-nanu", "golem-alola")).toBe(51);
    for (const species of ["primarina", "decidueye", "incineroar"]) {
      expect(level("champion-hau", species), species).toBe(60);
    }
    for (const species of ["flareon", "vaporeon", "leafeon"]) {
      expect(level("champion-hau", species), species).toBe(58);
    }
  });

  test("the optional and post-game fights are left out", () => {
    const names = ultraSun.fights.map((f) => f.name).join("|");
    expect(names).not.toContain("Royal");
    expect(names).not.toContain("Rainbow");
    expect(ultraSun.fights.some((f) => aceOf(f) > 60)).toBe(false);
  });
});

describe("routes", () => {
  test("both versions have 61 routes in unique increasing order, with the starter first", () => {
    for (const game of [ultraSun, ultraMoon]) {
      expect(game.routes).toHaveLength(61);
      expect(game.routes.map((r) => r.order)).toEqual(Array.from({ length: 61 }, (_, i) => i + 1));
      expect(game.routes[0]?.id).toBe("starter");
      expect(game.routes[0]?.only).toBeUndefined();
      expect(new Set(game.routes.map((r) => r.id)).size).toBe(61);
    }
  });

  test("only the gift and static routes are flagged", () => {
    expect(flagged(ultraSun)).toEqual(FLAGGED);
    expect(flagged(ultraMoon)).toEqual(FLAGGED);
  });

  test("the starter and places with wild encounters beside a gift are not flagged", () => {
    for (const id of [
      "starter",
      "route-2",
      "paniola-ranch",
      "route-5",
      "malie-city",
      "mount-lanakila",
    ]) {
      expect(ultraSun.routes.find((r) => r.id === id)?.only, id).toBeUndefined();
    }
  });

  test("there is no altar route and Ula'ula Beach replaces Secluded Shore", () => {
    const ids = ultraSun.routes.map((r) => r.id);
    expect(ids).not.toContain("altar-of-the-sunne");
    expect(ids).not.toContain("secluded-shore");
    expect(ids).toContain("ulaula-beach");
  });

  test("the story-order placements hold", () => {
    const ids = ultraSun.routes.map((r) => r.id);
    expect(ids.indexOf("route-1")).toBeLessThan(ids.indexOf("hauoli-outskirts"));
    expect(ids.indexOf("haina-desert")).toBe(ids.indexOf("thrifty-megamart") + 1);
    expect(ids.indexOf("mahalo-trail")).toBe(ids.indexOf("mount-lanakila") + 1);
    for (const id of ["poni-grove", "resolution-cave", "berry-fields", "aether-house"]) {
      expect(ids, id).not.toContain(id);
    }
  });
});

describe("registration", () => {
  test("ultrasun and ultramoon are game ids and registered", () => {
    for (const [id, game, name] of [
      ["ultrasun", ultraSun, "Ultra Sun"],
      ["ultramoon", ultraMoon, "Ultra Moon"],
    ] as const) {
      expect(GAME_IDS).toContain(id);
      expect(GAMES[id]).toBe(game);
      expect(game.name).toBe(name);
      expect(game.id).toBe(id);
    }
  });

  test("the two games share one routes list, one fights list and one set of caps", () => {
    expect(ultraMoon.routes).toBe(ultraSun.routes);
    expect(ultraMoon.fights).toBe(ultraSun.fights);
    expect(ultraMoon.levelCaps).toBe(ultraSun.levelCaps);
  });

  test("they are generation 7 and released on the Japan date", () => {
    for (const game of [ultraSun, ultraMoon]) {
      expect(game.generation).toBe(7);
      expect(game.released).toBe("2017-11-17");
    }
  });
});

describe("ultra sun runs", () => {
  test("an Ultra Moon run seeds its routes and fights", () => {
    const routes = seedRoutes("run-1", ultraMoon);
    const fights = seedFights("run-1", ultraMoon);
    expect(routes.map((r) => r.gameRouteId)).toEqual(ultraMoon.routes.map((r) => r.id));
    expect(fights.map((f) => f.gameFightId)).toEqual(ultraMoon.fights.map((f) => f.id));
  });

  test("resolve in generation 7, where Clefairy is Fairy", () => {
    const clefairy = toSpecies(pokemonFixtures.clefairy!);
    expect(typesIn(clefairy, ultraSun.generation)).toEqual(["fairy"]);
  });

  test("show nature, ability, held item, gender and shiny", () => {
    expect(monFields(ultraSun)).toEqual({
      nature: true,
      ability: true,
      heldItem: true,
      gender: true,
      shiny: true,
    });
  });
});
