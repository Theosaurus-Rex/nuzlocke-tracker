import { describe, expect, it } from "vitest";

import { moveFixtures, pokemonFixtures, speciesIndexFixture } from "@/test/pokeapi-fixtures";

import type { IndexEntry } from "./model";
import { toMove, toSpecies, toSpeciesIndex } from "./map";
import {
  findByName,
  moveDisplayName,
  moveStatsIn,
  searchIndex,
  speciesDisplayName,
  typesIn,
} from "./resolve";

const clefairy = toSpecies(pokemonFixtures.clefairy!);
const vineWhip = toMove(moveFixtures["vine-whip"]!);
const tackle = toMove(moveFixtures.tackle!);
const charm = toMove(moveFixtures.charm!);
const index = toSpeciesIndex(speciesIndexFixture);

describe("typesIn", () => {
  it("gives Clefairy its gen 4 typing in a HeartGold run", () => {
    expect(typesIn(clefairy, 4)).toEqual(["normal"]);
  });

  it("gives Clefairy its present-day typing from gen 6", () => {
    expect(typesIn(clefairy, 6)).toEqual(["fairy"]);
  });
});

describe("moveStatsIn", () => {
  it("gives Vine Whip 35 power and 15 pp in gen 4", () => {
    expect(moveStatsIn(vineWhip, 4)).toEqual({ power: 35, accuracy: 100, pp: 15, type: "grass" });
  });

  it("gives Vine Whip its present-day values in gen 6", () => {
    expect(moveStatsIn(vineWhip, 6)).toEqual({ power: 45, accuracy: 100, pp: 25, type: "grass" });
  });

  it("walks each field separately to the first entry that sets it", () => {
    expect(moveStatsIn(tackle, 4)).toMatchObject({ power: 35, accuracy: 95 });
    expect(moveStatsIn(tackle, 5)).toMatchObject({ power: 50, accuracy: 100 });
    expect(moveStatsIn(vineWhip, 3)).toEqual({ power: 35, accuracy: 100, pp: 10, type: "grass" });
  });

  it("resolves a move whose type changed between generations", () => {
    expect(moveStatsIn(charm, 4).type).toBe("normal");
    expect(moveStatsIn(charm, 6).type).toBe("fairy");
  });
});

const punctuated: IndexEntry[] = [
  "nidoran-f",
  "farfetchd",
  "mr-mime",
  "ho-oh",
  "flabebe",
  "type-null",
  "mimikyu-disguised",
].map((name, i) => ({ id: i + 1, name }));

const moves: IndexEntry[] = ["tackle", "u-turn", "will-o-wisp"].map((name, i) => ({
  id: i + 1,
  name,
}));

describe("searchIndex", () => {
  it("prefix-matches case-insensitively and treats spaces as hyphens", () => {
    expect(searchIndex(index, "Mimikyu D", speciesDisplayName).map((e) => e.name)).toEqual([
      "mimikyu-disguised",
    ]);
  });

  it("keeps dex order", () => {
    expect(searchIndex(index, "g", speciesDisplayName).map((e) => e.name)).toEqual([
      "geodude",
      "gyarados",
    ]);
  });

  it("finds a name from the start of its displayed spelling", () => {
    expect(searchIndex(punctuated, "farfetch'", speciesDisplayName).map((e) => e.name)).toEqual([
      "farfetchd",
    ]);
    expect(searchIndex(punctuated, "Mr.", speciesDisplayName).map((e) => e.name)).toEqual([
      "mr-mime",
    ]);
  });

  it("finds a name typed with symbols and accents the id lacks", () => {
    expect(searchIndex(punctuated, "Nidoran♀", speciesDisplayName).map((e) => e.name)).toEqual([
      "nidoran-f",
    ]);
    expect(searchIndex(punctuated, "Flabé", speciesDisplayName).map((e) => e.name)).toEqual([
      "flabebe",
    ]);
  });

  it("does not match in the middle of a name", () => {
    expect(searchIndex(punctuated, "mime", speciesDisplayName)).toEqual([]);
  });

  it("finds a move from its displayed spelling", () => {
    expect(searchIndex(moves, "U-t", moveDisplayName).map((e) => e.name)).toEqual(["u-turn"]);
  });
});

describe("findByName", () => {
  it("finds a fully typed name however it is cased", () => {
    expect(findByName(index, "  Clefairy ", speciesDisplayName)?.id).toBe(35);
  });

  it("does not match a prefix", () => {
    expect(findByName(index, "clef", speciesDisplayName)).toBeUndefined();
  });

  it.each([
    ["Farfetch'd", "farfetchd"],
    ["Farfetch\u2019d", "farfetchd"],
    ["farfetchd", "farfetchd"],
    ["Mr. Mime", "mr-mime"],
    ["mr mime", "mr-mime"],
    ["mr-mime", "mr-mime"],
    ["Type: Null", "type-null"],
    ["Flabébé", "flabebe"],
    ["flabebe", "flabebe"],
    ["flabebé", "flabebe"],
    ["Nidoran♀", "nidoran-f"],
    ["nidoran-f", "nidoran-f"],
    ["Ho-Oh", "ho-oh"],
  ])("finds %s as %s", (typed, id) => {
    expect(findByName(punctuated, typed, speciesDisplayName)?.name).toBe(id);
  });

  it("finds moves by their displayed spelling", () => {
    expect(findByName(moves, "U-turn", moveDisplayName)?.name).toBe("u-turn");
    expect(findByName(moves, "Will-O-Wisp", moveDisplayName)?.name).toBe("will-o-wisp");
  });
});

describe("display names", () => {
  it("spells names the id cannot", () => {
    expect(speciesDisplayName("sirfetchd")).toBe("Sirfetch'd");
    expect(speciesDisplayName("mr-mime")).toBe("Mr. Mime");
    expect(speciesDisplayName("ho-oh")).toBe("Ho-Oh");
    expect(speciesDisplayName("nidoran-f")).toBe("Nidoran♀");
    expect(speciesDisplayName("flabebe")).toBe("Flabébé");
    expect(speciesDisplayName("type-null")).toBe("Type: Null");
    expect(speciesDisplayName("deoxys-normal")).toBe("Deoxys");
    expect(moveDisplayName("u-turn")).toBe("U-turn");
    expect(moveDisplayName("will-o-wisp")).toBe("Will-O-Wisp");
  });

  it("title-cases names with nothing to override", () => {
    expect(speciesDisplayName("bulbasaur")).toBe("Bulbasaur");
    expect(speciesDisplayName("tapu-koko")).toBe("Tapu Koko");
    expect(moveDisplayName("tackle")).toBe("Tackle");
    expect(moveDisplayName("vine-whip")).toBe("Vine Whip");
  });
});
