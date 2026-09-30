import { describe, expect, it } from "vitest";

import type { Mon } from "@/domain/types";
import type { Type } from "@/game/types";

import { searchMons, sortBoxedMons } from "./box-sort";

function mon(id: string, overrides: Partial<Mon> = {}): Mon {
  return {
    id,
    runId: "run-1",
    encounterId: null,
    speciesId: "chikorita",
    speciesIdCaught: "chikorita",
    nickname: null,
    gender: null,
    level: 5,
    levelCaught: 5,
    nature: null,
    ability: null,
    heldItem: null,
    moves: [],
    status: "box",
    partySlot: null,
    boxOrder: 0,
    caughtRouteId: null,
    shiny: false,
    createdAt: "2026-09-27T00:00:00.000Z",
    updatedAt: "2026-09-27T00:00:00.000Z",
    ...overrides,
  };
}

function ids(mons: readonly Mon[]): string[] {
  return mons.map((m) => m.id);
}

const NO_TYPES = new Map<string, Type[]>();

describe("sortBoxedMons", () => {
  it("leaves caught order alone", () => {
    const input = [mon("b", { level: 9 }), mon("a", { level: 3 }), mon("c", { level: 6 })];
    expect(ids(sortBoxedMons(input, "caught", NO_TYPES))).toEqual(["b", "a", "c"]);
  });

  it("puts the highest level first and keeps caught order between equal levels", () => {
    const input = [
      mon("low", { level: 5 }),
      mon("tie-first", { level: 9 }),
      mon("tie-second", { level: 9 }),
      mon("mid", { level: 7 }),
    ];
    expect(ids(sortBoxedMons(input, "level", NO_TYPES))).toEqual([
      "tie-first",
      "tie-second",
      "mid",
      "low",
    ]);
  });

  it("does not change the list it was given", () => {
    const input = [mon("a", { level: 1 }), mon("b", { level: 2 })];
    sortBoxedMons(input, "level", NO_TYPES);
    expect(ids(input)).toEqual(["a", "b"]);
  });

  describe("by name", () => {
    it("sorts nicknames and species names together, A to Z, ignoring case", () => {
      const input = [
        mon("zed", { nickname: "Zed" }),
        mon("pidgey", { speciesId: "pidgey" }),
        mon("gyarados", { speciesId: "gyarados" }),
        mon("apple", { nickname: "apple" }),
      ];
      expect(ids(sortBoxedMons(input, "name", NO_TYPES))).toEqual([
        "apple",
        "gyarados",
        "pidgey",
        "zed",
      ]);
    });

    it("uses the species name for a mon with no nickname", () => {
      const input = [
        mon("nicknamed", { speciesId: "pidgey", nickname: "Zed" }),
        mon("plain", { speciesId: "gyarados" }),
      ];
      expect(ids(sortBoxedMons(input, "name", NO_TYPES))).toEqual(["plain", "nicknamed"]);
    });

    it("keeps caught order between equal names", () => {
      const input = [
        mon("z", { nickname: "Zed" }),
        mon("first", { speciesId: "pidgey" }),
        mon("second", { speciesId: "pidgey" }),
      ];
      expect(ids(sortBoxedMons(input, "name", NO_TYPES))).toEqual(["first", "second", "z"]);
    });
  });

  describe("by type", () => {
    const typesById = new Map<string, Type[]>([
      ["bulbasaur", ["grass", "poison"]],
      ["gyarados", ["water", "flying"]],
      ["abomasnow", ["grass", "ice"]],
      ["chikorita", ["grass"]],
      ["totodile", ["water"]],
      ["pidgey", ["normal", "flying"]],
    ]);

    it("orders by primary type, then single before dual, then secondary type", () => {
      const input = [
        mon("bulbasaur", { speciesId: "bulbasaur" }),
        mon("mystery", { speciesId: "mystery" }),
        mon("gyarados", { speciesId: "gyarados" }),
        mon("abomasnow", { speciesId: "abomasnow" }),
        mon("chikorita", { speciesId: "chikorita" }),
        mon("totodile", { speciesId: "totodile" }),
        mon("pidgey", { speciesId: "pidgey" }),
      ];
      expect(ids(sortBoxedMons(input, "type", typesById))).toEqual([
        "pidgey",
        "totodile",
        "gyarados",
        "chikorita",
        "abomasnow",
        "bulbasaur",
        "mystery",
      ]);
    });

    it("keeps caught order between mons of the same types", () => {
      const input = [
        mon("water-b", { speciesId: "totodile" }),
        mon("normal", { speciesId: "pidgey" }),
        mon("water-a", { speciesId: "totodile" }),
      ];
      expect(ids(sortBoxedMons(input, "type", typesById))).toEqual([
        "normal",
        "water-b",
        "water-a",
      ]);
    });

    it("puts every mon last when no types have loaded, in caught order", () => {
      const input = [mon("b"), mon("a")];
      expect(ids(sortBoxedMons(input, "type", NO_TYPES))).toEqual(["b", "a"]);
    });
  });
});

describe("searchMons", () => {
  const input = [
    mon("sprig", { speciesId: "chikorita", nickname: "Sprig" }),
    mon("mime", { speciesId: "mr-mime" }),
    mon("flab", { speciesId: "flabebe" }),
    mon("bulb", { speciesId: "bulbasaur", nickname: "Bulby" }),
  ];

  it("returns everyone for a blank query", () => {
    expect(ids(searchMons(input, ""))).toEqual(["sprig", "mime", "flab", "bulb"]);
    expect(ids(searchMons(input, "   "))).toEqual(["sprig", "mime", "flab", "bulb"]);
  });

  it("matches the start of a nickname, ignoring case", () => {
    expect(ids(searchMons(input, "SPR"))).toEqual(["sprig"]);
  });

  it("matches the start of the species name, even when there is a nickname", () => {
    expect(ids(searchMons(input, "chik"))).toEqual(["sprig"]);
  });

  it("matches from the start of a name only, not the middle", () => {
    expect(searchMons(input, "prig")).toEqual([]);
    expect(searchMons(input, "kori")).toEqual([]);
  });

  it("matches the way the pickers do", () => {
    expect(ids(searchMons(input, "mr. mime"))).toEqual(["mime"]);
    expect(ids(searchMons(input, "flabé"))).toEqual(["flab"]);
  });

  it("returns nothing when no name matches", () => {
    expect(searchMons(input, "zzz")).toEqual([]);
  });
});
