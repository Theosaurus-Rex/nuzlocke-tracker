import { describe, expect, test } from "vitest";

import { abilities } from "@/game/data/pokedex/abilities";
import { learnsets } from "@/game/data/pokedex/learnsets";
import { moves } from "@/game/data/pokedex/moves";
import { natures } from "@/game/data/pokedex/natures";
import { species } from "@/game/data/pokedex/species";
import { getEvolutions, getLearnset, getSpecies, searchSpecies } from "@/game/pokedex";

describe("Gen 4 guarantee: no Fairy type anywhere", () => {
  test("no species has a Fairy type", () => {
    const fairyMons = species.filter((s) => s.types.some((t) => (t as string) === "fairy"));
    expect(fairyMons).toEqual([]);
  });

  test("no move is Fairy type", () => {
    const fairyMoves = moves.filter((m) => (m.type as string) === "fairy");
    expect(fairyMoves).toEqual([]);
  });
});

describe("Gen 4 typing spot-checks: species that changed type in later generations", () => {
  function typesOf(name: string): string[] | undefined {
    return species.find((s) => s.name === name)?.types;
  }

  test("Clefairy is Normal, not Fairy", () => {
    expect(typesOf("clefairy")).toEqual(["normal"]);
  });

  test("Togepi is Normal, not Fairy", () => {
    expect(typesOf("togepi")).toEqual(["normal"]);
  });

  test("Marill is Water, not Water/Fairy", () => {
    expect(typesOf("marill")).toEqual(["water"]);
  });
});

describe("Gen 4 typing spot-checks: species whose type never changed (control)", () => {
  function typesOf(name: string): string[] | undefined {
    return species.find((s) => s.name === name)?.types;
  }

  test("Pikachu is Electric", () => {
    expect(typesOf("pikachu")).toEqual(["electric"]);
  });

  test("Gyarados is Water/Flying", () => {
    expect(typesOf("gyarados")).toEqual(["water", "flying"]);
  });

  test("Steelix is Steel/Ground", () => {
    expect(typesOf("steelix")).toEqual(["steel", "ground"]);
  });
});

describe("species table shape", () => {
  test("has exactly 493 species", () => {
    expect(species.length).toBe(493);
  });

  test("ids are contiguous from 1 to 493", () => {
    const ids = species.map((s) => s.id).toSorted((a, b) => a - b);
    expect(ids).toEqual(Array.from({ length: 493 }, (_, i) => i + 1));
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
    const missing = species.flatMap((s) => s.abilities.filter((a) => !abilityNames.has(a)));
    expect(missing).toEqual([]);
  });

  test("every move in a learnset exists in moves.ts", () => {
    const moveIds = new Set(moves.map((m) => m.id));
    const missing = Object.values(learnsets).flatMap((rows) =>
      rows.filter((r) => !moveIds.has(r.moveId)).map((r) => r.moveId),
    );
    expect(missing).toEqual([]);
  });

  test("getLearnset resolves for a real species and is empty for an unknown id", () => {
    const chikorita = species.find((s) => s.name === "chikorita");
    expect(chikorita).toBeDefined();
    expect(getLearnset(chikorita?.id ?? -1).length).toBeGreaterThan(0);
    expect(getLearnset(999_999)).toEqual([]);
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
