import { describe, expect, it } from "vitest";

import { monFields } from "./fields";

describe("monFields", () => {
  it("gives generation 1 none of the five fields", () => {
    expect(monFields({ generation: 1 })).toEqual({
      nature: false,
      ability: false,
      heldItem: false,
      gender: false,
      shiny: false,
    });
  });

  it("gives generation 2 gender, held item and shiny only", () => {
    expect(monFields({ generation: 2 })).toEqual({
      nature: false,
      ability: false,
      heldItem: true,
      gender: true,
      shiny: true,
    });
  });

  it.each([3, 4, 7])("gives generation %i all five fields", (generation) => {
    expect(monFields({ generation })).toEqual({
      nature: true,
      ability: true,
      heldItem: true,
      gender: true,
      shiny: true,
    });
  });

  it("lets a game switch fields off, as Let's Go does", () => {
    expect(monFields({ generation: 7, fields: { ability: false, heldItem: false } })).toEqual({
      nature: true,
      ability: false,
      heldItem: false,
      gender: true,
      shiny: true,
    });
  });

  it("lets a game switch a field on that its generation lacks", () => {
    expect(monFields({ generation: 1, fields: { shiny: true } }).shiny).toBe(true);
    expect(monFields({ generation: 1, fields: { shiny: true } }).nature).toBe(false);
  });
});
