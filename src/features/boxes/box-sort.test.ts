import { describe, expect, it } from "vitest";

import type { Mon } from "@/domain/types";

import {
  boxSortValue,
  compareBoxSortValues,
  searchMons,
  sortBoxedMons,
  type BoxSortField,
  type BoxSorting,
} from "./box-sort";

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

const asc = (field: BoxSortField): BoxSorting => ({ field, desc: false });
const desc = (field: BoxSortField): BoxSorting => ({ field, desc: true });

describe("sortBoxedMons", () => {
  it("leaves slot order alone with no sorting", () => {
    const input = [mon("b", { level: 9 }), mon("a", { level: 3 }), mon("c", { level: 6 })];
    expect(ids(sortBoxedMons(input, null))).toEqual(["b", "a", "c"]);
  });

  it("does not change the list it was given", () => {
    const input = [mon("a", { level: 2 }), mon("b", { level: 1 })];
    sortBoxedMons(input, asc("level"));
    expect(ids(input)).toEqual(["a", "b"]);
  });

  it("sorts level as a number, both ways", () => {
    const input = [
      mon("ten", { level: 10 }),
      mon("nine", { level: 9 }),
      mon("hundred", { level: 100 }),
    ];
    expect(ids(sortBoxedMons(input, asc("level")))).toEqual(["nine", "ten", "hundred"]);
    expect(ids(sortBoxedMons(input, desc("level")))).toEqual(["hundred", "ten", "nine"]);
  });

  it("sorts nicknames and species names together, ignoring case", () => {
    const input = [
      mon("zed", { nickname: "Zed" }),
      mon("bulbasaur", { speciesId: "bulbasaur" }),
      mon("alpha", { nickname: "alpha" }),
    ];
    expect(ids(sortBoxedMons(input, asc("name")))).toEqual(["alpha", "bulbasaur", "zed"]);
    expect(ids(sortBoxedMons(input, desc("name")))).toEqual(["zed", "bulbasaur", "alpha"]);
  });

  it("sorts ability and item by what is shown", () => {
    const input = [
      mon("b", { heldItem: "miracle-seed", ability: "water-absorb" }),
      mon("a", { heldItem: "Oran Berry", ability: "Overgrow" }),
    ];
    expect(ids(sortBoxedMons(input, asc("item")))).toEqual(["b", "a"]);
    expect(ids(sortBoxedMons(input, asc("ability")))).toEqual(["a", "b"]);
  });

  it.each(["nature", "item", "ability", "gender"] as const)(
    "puts a mon with no %s last in either direction",
    (field) => {
      const low: Partial<Mon> = {
        nature: "Adamant",
        heldItem: "apicot-berry",
        ability: "adaptability",
        gender: "female",
      };
      const high: Partial<Mon> = {
        nature: "Jolly",
        heldItem: "oran-berry",
        ability: "overgrow",
        gender: "male",
      };
      const input = [mon("empty"), mon("a", low), mon("b", high)];
      expect(ids(sortBoxedMons(input, asc(field)))).toEqual(["a", "b", "empty"]);
      expect(ids(sortBoxedMons(input, desc(field)))).toEqual(["b", "a", "empty"]);
    },
  );

  it("keeps slot order between ties, in either direction", () => {
    const input = [mon("z", { level: 9 }), mon("first", { level: 5 }), mon("second", { level: 5 })];
    expect(ids(sortBoxedMons(input, asc("level")))).toEqual(["first", "second", "z"]);
    expect(ids(sortBoxedMons(input, desc("level")))).toEqual(["z", "first", "second"]);
  });
});

describe("boxSortValue", () => {
  it("is undefined for empty fields, including an empty string", () => {
    const empty = mon("a", { nature: "" });
    expect(boxSortValue(empty, "nature")).toBeUndefined();
    expect(boxSortValue(empty, "item")).toBeUndefined();
    expect(boxSortValue(empty, "ability")).toBeUndefined();
    expect(boxSortValue(empty, "gender")).toBeUndefined();
  });
});

describe("compareBoxSortValues", () => {
  it("compares numbers numerically and strings ignoring case", () => {
    expect(compareBoxSortValues(9, 10)).toBeLessThan(0);
    expect(compareBoxSortValues("apple", "Banana")).toBeLessThan(0);
    expect(compareBoxSortValues("Apple", "apple")).toBe(0);
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
