import { describe, expect, it } from "vitest";

import { isType } from "@/game/types";

describe("isType", () => {
  it("accepts a known type and PokéAPI's unknown placeholder", () => {
    expect(isType("fairy")).toBe(true);
    expect(isType("unknown")).toBe(true);
  });

  it("rejects a type the badge has no colour for", () => {
    expect(isType("stellar")).toBe(false);
  });
});
