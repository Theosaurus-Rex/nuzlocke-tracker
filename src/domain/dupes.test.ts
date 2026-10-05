import { describe, expect, it } from "vitest";

import { findDupe } from "./dupes";
import { makeMon } from "@/test/factories";

const LINE = ["geodude", "graveler", "golem"];
const GEODUDE = { speciesId: "geodude", speciesIdCaught: "geodude" };

describe("findDupe", () => {
  it("finds a mon of the same species", () => {
    const mon = makeMon(GEODUDE);
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
    const mon = makeMon({ ...GEODUDE, status: "dead", partySlot: null });
    expect(findDupe({ line: LINE, mons: [mon] })).toBe(mon);
  });

  it("returns nothing when no mon is in the line", () => {
    const mon = makeMon({ speciesId: "pidgey", speciesIdCaught: "pidgey" });
    expect(findDupe({ line: LINE, mons: [mon] })).toBeUndefined();
  });

  it("returns nothing for an empty line", () => {
    expect(findDupe({ line: [], mons: [makeMon(GEODUDE)] })).toBeUndefined();
  });
});
