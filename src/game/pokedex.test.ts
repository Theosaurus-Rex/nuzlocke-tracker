import { describe, expect, test } from "vitest";

import { abilities } from "@/game/data/pokedex/abilities";
import { moves } from "@/game/data/pokedex/moves";
import { natures } from "@/game/data/pokedex/natures";
import { species } from "@/game/data/pokedex/species";
import {
  getEvolutions,
  getMoveByName,
  getSpecies,
  getSpeciesByName,
  moveDisplayName,
  pokedexFor,
  searchMoves,
  searchSpecies,
  speciesDisplayName,
} from "@/game/pokedex";

describe("per-generation type resolution: the Gen 6 Fairy retcons", () => {
  // Fairy was added in Gen 6. PokeAPI's past_types confirms each of these was some other type
  // through Gen 5, cross-checked against Bulbapedia's per-species type history.
  const retcons: { name: string; before: string[]; after: string[] }[] = [
    { name: "clefairy", before: ["normal"], after: ["fairy"] },
    { name: "togepi", before: ["normal"], after: ["fairy"] },
    { name: "marill", before: ["water"], after: ["water", "fairy"] },
    { name: "jigglypuff", before: ["normal"], after: ["normal", "fairy"] },
  ];

  for (const { name, before, after } of retcons) {
    test(`${name} resolves to ${before.join("/")} at generation 4`, () => {
      const s = species.find((sp) => sp.name === name);
      expect(s).toBeDefined();
      expect(pokedexFor(4).typesOf(s?.id ?? -1)).toEqual(before);
    });

    test(`${name} resolves to ${after.join("/")} at generation 6 and generation 9`, () => {
      const s = species.find((sp) => sp.name === name);
      expect(s).toBeDefined();
      expect(pokedexFor(6).typesOf(s?.id ?? -1)).toEqual(after);
      expect(pokedexFor(9).typesOf(s?.id ?? -1)).toEqual(after);
    });
  }
});

describe("per-generation type resolution: species whose type never changed (control)", () => {
  const stable: { name: string; types: string[] }[] = [
    { name: "pikachu", types: ["electric"] },
    { name: "gyarados", types: ["water", "flying"] },
  ];

  for (const { name, types } of stable) {
    test(`${name} resolves to ${types.join("/")} at every generation 1-9`, () => {
      const s = species.find((sp) => sp.name === name);
      expect(s).toBeDefined();
      for (let gen = 1; gen <= 9; gen++) {
        expect(pokedexFor(gen).typesOf(s?.id ?? -1)).toEqual(types);
      }
    });
  }
});

describe("Gen 4 guarantee, expressed as a property of resolution: no species that EXISTED at generation 4 or earlier resolves to Fairy", () => {
  // A species introduced in Gen 6+ (Sylveon, Flabebe) is legitimately Fairy at every
  // generation, since it has no earlier typing to fall back to. What this test checks is that a
  // species which existed earlier never resolves to Fairy, which is what would happen if a
  // retcon's pastTypes entry were dropped (e.g. Clefairy losing its Gen 5 entry).
  for (const gen of [1, 2, 3, 4]) {
    test(`generation ${String(gen)}`, () => {
      const fairyMons = species
        .filter((s) => s.introducedInGeneration <= gen)
        .filter((s) => pokedexFor(gen).typesOf(s.id)?.includes("fairy"));
      expect(fairyMons.map((s) => s.name)).toEqual([]);
    });
  }
});

describe("a species introduced after the target generation resolves without throwing", () => {
  test("a Gen 9 species resolves fine when targeting Gen 4 (normal for a randomiser/romhack)", () => {
    const gen9Species = species.filter((s) => s.introducedInGeneration === 9);
    expect(gen9Species.length).toBeGreaterThan(0);
    for (const s of gen9Species) {
      expect(() => pokedexFor(4).typesOf(s.id)).not.toThrow();
      expect(pokedexFor(4).typesOf(s.id)).toEqual(s.types);
    }
  });
});

describe("searchSpecies is unfiltered by generation", () => {
  test("a Gen 9 species is findable even though the run is Gen 4", () => {
    // sprigatito: introduced Gen 9, a starter with a stable, well-known name.
    const results = searchSpecies("sprigatito");
    expect(results.map((s) => s.name)).toContain("sprigatito");
    expect(results.find((s) => s.name === "sprigatito")?.introducedInGeneration).toBe(9);
  });
});

describe("per-generation move stat resolution: power/accuracy/pp/type are not present-day", () => {
  // Sources (Bulbapedia, checked against the cached PokeAPI move/{id} response used to generate
  // moves.ts):
  //   https://bulbapedia.bulbagarden.net/wiki/Vine_Whip_(move)
  //   https://bulbapedia.bulbagarden.net/wiki/Tackle_(move)
  //   https://bulbapedia.bulbagarden.net/wiki/Bite_(move)

  test("Vine Whip is power 35 / pp 15 at generation 4 — a mid-generation change, not just a generation boundary", () => {
    const vineWhip = moves.find((m) => m.name === "vine-whip");
    expect(vineWhip).toBeDefined();
    const resolved = pokedexFor(4).statsOf(vineWhip?.id ?? -1);
    expect(resolved?.power).toBe(35);
    expect(resolved?.accuracy).toBe(100);
    expect(resolved?.pp).toBe(15);
  });

  test("Vine Whip is power 45 / pp 25 at generation 9 (the present-day value, not Gen 4's)", () => {
    const vineWhip = moves.find((m) => m.name === "vine-whip");
    expect(vineWhip).toBeDefined();
    const resolved = pokedexFor(9).statsOf(vineWhip?.id ?? -1);
    expect(resolved?.power).toBe(45);
    expect(resolved?.accuracy).toBe(100);
    expect(resolved?.pp).toBe(25);
  });

  test("Tackle is power 35 / accuracy 95 at generation 4, not the modern power 40 / accuracy 100", () => {
    const tackle = moves.find((m) => m.name === "tackle");
    expect(tackle).toBeDefined();
    const resolved = pokedexFor(4).statsOf(tackle?.id ?? -1);
    expect(resolved?.power).toBe(35);
    expect(resolved?.accuracy).toBe(95);
    expect(resolved?.pp).toBe(35);
  });

  test("Bite is Dark-type (not its Gen 1 Normal type) at generation 4, with unchanged power/accuracy/pp", () => {
    const bite = moves.find((m) => m.name === "bite");
    expect(bite).toBeDefined();
    const resolved = pokedexFor(4).statsOf(bite?.id ?? -1);
    expect(resolved?.type).toBe("dark");
    expect(resolved?.power).toBe(60);
    expect(resolved?.accuracy).toBe(100);
    expect(resolved?.pp).toBe(25);
  });
});

describe("damage class is per-move, not per-type (the Gen 4 physical/special split)", () => {
  test("a physical Normal-type move exists", () => {
    const tackle = moves.find((m) => m.name === "tackle");
    expect(tackle?.type).toBe("normal");
    expect(tackle?.damageClass).toBe("physical");
  });

  test("a special Normal-type move exists", () => {
    const hyperBeam = moves.find((m) => m.name === "hyper-beam");
    expect(hyperBeam?.type).toBe("normal");
    expect(hyperBeam?.damageClass).toBe("special");
  });
});

describe("species table shape", () => {
  test("has every national dex species (1025 as of this generator run)", () => {
    expect(species.length).toBe(1025);
  });

  test("ids are contiguous from 1 to the species count", () => {
    const ids = species.map((s) => s.id).toSorted((a, b) => a - b);
    expect(ids).toEqual(Array.from({ length: species.length }, (_, i) => i + 1));
  });
});

describe("move table shape", () => {
  test("ids are contiguous from 1 to the move count (the National Move Dex, Shadow moves excluded)", () => {
    const ids = moves.map((m) => m.id).toSorted((a, b) => a - b);
    expect(ids).toEqual(Array.from({ length: moves.length }, (_, i) => i + 1));
  });

  test("every move id is unique", () => {
    expect(new Set(moves.map((m) => m.id)).size).toBe(moves.length);
  });
});

describe("evolution links resolve", () => {
  test("Chikorita -> Bayleef -> Meganium", () => {
    const chikorita = species.find((s) => s.name === "chikorita");
    const bayleef = species.find((s) => s.name === "bayleef");
    const meganium = species.find((s) => s.name === "meganium");
    expect(chikorita).toBeDefined();
    expect(bayleef).toBeDefined();
    expect(meganium).toBeDefined();

    const chikoritaEvos = getEvolutions(chikorita?.id ?? -1);
    expect(chikoritaEvos.from).toBeUndefined();
    expect(chikoritaEvos.to.map((s) => s.name)).toEqual(["bayleef"]);

    const bayleefEvos = getEvolutions(bayleef?.id ?? -1);
    expect(bayleefEvos.from?.name).toBe("chikorita");
    expect(bayleefEvos.to.map((s) => s.name)).toEqual(["meganium"]);

    const meganiumEvos = getEvolutions(meganium?.id ?? -1);
    expect(meganiumEvos.from?.name).toBe("bayleef");
    expect(meganiumEvos.to).toEqual([]);
  });

  test("Eevee has multiple evolutions", () => {
    const eevee = species.find((s) => s.name === "eevee");
    expect(eevee).toBeDefined();
    const evos = getEvolutions(eevee?.id ?? -1);
    expect(evos.to.length).toBeGreaterThan(1);
  });

  test("a species with no evolution (Tauros) returns none", () => {
    const tauros = species.find((s) => s.name === "tauros");
    expect(tauros).toBeDefined();
    const evos = getEvolutions(tauros?.id ?? -1);
    expect(evos.from).toBeUndefined();
    expect(evos.to).toEqual([]);
  });
});

describe("cross-references", () => {
  test("every ability referenced by a species exists in abilities.ts", () => {
    const abilityNames = new Set(abilities.map((a) => a.name));
    const missing = species.flatMap((s) =>
      s.abilities.filter((a) => !abilityNames.has(a.name)).map((a) => a.name),
    );
    expect(missing).toEqual([]);
  });
});

describe("natures", () => {
  test("there are exactly 25", () => {
    expect(natures.length).toBe(25);
  });

  test("exactly 5 are neutral (no stat change)", () => {
    const neutral = natures.filter((n) => n.raises === null && n.lowers === null);
    expect(neutral.length).toBe(5);
    expect(neutral.map((n) => n.name).toSorted()).toEqual(
      ["Bashful", "Docile", "Hardy", "Quirky", "Serious"].toSorted(),
    );
  });

  test("every non-neutral nature raises exactly one stat and lowers a different one", () => {
    for (const n of natures) {
      const isNeutral = n.raises === null && n.lowers === null;
      if (isNeutral) continue;
      expect(n.raises).not.toBeNull();
      expect(n.lowers).not.toBeNull();
      expect(n.raises).not.toBe(n.lowers);
    }
  });
});

describe("searchSpecies", () => {
  test("is case-insensitive", () => {
    const lower = searchSpecies("pikachu");
    const upper = searchSpecies("PIKACHU");
    const mixed = searchSpecies("PiKaChU");
    expect(lower.map((s) => s.id)).toEqual([25]);
    expect(upper.map((s) => s.id)).toEqual([25]);
    expect(mixed.map((s) => s.id)).toEqual([25]);
  });

  test("matches on prefix", () => {
    const results = searchSpecies("char");
    const names = results.map((s) => s.name);
    expect(names).toContain("charmander");
    expect(names).toContain("charmeleon");
    expect(names).toContain("charizard");
    // Prefix, not substring: "lucario" contains no "char" prefix match target.
    expect(names).not.toContain("lucario");
  });

  test("getSpecies returns undefined for an unknown id", () => {
    expect(getSpecies(999_999)).toBeUndefined();
  });
});

describe("getSpeciesByName", () => {
  test("finds a species by its stored name", () => {
    expect(getSpeciesByName("chikorita")?.id).toBe(152);
  });

  test("returns undefined for a name not in the pokedex", () => {
    expect(getSpeciesByName("not-a-real-species")).toBeUndefined();
  });
});

describe("speciesDisplayName", () => {
  test("capitalises a single-word species known to the pokedex", () => {
    expect(speciesDisplayName("chikorita")).toBe("Chikorita");
  });

  test("turns hyphens into spaces and capitalises each word", () => {
    expect(speciesDisplayName("mr-mime")).toBe("Mr Mime");
  });

  test("works on a species absent from the pokedex, without throwing or a placeholder", () => {
    expect(getSpeciesByName("totally-homebrew-mon")).toBeUndefined();
    expect(speciesDisplayName("totally-homebrew-mon")).toBe("Totally Homebrew Mon");
  });
});

describe("searchMoves", () => {
  test("is case-insensitive", () => {
    const lower = searchMoves("tackle");
    const upper = searchMoves("TACKLE");
    const mixed = searchMoves("TaCkLe");
    expect(lower.map((m) => m.name)).toEqual(["tackle"]);
    expect(upper.map((m) => m.name)).toEqual(["tackle"]);
    expect(mixed.map((m) => m.name)).toEqual(["tackle"]);
  });

  test("matches on prefix", () => {
    const results = searchMoves("razor");
    const names = results.map((m) => m.name);
    expect(names).toContain("razor-leaf");
    // Prefix, not substring: "double-edge" contains no "razor" prefix match target.
    expect(names).not.toContain("double-edge");
  });

  test("finds no match for a name not in the pokedex", () => {
    expect(searchMoves("not-a-real-move")).toEqual([]);
  });
});

describe("getMoveByName", () => {
  test("finds a move by its stored name", () => {
    expect(getMoveByName("vine-whip")?.name).toBe("vine-whip");
  });

  test("returns undefined for a name not in the pokedex", () => {
    expect(getMoveByName("not-a-real-move")).toBeUndefined();
  });
});

describe("moveDisplayName", () => {
  test("capitalises a single-word move known to the pokedex", () => {
    expect(moveDisplayName("tackle")).toBe("Tackle");
  });

  test("turns hyphens into spaces and capitalises each word", () => {
    expect(moveDisplayName("vine-whip")).toBe("Vine Whip");
  });

  test("works on a move absent from the pokedex, without throwing or a placeholder", () => {
    expect(getMoveByName("totally-homebrew-move")).toBeUndefined();
    expect(moveDisplayName("totally-homebrew-move")).toBe("Totally Homebrew Move");
  });
});
