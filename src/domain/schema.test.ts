import { describe, expect, test } from "vitest";

import { isExportBundle, type ExportBundle } from "@/domain/schema";

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
