import { describe, expect, test } from "vitest";

import {
  validateAmendment,
  validateCatch,
  validateEncounter,
  validateMiss,
} from "@/domain/encounter-validation";
import { DEFAULT_RULES } from "@/domain/rules";
import type { CatchDetails, MonAmendments } from "@/domain/transitions";
import type { Rules } from "@/domain/types";

function makeDetails(overrides: Partial<CatchDetails> = {}): CatchDetails {
  return {
    speciesId: "chikorita",
    levelCaught: 6,
    level: 18,
    placement: "party",
    nickname: null,
    gender: null,
    nature: null,
    ability: null,
    heldItem: null,
    moves: [],
    ...overrides,
  };
}

const rulesWithoutNicknames: Rules = { ...DEFAULT_RULES, nicknamesRequired: false };
const rulesRequiringNicknames: Rules = { ...DEFAULT_RULES, nicknamesRequired: true };

describe("validateCatch", () => {
  test("returns no errors for valid details", () => {
    const errors = validateCatch({ details: makeDetails(), rules: rulesWithoutNicknames });
    expect(errors).toEqual({});
  });

  test("a level equal to levelCaught is valid", () => {
    const details = makeDetails({ levelCaught: 12, level: 12 });
    const errors = validateCatch({ details, rules: rulesWithoutNicknames });
    expect(errors.level).toBeUndefined();
    expect(errors.levelCaught).toBeUndefined();
  });

  test("rejects a blank speciesId", () => {
    const details = makeDetails({ speciesId: "" });
    const errors = validateCatch({ details, rules: rulesWithoutNicknames });
    expect(errors.speciesId).toBeDefined();
  });

  test("rejects a whitespace-only speciesId", () => {
    const details = makeDetails({ speciesId: "   " });
    const errors = validateCatch({ details, rules: rulesWithoutNicknames });
    expect(errors.speciesId).toBeDefined();
  });

  test.each([0, 101, 1.5, -3])("rejects an out-of-range levelCaught: %s", (level) => {
    const details = makeDetails({ levelCaught: level, level: Math.max(level, 1) });
    const errors = validateCatch({ details, rules: rulesWithoutNicknames });
    expect(errors.levelCaught).toBeDefined();
  });

  test.each([0, 101, 1.5, -3])("rejects an out-of-range level: %s", (level) => {
    const details = makeDetails({ levelCaught: 1, level });
    const errors = validateCatch({ details, rules: rulesWithoutNicknames });
    expect(errors.level).toBeDefined();
  });

  test("accepts the boundary levels 1 and 100", () => {
    const low = validateCatch({
      details: makeDetails({ levelCaught: 1, level: 1 }),
      rules: rulesWithoutNicknames,
    });
    const high = validateCatch({
      details: makeDetails({ levelCaught: 100, level: 100 }),
      rules: rulesWithoutNicknames,
    });
    expect(low.levelCaught).toBeUndefined();
    expect(low.level).toBeUndefined();
    expect(high.levelCaught).toBeUndefined();
    expect(high.level).toBeUndefined();
  });

  test("rejects a level below levelCaught", () => {
    const details = makeDetails({ levelCaught: 20, level: 19 });
    const errors = validateCatch({ details, rules: rulesWithoutNicknames });
    expect(errors.level).toBeDefined();
  });

  test("nickname is optional when nicknamesRequired is off", () => {
    const details = makeDetails({ nickname: null });
    const errors = validateCatch({ details, rules: rulesWithoutNicknames });
    expect(errors.nickname).toBeUndefined();
  });

  test("a blank nickname is fine when nicknamesRequired is off", () => {
    const details = makeDetails({ nickname: "" });
    const errors = validateCatch({ details, rules: rulesWithoutNicknames });
    expect(errors.nickname).toBeUndefined();
  });

  test("nickname is required when nicknamesRequired is on", () => {
    const details = makeDetails({ nickname: null });
    const errors = validateCatch({ details, rules: rulesRequiringNicknames });
    expect(errors.nickname).toBeDefined();
  });

  test("an empty string nickname fails when nicknamesRequired is on", () => {
    const details = makeDetails({ nickname: "" });
    const errors = validateCatch({ details, rules: rulesRequiringNicknames });
    expect(errors.nickname).toBeDefined();
  });

  test("a whitespace-only nickname fails when nicknamesRequired is on", () => {
    const details = makeDetails({ nickname: "   " });
    const errors = validateCatch({ details, rules: rulesRequiringNicknames });
    expect(errors.nickname).toBeDefined();
  });

  test("a real nickname satisfies nicknamesRequired", () => {
    const details = makeDetails({ nickname: "Sprout" });
    const errors = validateCatch({ details, rules: rulesRequiringNicknames });
    expect(errors.nickname).toBeUndefined();
  });
});

describe("validateMiss", () => {
  test("requires a species", () => {
    expect(validateMiss({ speciesId: "" }).speciesId).toBeDefined();
  });

  test("rejects a whitespace-only species", () => {
    expect(validateMiss({ speciesId: "   " }).speciesId).toBeDefined();
  });

  test("accepts a named species", () => {
    expect(validateMiss({ speciesId: "geodude" })).toEqual({});
  });
});

function makeAmendments(overrides: Partial<MonAmendments> = {}): MonAmendments {
  return {
    nickname: null,
    gender: null,
    level: 18,
    nature: null,
    ability: null,
    heldItem: null,
    moves: [],
    ...overrides,
  };
}

describe("validateAmendment", () => {
  test("returns no errors for a valid amendment", () => {
    const errors = validateAmendment({
      amendments: makeAmendments(),
      levelCaught: 6,
      rules: rulesWithoutNicknames,
    });
    expect(errors).toEqual({});
  });

  test("a level equal to levelCaught is valid", () => {
    const errors = validateAmendment({
      amendments: makeAmendments({ level: 12 }),
      levelCaught: 12,
      rules: rulesWithoutNicknames,
    });
    expect(errors.level).toBeUndefined();
  });

  test.each([0, 101, 1.5, -3])("rejects an out-of-range level: %s", (level) => {
    const errors = validateAmendment({
      amendments: makeAmendments({ level }),
      levelCaught: 1,
      rules: rulesWithoutNicknames,
    });
    expect(errors.level).toBeDefined();
  });

  test("rejects a level below levelCaught", () => {
    const errors = validateAmendment({
      amendments: makeAmendments({ level: 19 }),
      levelCaught: 20,
      rules: rulesWithoutNicknames,
    });
    expect(errors.level).toBeDefined();
  });

  test("nickname is optional when nicknamesRequired is off", () => {
    const errors = validateAmendment({
      amendments: makeAmendments({ nickname: null }),
      levelCaught: 6,
      rules: rulesWithoutNicknames,
    });
    expect(errors.nickname).toBeUndefined();
  });

  test("nickname is required when nicknamesRequired is on", () => {
    const errors = validateAmendment({
      amendments: makeAmendments({ nickname: null }),
      levelCaught: 6,
      rules: rulesRequiringNicknames,
    });
    expect(errors.nickname).toBeDefined();
  });

  test("a real nickname satisfies nicknamesRequired", () => {
    const errors = validateAmendment({
      amendments: makeAmendments({ nickname: "Sprout" }),
      levelCaught: 6,
      rules: rulesRequiringNicknames,
    });
    expect(errors.nickname).toBeUndefined();
  });

  test("does not validate nature, ability or heldItem", () => {
    const errors = validateAmendment({
      amendments: makeAmendments({ nature: "", ability: "", heldItem: "" }),
      levelCaught: 6,
      rules: rulesWithoutNicknames,
    });
    expect(errors).toEqual({});
  });
});

describe("validateEncounter", () => {
  const noRules = rulesWithoutNicknames;

  test("applies the catch rules when the outcome is caught", () => {
    const details = makeDetails({ speciesId: "", levelCaught: 0 });
    const errors = validateEncounter({ outcome: "caught", details, rules: noRules });
    expect(errors.speciesId).toBeDefined();
    expect(errors.levelCaught).toBeDefined();
  });

  test("requires only a species when the outcome is missed, ignoring the level fields", () => {
    const details = makeDetails({ speciesId: "", levelCaught: 0, level: 0 });
    const errors = validateEncounter({ outcome: "missed", details, rules: noRules });
    expect(errors.speciesId).toBeDefined();
    expect(errors.levelCaught).toBeUndefined();
    expect(errors.level).toBeUndefined();
  });

  test("asks nothing of a skipped encounter, even with no species", () => {
    const details = makeDetails({ speciesId: "", levelCaught: 0, level: 0 });
    expect(validateEncounter({ outcome: "skipped", details, rules: noRules })).toEqual({});
  });

  test("does not require a nickname on a missed encounter when the clause is on", () => {
    const details = makeDetails({ speciesId: "geodude", nickname: null });
    const errors = validateEncounter({
      outcome: "missed",
      details,
      rules: rulesRequiringNicknames,
    });
    expect(errors).toEqual({});
  });
});
