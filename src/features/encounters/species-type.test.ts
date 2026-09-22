/**
 * Covers `resolveSpeciesType` directly: the generation-aware type resolution behind the species
 * field's inline badge. Mirrors `route-presentation.test.tsx`'s `typeForRow` coverage, since the
 * two must not drift on the same underlying rule.
 */

import { describe, expect, it } from "vitest";

import { resolveSpeciesType } from "./species-type";

const HEARTGOLD_GENERATION = 4;
const GEN6_GENERATION = 6;

describe("resolveSpeciesType", () => {
  it("resolves Clefairy to Normal at generation 4, before the Gen 6 Fairy retcon", () => {
    expect(resolveSpeciesType("clefairy", HEARTGOLD_GENERATION)).toBe("normal");
  });

  it("resolves Clefairy to Fairy from generation 6 on", () => {
    expect(resolveSpeciesType("clefairy", GEN6_GENERATION)).toBe("fairy");
  });

  it("returns the primary type only, for a dual-type species", () => {
    expect(resolveSpeciesType("gyarados", HEARTGOLD_GENERATION)).toBe("water");
  });

  it("returns null for a species the pokedex does not know", () => {
    expect(resolveSpeciesType("not-a-real-mon", HEARTGOLD_GENERATION)).toBeNull();
  });

  it("returns null for an empty species id", () => {
    expect(resolveSpeciesType("", HEARTGOLD_GENERATION)).toBeNull();
  });
});
