import { describe, expect, test } from "vitest";

import { buildCause, validateDeath, type DeathFormValues } from "./death-validation";

function values(overrides: Partial<DeathFormValues> = {}): DeathFormValues {
  return {
    type: "trainer",
    speciesId: "miltank",
    level: 20,
    move: "rollout",
    trainerName: "",
    status: "poison",
    detail: "",
    ...overrides,
  };
}

describe("validateDeath", () => {
  test.each(["trainer", "wild"] as const)("%s needs a species, a level and a move", (type) => {
    expect(validateDeath(values({ type }))).toEqual({});
    expect(validateDeath(values({ type, speciesId: "" })).speciesId).toBeDefined();
    expect(validateDeath(values({ type, move: " " })).move).toBeDefined();
    expect(validateDeath(values({ type, level: Number.NaN })).level).toBeDefined();
  });

  test.each([0, -3, 101, 12.5])("rejects level %s", (level) => {
    expect(validateDeath(values({ level })).level).toBeDefined();
  });

  test.each([1, 100])("accepts level %s", (level) => {
    expect(validateDeath(values({ level }))).toEqual({});
  });

  test("a trainer cause with a blank trainer name is valid", () => {
    expect(validateDeath(values({ trainerName: "   " }))).toEqual({});
  });

  test("status needs nothing beyond its status", () => {
    const empty = values({ type: "status", speciesId: "", move: "", level: Number.NaN });
    expect(validateDeath(empty)).toEqual({});
  });

  test("other needs a non-blank detail", () => {
    expect(validateDeath(values({ type: "other", detail: "  " })).detail).toBeDefined();
    expect(validateDeath(values({ type: "other", detail: "Fell off a ledge" }))).toEqual({});
  });
});

describe("buildCause", () => {
  test("a blank trainer name saves as null with no fight", () => {
    expect(buildCause(values({ trainerName: "  " }))).toEqual({
      type: "trainer",
      fightId: null,
      trainerName: null,
      species: "miltank",
      level: 20,
      move: "rollout",
    });
  });

  test("a trainer name is trimmed", () => {
    const cause = buildCause(values({ trainerName: " Joey " }));
    expect(cause.type === "trainer" && cause.trainerName).toBe("Joey");
  });

  test("wild carries no trainer fields", () => {
    expect(buildCause(values({ type: "wild", trainerName: "Joey" }))).toEqual({
      type: "wild",
      species: "miltank",
      level: 20,
      move: "rollout",
    });
  });

  test("status and other carry only their own field", () => {
    expect(buildCause(values({ type: "status", status: "burn" }))).toEqual({
      type: "status",
      status: "burn",
    });
    expect(buildCause(values({ type: "other", detail: " ledge " }))).toEqual({
      type: "other",
      detail: "ledge",
    });
  });
});
