/** Export bundle shape and schema version. */

import type { Run, Route, Encounter, Mon, Death, Fight } from "./types";

/** Bumped whenever a table's shape changes in a way that breaks import of an older export. */
export const SCHEMA_VERSION = 4;

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
