import { describe, expect, test } from "vitest";

import { GAME_IDS } from "@/domain/types";
import { shield, sword } from "@/game/data/swsh";
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
  "rival-hop-1": 5,
  "rival-hop-2": 8,
  "rival-hop-3": 14,
  "rival-bede-1": 16,
  "gym-milo": 20,
  "rival-hop-4": 21,
  "gym-nessa": 24,
  "rival-bede-2": 23,
  "rival-marnie-1": 26,
  "gym-kabu": 27,
  "rival-hop-5": 33,
  "gym-stow-on-side": 36,
  "rival-bede-3": 35,
  "gym-opal": 38,
  "rival-hop-6": 37,
  "rival-hop-7": 41,
  "gym-circhester": 42,
  "rival-marnie-2": 44,
  "gym-piers": 46,
  "gym-raihan": 48,
  "elite-four-marnie": 49,
  "elite-four-hop": 49,
  "boss-oleana": 52,
  "elite-four-bede": 53,
  "elite-four-nessa": 53,
  "elite-four-bea-allister": 54,
  "elite-four-raihan": 55,
  "boss-rose": 57,
  "boss-eternatus": 60,
  "champion-leon": 65,
};

const aceOf = (fight: FightDef | undefined): number =>
  Math.max(...(fight?.roster.map((m) => m.level) ?? []));

const games = [sword, shield];
const CUP = [
  "elite-four-marnie",
  "elite-four-hop",
  "elite-four-bede",
  "elite-four-nessa",
  "elite-four-bea-allister",
  "elite-four-raihan",
];
const GYMS = [
  "gym-milo",
  "gym-nessa",
  "gym-kabu",
  "gym-stow-on-side",
  "gym-opal",
  "gym-circhester",
  "gym-piers",
  "gym-raihan",
];
const BOSSES = ["boss-oleana", "boss-rose", "boss-eternatus"];
const FLAGGED = {
  turffield: "gift",
  hammerlocke: "gift",
  "stow-on-side": "gift",
  ballonlea: "gift",
  circhester: "gift",
  spikemuth: "gift",
  wyndon: "gift",
  "energy-plant": "static",
};

const idMap = (game: typeof sword): Map<string, FightDef> =>
  new Map(game.fights.map((f) => [f.id, f]));
const level = (game: typeof sword, id: string, species: string): number | undefined =>
  idMap(game)
    .get(id)
    ?.roster.find((m) => m.species === species)?.level;
const flagged = (game: typeof sword): Record<string, string | undefined> =>
  Object.fromEntries(game.routes.filter((r) => r.only !== undefined).map((r) => [r.id, r.only]));

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

  test("the cap table follows the source", () => {
    expect(game.levelCaps).toEqual([
      { cap: 20, until: { badges: 1 } },
      { cap: 24, until: { badges: 2 } },
      { cap: 27, until: { badges: 3 } },
      { cap: 36, until: { badges: 4 } },
      { cap: 38, until: { badges: 5 } },
      { cap: 42, until: { badges: 6 } },
      { cap: 46, until: { badges: 7 } },
      { cap: 48, until: { badges: 8 } },
      { cap: 49, until: { fight: "elite-four-marnie" } },
      { cap: 49, until: { fight: "elite-four-hop" } },
      { cap: 53, until: { fight: "elite-four-bede" } },
      { cap: 53, until: { fight: "elite-four-nessa" } },
      { cap: 54, until: { fight: "elite-four-bea-allister" } },
      { cap: 55, until: { fight: "elite-four-raihan" } },
      { cap: 65, until: { fight: "champion-leon" } },
    ]);
  });

  test("caps never decrease and every fight milestone waits on a real fight", () => {
    const caps = game.levelCaps.map((m) => m.cap);
    expect(caps).toEqual(caps.toSorted((a, b) => a - b));
    for (const { until } of game.levelCaps) {
      if ("fight" in until) expect(byId.has(until.fight)).toBe(true);
    }
  });

  test("each cap is at least the ace of the fight it waits on", () => {
    for (const { cap, until } of game.levelCaps) {
      if ("fight" in until)
        expect(cap, until.fight).toBeGreaterThanOrEqual(aceOf(byId.get(until.fight)));
    }
  });

  test("no fight's ace is above the cap in force when it is reached", () => {
    const fights = game.fights.toSorted((a, b) => a.order - b.order);
    let badges = 0;
    for (const fight of fights) {
      const open = game.levelCaps.find(({ until }) => {
        if ("badges" in until) return badges < until.badges;
        const gate = byId.get(until.fight);
        return gate !== undefined && gate.order >= fight.order;
      });
      expect(open, fight.id).toBeDefined();
      expect(aceOf(fight), fight.id).toBeLessThanOrEqual(open?.cap ?? 0);
      if (fight.grantsBadge) badges += 1;
    }
  });
});

describe.each(games)("$id shape", (game) => {
  const byId = idMap(game);
  const count = (pred: (f: FightDef) => boolean): number => game.fights.filter(pred).length;

  test("has 30 fights: 8 gym, 12 rival, 6 Champion Cup, 3 boss and 1 champion", () => {
    expect(game.fights).toHaveLength(30);
    expect(count((f) => f.kind === "gym")).toBe(8);
    expect(count((f) => f.kind === "rival")).toBe(12);
    expect(count((f) => f.kind === "elite_four")).toBe(6);
    expect(count((f) => f.kind === "boss")).toBe(3);
    expect(count((f) => f.kind === "champion")).toBe(1);
  });

  test("fight orders run 1 to 30 in traversal order", () => {
    expect(game.fights.map((f) => f.order)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(game.fights.map((f) => f.id)).toEqual([
      "rival-hop-1",
      "rival-hop-2",
      "rival-hop-3",
      "rival-bede-1",
      "gym-milo",
      "rival-hop-4",
      "gym-nessa",
      "rival-bede-2",
      "rival-marnie-1",
      "gym-kabu",
      "rival-hop-5",
      "gym-stow-on-side",
      "rival-bede-3",
      "gym-opal",
      "rival-hop-6",
      "rival-hop-7",
      "gym-circhester",
      "rival-marnie-2",
      "gym-piers",
      "gym-raihan",
      "elite-four-marnie",
      "elite-four-hop",
      "boss-oleana",
      "elite-four-bede",
      "elite-four-nessa",
      "elite-four-bea-allister",
      "elite-four-raihan",
      "boss-rose",
      "boss-eternatus",
      "champion-leon",
    ]);
  });

  test("kinds follow the model", () => {
    for (const id of GYMS) expect(byId.get(id)?.kind, id).toBe("gym");
    for (const id of CUP) expect(byId.get(id)?.kind, id).toBe("elite_four");
    for (const id of BOSSES) expect(byId.get(id)?.kind, id).toBe("boss");
    expect(byId.get("champion-leon")?.kind).toBe("champion");
    for (const f of game.fights.filter((f) => f.id.startsWith("rival-")))
      expect(f.kind).toBe("rival");
  });

  test("only the eight gyms grant a badge", () => {
    expect(count((f) => f.grantsBadge)).toBe(8);
    for (const f of game.fights) {
      expect(f.grantsBadge, f.id).toBe(f.kind === "gym");
      expect(f.badge === null, f.id).toBe(f.kind !== "gym");
      expect(f.badgeSprite === null, f.id).toBe(f.kind !== "gym");
    }
  });

  test("every fight is in Galar", () => {
    expect(game.fights.every((f) => f.region === "galar")).toBe(true);
    expect(game.routes.every((r) => r.region === "galar")).toBe(true);
  });

  test("starter variants are listed together", () => {
    for (const species of ["grookey", "scorbunny", "sobble"]) {
      expect(level(game, "rival-hop-1", species), species).toBe(5);
    }
    for (const species of ["rillaboom", "cinderace", "inteleon"]) {
      expect(level(game, "elite-four-hop", species), species).toBe(49);
      expect(level(game, "champion-leon", species), species).toBe(64);
    }
    expect(level(game, "rival-hop-5", "cramorant")).toBe(29);
    expect(level(game, "champion-leon", "charizard")).toBe(65);
  });

  test("PokeAPI form names are used", () => {
    expect(level(game, "rival-marnie-1", "morpeko-full-belly")).toBe(26);
    expect(level(game, "champion-leon", "aegislash-shield")).toBe(62);
    expect(level(game, "rival-bede-2", "ponyta-galar")).toBe(22);
    expect(level(game, "elite-four-bede", "rapidash-galar")).toBe(52);
  });

  test("the post-game and DLC fights are left out", () => {
    expect(game.fights.some((f) => aceOf(f) > 65)).toBe(false);
    const names = game.fights.map((f) => f.name).join("|");
    for (const gone of ["Mustard", "Klara", "Avery", "Peony", "Sordward"]) {
      expect(names).not.toContain(gone);
    }
  });
});

describe("version gyms", () => {
  test("Sword and Shield differ only in the three version fights", () => {
    const differing = sword.fights
      .filter((f) => JSON.stringify(f) !== JSON.stringify(idMap(shield).get(f.id)))
      .map((f) => f.id);
    expect(differing).toEqual(["gym-stow-on-side", "gym-circhester", "elite-four-bea-allister"]);
  });

  test("Stow-on-Side is Bea in Sword and Allister in Shield", () => {
    const [s, h] = [idMap(sword), idMap(shield)];
    expect(s.get("gym-stow-on-side")?.name).toBe("Bea");
    expect(s.get("gym-stow-on-side")?.badge).toBe("Fighting");
    expect(s.get("gym-stow-on-side")?.badgeSprite).toBe(54);
    expect(h.get("gym-stow-on-side")?.name).toBe("Allister");
    expect(h.get("gym-stow-on-side")?.badge).toBe("Ghost");
    expect(h.get("gym-stow-on-side")?.badgeSprite).toBe(55);
    expect(level(sword, "gym-stow-on-side", "machamp")).toBe(36);
    expect(level(shield, "gym-stow-on-side", "gengar")).toBe(36);
    expect(level(shield, "gym-stow-on-side", "yamask-galar")).toBe(34);
  });

  test("Circhester is Gordie in Sword and Melony in Shield", () => {
    const [s, h] = [idMap(sword), idMap(shield)];
    expect(s.get("gym-circhester")?.name).toBe("Gordie");
    expect(s.get("gym-circhester")?.badge).toBe("Rock");
    expect(s.get("gym-circhester")?.badgeSprite).toBe(57);
    expect(h.get("gym-circhester")?.name).toBe("Melony");
    expect(h.get("gym-circhester")?.badge).toBe("Ice");
    expect(h.get("gym-circhester")?.badgeSprite).toBe(58);
    expect(level(sword, "gym-circhester", "coalossal")).toBe(42);
    expect(level(shield, "gym-circhester", "lapras")).toBe(42);
    expect(level(shield, "gym-circhester", "darmanitan-galar-standard")).toBe(40);
    expect(level(shield, "gym-circhester", "eiscue-ice")).toBe(41);
  });

  test("the Champion Cup duel is Bea in Sword and Allister in Shield", () => {
    expect(idMap(sword).get("elite-four-bea-allister")?.name).toBe("Bea (Champion Cup)");
    expect(idMap(shield).get("elite-four-bea-allister")?.name).toBe("Allister (Champion Cup)");
    expect(level(sword, "elite-four-bea-allister", "hawlucha")).toBe(52);
    expect(level(shield, "elite-four-bea-allister", "dusknoir")).toBe(52);
  });

  test("the eight gym badges use sprites 51 to 60 in gym order", () => {
    for (const [game, sprites, badges] of [
      [
        sword,
        [51, 52, 53, 54, 56, 57, 59, 60],
        ["Grass", "Water", "Fire", "Fighting", "Fairy", "Rock", "Dark", "Dragon"],
      ],
      [
        shield,
        [51, 52, 53, 55, 56, 58, 59, 60],
        ["Grass", "Water", "Fire", "Ghost", "Fairy", "Ice", "Dark", "Dragon"],
      ],
    ] as const) {
      const gyms = game.fights.filter((f) => f.grantsBadge);
      expect(gyms.map((f) => f.badgeSprite)).toEqual(sprites);
      expect(gyms.map((f) => f.badge)).toEqual(badges);
    }
  });
});

describe("routes", () => {
  test("both versions have 46 routes in unique increasing order, with the starter first", () => {
    for (const game of games) {
      expect(game.routes).toHaveLength(46);
      expect(game.routes.map((r) => r.order)).toEqual(Array.from({ length: 46 }, (_, i) => i + 1));
      expect(game.routes[0]?.id).toBe("starter");
      expect(game.routes[0]?.only).toBeUndefined();
      expect(new Set(game.routes.map((r) => r.id)).size).toBe(46);
    }
  });

  test("the two versions share one routes list and one cap table", () => {
    expect(shield.routes).toBe(sword.routes);
    expect(shield.levelCaps).toBe(sword.levelCaps);
  });

  test("only the gift and static routes are flagged", () => {
    expect(flagged(sword)).toEqual(FLAGGED);
    expect(flagged(shield)).toEqual(FLAGGED);
  });

  test("the starter and places with wild encounters beside a gift are not flagged", () => {
    for (const id of [
      "starter",
      "route-5",
      "hulbury",
      "motostoke",
      "route-6",
      "slumbering-weald",
    ]) {
      expect(sword.routes.find((r) => r.id === id)?.only, id).toBeUndefined();
    }
  });

  test("the Wild Area areas and the split routes are present", () => {
    const ids = sword.routes.map((r) => r.id);
    const wild = [
      "rolling-fields",
      "dappled-grove",
      "west-lake-axewell",
      "watchtower-ruins",
      "east-lake-axewell",
      "south-lake-miloch",
      "giants-seat",
      "north-lake-miloch",
      "motostoke-riverbank",
      "bridge-field",
      "stony-wilderness",
      "dusty-bowl",
      "giants-cap",
      "giants-mirror",
      "hammerlocke-hills",
      "lake-of-outrage",
      "axews-eye",
    ];
    expect(wild).toHaveLength(17);
    for (const id of wild) expect(ids, id).toContain(id);
    for (const id of ["steamdrift-way", "circhester-bay", "outer-spikemuth"]) {
      expect(ids, id).toContain(id);
    }
  });

  test("the story-order placements hold", () => {
    const ids = sword.routes.map((r) => r.id);
    expect(ids.indexOf("lake-of-outrage")).toBeGreaterThan(ids.indexOf("route-9"));
    expect(ids.indexOf("axews-eye")).toBeGreaterThan(ids.indexOf("route-9"));
    expect(ids.slice(-2)).toEqual(["slumbering-weald", "energy-plant"]);
    expect(ids.indexOf("slumbering-weald")).toBeGreaterThan(ids.indexOf("wyndon"));
    for (const id of ["wedgehurst", "meetup-spot", "max-raid-dens", "postwick"]) {
      expect(ids, id).not.toContain(id);
    }
  });
});

describe("registration", () => {
  test("sword and shield are game ids and registered", () => {
    for (const [id, game, name] of [
      ["sword", sword, "Sword"],
      ["shield", shield, "Shield"],
    ] as const) {
      expect(GAME_IDS).toContain(id);
      expect(GAMES[id]).toBe(game);
      expect(game.name).toBe(name);
      expect(game.id).toBe(id);
    }
  });

  test("they are generation 8, released on the worldwide date", () => {
    for (const game of games) {
      expect(game.generation).toBe(8);
      expect(game.released).toBe("2019-11-15");
    }
  });

  test("the cup is headed Champion Cup", () => {
    expect(sword.league).toBe("Champion Cup");
    expect(shield.league).toBe("Champion Cup");
  });
});

describe("sword and shield runs", () => {
  test("a Shield run seeds its routes and fights", () => {
    const routes = seedRoutes("run-1", shield);
    const fights = seedFights("run-1", shield);
    expect(routes.map((r) => r.gameRouteId)).toEqual(shield.routes.map((r) => r.id));
    expect(fights.map((f) => f.gameFightId)).toEqual(shield.fights.map((f) => f.id));
  });

  test("resolve in generation 8, where Clefairy is Fairy", () => {
    const clefairy = toSpecies(pokemonFixtures.clefairy!);
    expect(typesIn(clefairy, sword.generation)).toEqual(["fairy"]);
  });

  test("show nature, ability, held item, gender and shiny", () => {
    expect(monFields(sword)).toEqual({
      nature: true,
      ability: true,
      heldItem: true,
      gender: true,
      shiny: true,
    });
  });
});
