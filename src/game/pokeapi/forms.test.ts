import { describe, expect, it } from "vitest";

import { baseSpeciesId, expandNextStages, regionalForm } from "./forms";
import type { IndexEntry } from "./model";

const index: IndexEntry[] = [
  { id: 27, name: "sandshrew" },
  { id: 28, name: "sandslash" },
  { id: 52, name: "meowth" },
  { id: 53, name: "persian" },
  { id: 128, name: "tauros" },
  { id: 215, name: "sneasel" },
  { id: 461, name: "weavile" },
  { id: 903, name: "sneasler" },
  { id: 555, name: "darmanitan-standard" },
  { id: 122, name: "mr-mime" },
  { id: 863, name: "perrserker" },
  { id: 10101, name: "sandshrew-alola" },
  { id: 10102, name: "sandslash-alola" },
  { id: 10107, name: "meowth-galar" },
  { id: 10177, name: "darmanitan-galar-standard" },
  { id: 10168, name: "sneasel-hisui" },
  { id: 10161, name: "mr-mime-galar" },
];

function entry(name: string): IndexEntry {
  const found = index.find((e) => e.name === name);
  if (found === undefined) throw new Error(name);
  return found;
}

function names(entries: IndexEntry[]): string[] {
  return entries.map((e) => e.name);
}

describe("regionalForm", () => {
  it("reads the base species and region", () => {
    expect(regionalForm("sandshrew-alola")).toEqual({ base: "sandshrew", region: "alola" });
    expect(regionalForm("mr-mime-galar")).toEqual({ base: "mr-mime", region: "galar" });
    expect(regionalForm("darmanitan-galar-standard")).toEqual({
      base: "darmanitan",
      region: "galar",
    });
    expect(regionalForm("tauros-paldea-aqua-breed")).toEqual({ base: "tauros", region: "paldea" });
  });

  it("is null for names that are not regional", () => {
    expect(regionalForm("sandshrew")).toBeNull();
    expect(regionalForm("venusaur-mega")).toBeNull();
  });

  it("is null for totem, cap and Zen Mode forms", () => {
    expect(regionalForm("raticate-totem-alola")).toBeNull();
    expect(regionalForm("pikachu-alola-cap")).toBeNull();
    expect(regionalForm("darmanitan-galar-zen")).toBeNull();
  });
});

describe("baseSpeciesId", () => {
  it("is the entry's own id for a default form", () => {
    expect(baseSpeciesId(index, entry("sandshrew"))).toBe(27);
  });

  it("finds the base of a regional form by exact name", () => {
    expect(baseSpeciesId(index, entry("sandshrew-alola"))).toBe(27);
    expect(baseSpeciesId(index, entry("mr-mime-galar"))).toBe(122);
  });

  it("falls back to a suffixed default name", () => {
    expect(baseSpeciesId(index, entry("darmanitan-galar-standard"))).toBe(555);
  });

  it("is undefined when the base is not in the index", () => {
    expect(baseSpeciesId([], { id: 10101, name: "sandshrew-alola" })).toBeUndefined();
  });
});

describe("expandNextStages", () => {
  it("keeps a regional form in its own region", () => {
    const next = expandNextStages(index, entry("sandshrew-alola"), [28]);
    expect(names(next)).toEqual(["sandslash-alola"]);
  });

  it("falls back to the base stage when the region has no form of it", () => {
    expect(names(expandNextStages(index, entry("meowth-galar"), [863]))).toEqual(["perrserker"]);
  });

  it("offers every stage of a Hisuian form's region or the base", () => {
    const next = expandNextStages(index, entry("sneasel-hisui"), [461, 903]);
    expect(names(next)).toEqual(["weavile", "sneasler"]);
  });

  it("offers a base species' stages with their regional forms", () => {
    const next = expandNextStages(index, entry("sandshrew"), [28]);
    expect(names(next)).toEqual(["sandslash", "sandslash-alola"]);
  });
});
