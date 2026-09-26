import { describe, expect, test } from "vitest";

import { isExportBundle, migrateBundle, SCHEMA_VERSION, type ExportBundle } from "@/domain/schema";
import type { Mon } from "@/domain/types";

function validBundle(): ExportBundle {
  return {
    schemaVersion: 1,
    exportedAt: "2026-09-17T00:00:00.000Z",
    runs: [],
    routes: [],
    encounters: [],
    mons: [],
    deaths: [],
    fights: [],
  };
}

describe("isExportBundle", () => {
  test("accepts well-formed envelopes, with populated or all-empty tables", () => {
    expect(isExportBundle({ ...validBundle(), runs: [{ id: "run-1" }] })).toBe(true);
    expect(isExportBundle(validBundle())).toBe(true);
  });

  test.each<[string, unknown]>([
    ["null", null],
    ["a string", "not a bundle"],
    ["a number", 42],
    ["undefined", undefined],
    [
      "a missing table key",
      (() => {
        const bundle: Record<string, unknown> = { ...validBundle() };
        delete bundle.fights;
        return bundle;
      })(),
    ],
    ["schemaVersion of the wrong type", { ...validBundle(), schemaVersion: "1" }],
    ["exportedAt of the wrong type", { ...validBundle(), exportedAt: 12345 }],
    ["a table key that is not an array", { ...validBundle(), mons: { id: "not-an-array" } }],
    ["a table key that is null instead of an array", { ...validBundle(), deaths: null }],
  ])("rejects %s", (_label, value) => {
    expect(isExportBundle(value)).toBe(false);
  });
});

describe("migrateBundle — v1 to v2", () => {
  /** A v1 mon, cast past the current `Mon` type, since a real v1 export has no `shiny` key at
   * all: the field did not exist yet. */
  function v1MonWithoutShiny(overrides: Partial<Omit<Mon, "shiny">> = {}): Mon {
    return {
      id: "mon-1",
      runId: "run-1",
      encounterId: null,
      speciesId: "chikorita",
      speciesIdCaught: "chikorita",
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
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
      ...overrides,
    } as unknown as Mon;
  }

  function v1Bundle(mons: Mon[]): ExportBundle {
    return {
      schemaVersion: 1,
      exportedAt: "2026-09-17T00:00:00.000Z",
      runs: [],
      routes: [],
      encounters: [],
      mons,
      deaths: [],
      fights: [],
    };
  }

  test("brings a v1 bundle up to the current schema version", () => {
    const result = migrateBundle(v1Bundle([v1MonWithoutShiny()]));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.bundle.schemaVersion).toBe(SCHEMA_VERSION);
    }
  });

  test("gives every mon missing shiny a value of false, not undefined", () => {
    const result = migrateBundle(v1Bundle([v1MonWithoutShiny()]));

    expect(result.ok).toBe(true);
    if (result.ok) {
      const [mon] = result.bundle.mons;
      expect(mon?.shiny).toBe(false);
      expect(mon !== undefined && "shiny" in mon).toBe(true);
    }
  });

  test("leaves every other mon field untouched", () => {
    const mon = v1MonWithoutShiny({ nickname: "Sprig", level: 18 });
    const result = migrateBundle(v1Bundle([mon]));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.bundle.mons[0]).toMatchObject({ nickname: "Sprig", level: 18 });
    }
  });
});
