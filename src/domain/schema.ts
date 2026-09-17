/**
 * Export bundle shape and schema version (hard rule 4). See spec section 6.
 */

import type { Run, Route, Encounter, Mon, Death, Fight } from "./types";

/** Bumped whenever a table's shape changes in a way that breaks import of an older export. */
export const SCHEMA_VERSION = 1;

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
 * Shallow runtime guard for untrusted JSON (file picker imports at M6). Checks the envelope
 * shape only — `schemaVersion` is a number, `exportedAt` is a string, and each table key holds an
 * array. It does not validate individual row shapes.
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

// ---------------------------------------------------------------------------
// Migration seam (PER-10)
// ---------------------------------------------------------------------------

/** Upgrades a bundle written at one schema version to the next. Pure — no I/O. */
export type Migration = (bundle: ExportBundle) => ExportBundle;

/**
 * Keyed by the FROM version. Empty today: `SCHEMA_VERSION` has never moved. The seam exists so
 * that when it does, `migrateBundle` below does not change — only this map grows an entry.
 */
export const migrations: Record<number, Migration> = {};

/**
 * Walks `migrations` from `bundle.schemaVersion` up to `SCHEMA_VERSION`, one step at a time.
 * Returns a result rather than throwing so callers (`parseBundle`) can refuse a file with a clear
 * message instead of importing a partially-upgraded bundle. Never called with a bundle whose
 * `schemaVersion` is already `SCHEMA_VERSION` or greater — callers check that first.
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
