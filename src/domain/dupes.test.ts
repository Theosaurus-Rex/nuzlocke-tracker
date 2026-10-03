import { describe, expect, it } from "vitest";

import { findDupe } from "./dupes";
import type { Mon } from "./types";

const TIMESTAMP = "2026-09-17T00:00:00.000Z";

function makeMon(overrides: Partial<Mon> = {}): Mon {
  return {
    id: "mon-1",
    runId: "run-1",
    encounterId: null,
    speciesId: "geodude",
    speciesIdCaught: "geodude",
    nickname: null,
    gender: null,
    level: 5,
    levelCaught: 5,
    nature: null,
    ability: null,
    heldItem: null,
    moves: [],
    status: "party",
    partySlot: 0,
    boxOrder: null,
    caughtRouteId: null,
    shiny: false,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

const LINE = ["geodude", "graveler", "golem"];

describe("findDupe", () => {
  it("finds a mon of the same species", () => {
    const mon = makeMon();
    expect(findDupe({ line: LINE, mons: [mon] })).toBe(mon);
  });

  it("matches an evolved mon on its current species", () => {
    const mon = makeMon({ speciesId: "graveler", speciesIdCaught: "geodude" });
    expect(findDupe({ line: ["graveler"], mons: [mon] })).toBe(mon);
  });

  it("matches an evolved mon on the species it was caught as", () => {
    const mon = makeMon({ speciesId: "golem", speciesIdCaught: "geodude" });
    expect(findDupe({ line: ["geodude"], mons: [mon] })).toBe(mon);
  });

  it("counts a dead mon", () => {
    const mon = makeMon({ status: "dead", partySlot: null });
    expect(findDupe({ line: LINE, mons: [mon] })).toBe(mon);
  });

  it("returns nothing when no mon is in the line", () => {
    const mon = makeMon({ speciesId: "pidgey", speciesIdCaught: "pidgey" });
    expect(findDupe({ line: LINE, mons: [mon] })).toBeUndefined();
  });

  it("returns nothing for an empty line", () => {
    expect(findDupe({ line: [], mons: [makeMon()] })).toBeUndefined();
  });
});
