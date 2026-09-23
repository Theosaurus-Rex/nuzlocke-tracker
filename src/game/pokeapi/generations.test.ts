import { describe, expect, it } from "vitest";

import { isType } from "@/game/types";

import { GENERATION_NUMBER, VERSION_GROUP_GENERATION } from "./generations";

describe("isType", () => {
  it("accepts a known type and PokéAPI's unknown placeholder", () => {
    expect(isType("fairy")).toBe(true);
    expect(isType("unknown")).toBe(true);
  });

  it("rejects a type the badge has no colour for", () => {
    expect(isType("stellar")).toBe(false);
  });
});

describe("generation tables", () => {
  it("maps HeartGold's version group to gen 4", () => {
    expect(VERSION_GROUP_GENERATION["heartgold-soulsilver"]).toBe(4);
  });

  it("maps x-y to gen 6, which is where Vine Whip's history turns over", () => {
    expect(VERSION_GROUP_GENERATION["x-y"]).toBe(6);
  });

  it("maps generation names to numbers", () => {
    expect(GENERATION_NUMBER["generation-v"]).toBe(5);
    expect(GENERATION_NUMBER["generation-ix"]).toBe(9);
  });

  it("returns undefined for a version group it has not heard of", () => {
    expect(VERSION_GROUP_GENERATION["not-a-game"]).toBeUndefined();
  });
});
