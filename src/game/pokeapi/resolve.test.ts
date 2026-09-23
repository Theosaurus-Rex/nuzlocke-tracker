import { describe, expect, it } from "vitest";

import { moveFixtures, pokemonFixtures, speciesIndexFixture } from "@/test/pokeapi-fixtures";

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
  });
});

describe("searchIndex", () => {
  it("prefix-matches case-insensitively and treats spaces as hyphens", () => {
    expect(searchIndex(index, "Mimikyu D").map((e) => e.name)).toEqual(["mimikyu-disguised"]);
  });

  it("keeps dex order", () => {
    expect(searchIndex(index, "g").map((e) => e.name)).toEqual(["geodude", "gyarados"]);
  });
});

describe("findByName", () => {
  it("finds a fully typed name however it is cased", () => {
    expect(findByName(index, "  Clefairy ")?.id).toBe(35);
  });

  it("does not match a prefix", () => {
    expect(findByName(index, "clef")).toBeUndefined();
  });
});

describe("display names", () => {
  it("title-cases hyphenated names", () => {
    expect(speciesDisplayName("mimikyu-disguised")).toBe("Mimikyu Disguised");
    expect(moveDisplayName("vine-whip")).toBe("Vine Whip");
  });
});
