import { describe, expect, test } from "vitest";

import { SCHEMA_VERSION, isExportBundle, type ExportBundle } from "@/domain/schema";

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

describe("SCHEMA_VERSION", () => {
  test("is 1, per hard rule 4", () => {
    expect(SCHEMA_VERSION).toBe(1);
  });
});

describe("isExportBundle", () => {
  test("accepts a well-formed envelope with populated tables", () => {
    const bundle: unknown = {
      ...validBundle(),
      runs: [{ id: "run-1" }],
    };
    expect(isExportBundle(bundle)).toBe(true);
  });

  test("accepts a well-formed envelope with all-empty tables", () => {
    expect(isExportBundle(validBundle())).toBe(true);
  });

  test("rejects null", () => {
    expect(isExportBundle(null)).toBe(false);
  });

  test("rejects non-object primitives", () => {
    expect(isExportBundle("not a bundle")).toBe(false);
    expect(isExportBundle(42)).toBe(false);
    expect(isExportBundle(undefined)).toBe(false);
  });

  test("rejects a missing table key", () => {
    const bundle: Record<string, unknown> = { ...validBundle() };
    delete bundle.fights;
    expect(isExportBundle(bundle)).toBe(false);
  });

  test("rejects schemaVersion of the wrong type", () => {
    const bundle = { ...validBundle(), schemaVersion: "1" };
    expect(isExportBundle(bundle)).toBe(false);
  });

  test("rejects exportedAt of the wrong type", () => {
    const bundle = { ...validBundle(), exportedAt: 12345 };
    expect(isExportBundle(bundle)).toBe(false);
  });

  test("rejects a table key that is not an array", () => {
    const bundle = { ...validBundle(), mons: { id: "not-an-array" } };
    expect(isExportBundle(bundle)).toBe(false);
  });

  test("rejects a table key that is null instead of an array", () => {
    const bundle = { ...validBundle(), deaths: null };
    expect(isExportBundle(bundle)).toBe(false);
  });
});
