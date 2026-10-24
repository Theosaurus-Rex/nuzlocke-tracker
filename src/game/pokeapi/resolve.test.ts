import { describe, expect, it } from "vitest";

import { moveFixtures, pokemonFixtures, speciesIndexFixture } from "@/test/pokeapi-fixtures";

import type { IndexEntry } from "./model";
import { toMove, toSpecies, toSpeciesIndex } from "./map";
import {
  abilityDisplayName,
  findByName,
  itemDisplayName,
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

const named = (...names: string[]): IndexEntry[] => names.map((name, i) => ({ id: i + 1, name }));

const acidMoves = named("acid", "acid-spray", "tackle");
const forms = named("zorua", "zoroark", "zorua-hisui");
const substrings = named("raichu", "pikachu", "chuchu");
const ranked = named("murkray", "frayed", "mega-ray", "rayquaza", "ray");
const mews = named("mewtwo", "mew");

describe("searchIndex", () => {
  it("prefix-matches case-insensitively and treats spaces as hyphens", () => {
    expect(searchIndex(index, "Mimikyu D", speciesDisplayName).map((e) => e.name)).toEqual([
      "mimikyu-disguised",
    ]);
  });

  it("keeps dex order within a tier", () => {
    expect(searchIndex(index, "g", speciesDisplayName).map((e) => e.name)).toEqual([
      "geodude",
      "gyarados",
      "pidgey",
      "mimikyu-disguised",
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

  it("finds a name from the start of any word in it", () => {
    expect(searchIndex(punctuated, "mime", speciesDisplayName).map((e) => e.name)).toEqual([
      "mr-mime",
    ]);
    expect(searchIndex(acidMoves, "spray", moveDisplayName).map((e) => e.name)).toEqual([
      "acid-spray",
    ]);
  });

  it("finds a regional form by its full displayed name or its base word", () => {
    expect(searchIndex(forms, "hisuian zorua", speciesDisplayName).map((e) => e.name)).toEqual([
      "zorua-hisui",
    ]);
    expect(searchIndex(forms, "zorua", speciesDisplayName).map((e) => e.name)).toEqual([
      "zorua",
      "zorua-hisui",
    ]);
  });

  it("finds a name from the middle of a word", () => {
    expect(searchIndex(substrings, "chu", speciesDisplayName).map((e) => e.name)).toEqual([
      "chuchu",
      "raichu",
      "pikachu",
    ]);
  });

  it("ranks exact, then name prefix, then word start, then substring", () => {
    expect(searchIndex(ranked, "ray", speciesDisplayName).map((e) => e.name)).toEqual([
      "ray",
      "rayquaza",
      "mega-ray",
      "murkray",
      "frayed",
    ]);
  });

  it("puts an exact name ahead of a longer prefix match", () => {
    expect(searchIndex(mews, "mew", speciesDisplayName).map((e) => e.name)).toEqual([
      "mew",
      "mewtwo",
    ]);
  });

  it("keeps index order within a tier", () => {
    expect(searchIndex(mews, "m", speciesDisplayName).map((e) => e.name)).toEqual([
      "mewtwo",
      "mew",
    ]);
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

describe("abilityDisplayName", () => {
  it("spells a PokéAPI name in title case", () => {
    expect(abilityDisplayName("water-absorb")).toBe("Water Absorb");
    expect(abilityDisplayName("chlorophyll")).toBe("Chlorophyll");
  });
});

describe("itemDisplayName", () => {
  it("spells a PokéAPI name in title case", () => {
    expect(itemDisplayName("miracle-seed")).toBe("Miracle Seed");
  });

  it("spells items title case gets wrong", () => {
    expect(itemDisplayName("never-melt-ice")).toBe("Never-Melt Ice");
    expect(itemDisplayName("kings-rock")).toBe("King’s Rock");
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

  it("prefixes regional forms with their region", () => {
    expect(speciesDisplayName("sandshrew-alola")).toBe("Alolan Sandshrew");
    expect(speciesDisplayName("mr-mime-galar")).toBe("Galarian Mr. Mime");
    expect(speciesDisplayName("farfetchd-galar")).toBe("Galarian Farfetch'd");
    expect(speciesDisplayName("darmanitan-galar-standard")).toBe("Galarian Darmanitan");
  });

  it("prefers an explicit name over the regional prefix", () => {
    expect(speciesDisplayName("tauros-paldea-blaze-breed")).toBe("Paldean Tauros (Blaze Breed)");
  });

  it("finds a regional form by its displayed name", () => {
    expect(findByName(index, "Alolan Sandshrew", speciesDisplayName)?.name).toBe("sandshrew-alola");
    expect(searchIndex(index, "alolan", speciesDisplayName).map((e) => e.name)).toEqual([
      "sandshrew-alola",
      "sandslash-alola",
    ]);
    expect(searchIndex(index, "sandshrew", speciesDisplayName).map((e) => e.name)).toEqual([
      "sandshrew",
      "sandshrew-alola",
    ]);
  });

  it("title-cases names with nothing to override", () => {
    expect(speciesDisplayName("bulbasaur")).toBe("Bulbasaur");
    expect(speciesDisplayName("tapu-koko")).toBe("Tapu Koko");
    expect(moveDisplayName("tackle")).toBe("Tackle");
    expect(moveDisplayName("vine-whip")).toBe("Vine Whip");
  });
});
