import { describe, expect, it } from "vitest";

import {
  evolutionChainFixtures,
  moveFixtures,
  moveIndexFixture,
  pokemonFixtures,
  speciesIndexFixture,
} from "@/test/pokeapi-fixtures";

import {
  badgeSpriteUrl,
  evolutionLine,
  nextStages,
  toMove,
  toMoveIndex,
  toSpecies,
  toSpeciesIndex,
  type RawChainLink,
  type RawEvolutionChain,
  type RawMove,
} from "./map";

describe("toSpeciesIndex", () => {
  it("keeps default and regional forms, in dex order, with ids from the url", () => {
    expect(toSpeciesIndex(speciesIndexFixture)).toEqual([
      { id: 1, name: "bulbasaur" },
      { id: 16, name: "pidgey" },
      { id: 27, name: "sandshrew" },
      { id: 28, name: "sandslash" },
      { id: 35, name: "clefairy" },
      { id: 74, name: "geodude" },
      { id: 130, name: "gyarados" },
      { id: 778, name: "mimikyu-disguised" },
      { id: 10101, name: "sandshrew-alola" },
      { id: 10102, name: "sandslash-alola" },
    ]);
  });
});

describe("toMoveIndex", () => {
  it("reads ids from the url and sorts by id", () => {
    expect(toMoveIndex(moveIndexFixture).map((m) => m.id)).toEqual([22, 33, 204, 450]);
  });
});

describe("toSpecies", () => {
  it("orders types by slot", () => {
    expect(toSpecies(pokemonFixtures.bulbasaur!).types).toEqual(["grass", "poison"]);
  });

  it("turns past_types into throughGeneration entries", () => {
    expect(toSpecies(pokemonFixtures.clefairy!).pastTypes).toEqual([
      { throughGeneration: 5, types: ["normal"] },
    ]);
  });

  it("maps a type name we do not know to unknown", () => {
    const raw = {
      ...pokemonFixtures.pidgey!,
      types: [{ slot: 1, type: { name: "stellar", url: "" } }],
    };
    expect(toSpecies(raw).types).toEqual(["unknown"]);
  });

  it("uses the Gen 8 icon when there is no Gen 7 one", () => {
    expect(toSpecies(pokemonFixtures.pidgey!).sprites.icon).toBe(
      "https://sprites.test/icon8/16.png",
    );
  });

  it("uses the Scarlet and Violet icon when there is no Gen 7 or Gen 8 one", () => {
    expect(toSpecies(pokemonFixtures.sprigatito!).sprites.icon).toBe(
      "https://sprites.test/icon9/906.png",
    );
  });

  it("reads the still sprites and prefers the Gen 7 icon", () => {
    expect(toSpecies(pokemonFixtures.chikorita!).sprites).toEqual({
      still: "https://sprites.test/still/152.png",
      stillShiny: "https://sprites.test/still/shiny/152.png",
      icon: "https://sprites.test/icon/152.png",
    });
  });

  it("maps a missing icon or shiny sprite to null", () => {
    expect(toSpecies(pokemonFixtures.clefairy!).sprites.icon).toBeNull();
    expect(toSpecies(pokemonFixtures.pidgey!).sprites.stillShiny).toBeNull();
  });

  it("maps a response with no sprites at all to nulls", () => {
    expect(toSpecies(pokemonFixtures.geodude!).sprites).toEqual({
      still: null,
      stillShiny: null,
      icon: null,
    });
  });

  it("maps sprites with no versions object to a null icon", () => {
    const raw = {
      ...pokemonFixtures.geodude!,
      sprites: { front_default: "https://sprites.test/still/74.png", front_shiny: null },
    };
    expect(toSpecies(raw).sprites.icon).toBeNull();
    expect(toSpecies(raw).sprites.still).toBe("https://sprites.test/still/74.png");
  });
});

describe("toMove", () => {
  it("shifts each version group back one generation and sorts ascending", () => {
    expect(toMove(moveFixtures["vine-whip"]!).pastValues).toEqual([
      { throughGeneration: 3, power: null, accuracy: null, pp: 10, type: null },
      { throughGeneration: 5, power: 35, accuracy: null, pp: 15, type: null },
    ]);
  });

  it("skips a history entry from a version group it does not know", () => {
    const raw: RawMove = {
      ...moveFixtures["bug-bite"]!,
      past_values: [
        {
          power: 1,
          accuracy: null,
          pp: null,
          type: null,
          version_group: { name: "future-game", url: "" },
        },
      ],
    };
    expect(toMove(raw).pastValues).toEqual([]);
  });

  it("keeps current values at the top level", () => {
    const move = toMove(moveFixtures.tackle!);
    expect(move).toMatchObject({
      id: 33,
      name: "tackle",
      type: "normal",
      power: 40,
      accuracy: 100,
      pp: 35,
    });
  });

  it("resolves a past value's type from the ref instead of dropping it", () => {
    expect(toMove(moveFixtures.charm!).pastValues).toEqual([
      { throughGeneration: 5, power: null, accuracy: null, pp: null, type: "normal" },
    ]);
  });
});

describe("nextStages", () => {
  const linear = evolutionChainFixtures["29"]!;
  const branch = evolutionChainFixtures["18"]!;

  it("returns the next stage of a linear chain", () => {
    expect(nextStages(linear, 69)).toEqual([70]);
    expect(nextStages(linear, 70)).toEqual([71]);
  });

  it("returns every branch", () => {
    expect(nextStages(branch, 44)).toEqual([45, 182]);
  });

  it("returns nothing for a final stage", () => {
    expect(nextStages(linear, 71)).toEqual([]);
  });

  it("returns nothing for a species missing from the chain", () => {
    expect(nextStages(linear, 1)).toEqual([]);
  });

  it("does not return stages beyond the next one", () => {
    expect(nextStages(branch, 43)).toEqual([44]);
  });
});

describe("nextStages gender", () => {
  const link = (id: number, genders: (number | null)[] | null): RawChainLink => ({
    species: {
      name: `s${String(id)}`,
      url: `https://pokeapi.co/api/v2/pokemon-species/${String(id)}/`,
    },
    ...(genders === null ? {} : { evolution_details: genders.map((gender) => ({ gender })) }),
    evolves_to: [],
  });
  const chainOf = (...children: RawChainLink[]): RawEvolutionChain => ({
    id: 1,
    chain: { ...link(1, null), evolves_to: children },
  });
  const kirlia = chainOf(link(2, [null]), link(3, [2]));
  const salandit = chainOf(link(2, [1]));
  const burmy = chainOf(link(2, [1]), link(3, [2]));

  it("offers a male-only stage to a male and hides it from a female", () => {
    expect(nextStages(kirlia, 1, "male")).toEqual([2, 3]);
    expect(nextStages(kirlia, 1, "female")).toEqual([2]);
  });

  it("hides a female-only stage from a male and offers it to a female", () => {
    expect(nextStages(salandit, 1, "male")).toEqual([]);
    expect(nextStages(salandit, 1, "female")).toEqual([2]);
  });

  it("splits a branch by gender", () => {
    expect(nextStages(burmy, 1, "female")).toEqual([2]);
    expect(nextStages(burmy, 1, "male")).toEqual([3]);
  });

  it("offers every stage when the gender is unknown or genderless", () => {
    expect(nextStages(burmy, 1, null)).toEqual([2, 3]);
    expect(nextStages(burmy, 1)).toEqual([2, 3]);
    expect(nextStages(burmy, 1, "genderless")).toEqual([2, 3]);
  });

  it("keeps a stage with one gendered and one ungendered method for both genders", () => {
    const mixed = chainOf(link(2, [1, null]));
    expect(nextStages(mixed, 1, "male")).toEqual([2]);
    expect(nextStages(mixed, 1, "female")).toEqual([2]);
  });

  it("keeps a stage with an empty evolution_details", () => {
    const empty = chainOf(link(2, []));
    expect(nextStages(empty, 1, "male")).toEqual([2]);
  });
});

describe("evolutionLine", () => {
  it("returns every stage of a linear chain", () => {
    expect(evolutionLine(evolutionChainFixtures["29"]!)).toEqual([69, 70, 71]);
  });

  it("returns every branch, including stages past the first", () => {
    expect(evolutionLine(evolutionChainFixtures["18"]!)).toEqual([43, 44, 45, 182]);
  });
});

describe("badgeSpriteUrl", () => {
  it("points at the badge image by number", () => {
    expect(badgeSpriteUrl(16)).toBe(
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/16.png",
    );
  });
});
