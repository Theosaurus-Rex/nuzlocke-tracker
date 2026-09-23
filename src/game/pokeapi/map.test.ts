import { describe, expect, it } from "vitest";

import {
  moveFixtures,
  moveIndexFixture,
  pokemonFixtures,
  speciesIndexFixture,
} from "@/test/pokeapi-fixtures";

import { toMove, toMoveIndex, toSpecies, toSpeciesIndex, type RawMove } from "./map";

describe("toSpeciesIndex", () => {
  it("keeps default forms only, in dex order, with ids from the url", () => {
    expect(toSpeciesIndex(speciesIndexFixture)).toEqual([
      { id: 1, name: "bulbasaur" },
      { id: 16, name: "pidgey" },
      { id: 35, name: "clefairy" },
      { id: 74, name: "geodude" },
      { id: 130, name: "gyarados" },
      { id: 778, name: "mimikyu-disguised" },
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
