/** Export bundle shape and schema version. */

import type { Run, Route, Encounter, Mon, Death, Fight } from "./types";

/** Bumped whenever a table's shape changes in a way that breaks import of an older export. */
export const SCHEMA_VERSION = 2;

export interface ExportBundle {
  schemaVersion: number;
  exportedAt: string;
  runs: Run[];
  routes: Route[];
  encounters: Encounter[];
  mons: Mon[];
  deaths: Death[];
  fights: Fight[];
}

const EXPORT_BUNDLE_TABLE_KEYS = [
  "runs",
  "routes",
  "encounters",
  "mons",
  "deaths",
  "fights",
] as const;

/**
 * Runtime guard for untrusted JSON. Checks the envelope shape only, not individual row shapes.
 */
export function isExportBundle(value: unknown): value is ExportBundle {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.schemaVersion !== "number") {
    return false;
  }

  if (typeof candidate.exportedAt !== "string") {
    return false;
  }

  return EXPORT_BUNDLE_TABLE_KEYS.every((key) => Array.isArray(candidate[key]));
}

/** Upgrades a bundle written at one schema version to the next. Pure, no I/O. */
export type Migration = (bundle: ExportBundle) => ExportBundle;

/** Keyed by the FROM version. */
export const migrations: Record<number, Migration> = {
  // v1 predates Mon.shiny, so every mon in a v1 bundle is missing the field, not merely false.
  1: (bundle) => ({
    ...bundle,
    schemaVersion: 2,
    mons: bundle.mons.map((mon) => ({ ...mon, shiny: false })),
  }),
};

/**
 * Walks `migrations` one step at a time. Returns a result instead of throwing, so callers can
 * refuse a file with a message rather than import a partially-upgraded bundle.
 */
export function migrateBundle(
  bundle: ExportBundle,
): { ok: true; bundle: ExportBundle } | { ok: false; error: string } {
  let current = bundle;

  while (current.schemaVersion < SCHEMA_VERSION) {
    const step = migrations[current.schemaVersion];
    if (!step) {
      return {
        ok: false,
        error:
          `No migration path from schema version ${current.schemaVersion} to ${SCHEMA_VERSION}. ` +
          "This file cannot be imported.",
      };
    }
    current = step(current);
  }

  return { ok: true, bundle: current };
}
