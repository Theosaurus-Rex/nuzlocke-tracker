/**
 * JSON export and import (PER-10, the last M0 item). This IS the backup CLAUDE.md hard rule 5
 * requires: iOS Safari evicts script-writable storage (IndexedDB included) after 7 days without
 * interaction, and `navigator.storage.persist()` (see `./persistence.ts`) is only a heuristic
 * grant. Losing a 31-route run to eviction is the one unforgivable bug in a permadeath tracker, so
 * everything here is written to fail LOUD and NEVER partially.
 *
 * `isExportBundle` (`@/domain/schema`) checks only the envelope shape — each table key holds an
 * array. A file handed to `parseBundle` has been off the device: possibly hand-edited, possibly
 * written by a different app version. So `parseBundle` re-validates every row from scratch,
 * treating every field as `unknown` until proven otherwise, and accumulates every problem it finds
 * rather than stopping at the first — the moment a backup turns out to be bad is exactly the wrong
 * moment to report only one thing wrong with it.
 */

import { SCHEMA_VERSION, isExportBundle, migrateBundle, type ExportBundle } from "@/domain/schema";
import type { Cause, StatusCause, GameId } from "@/domain/types";

import type { StorageAdapter } from "./adapter";

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/** Thin wrapper over `adapter.exportAll()` — the seam a caller (the settings screen) depends on
 * instead of the adapter method directly, so this module is the one place export behaviour lives. */
export function exportBundle(adapter: StorageAdapter): Promise<ExportBundle> {
  return adapter.exportAll();
}

/**
 * Recursively sorts object keys (alphabetically), leaving array element order untouched. Makes
 * `serializeBundle` deterministic regardless of which adapter produced the bundle or what order
 * its rows' fields happened to be constructed in — two exports of the same data diff cleanly.
 */
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = sortKeysDeep(source[key]);
    }
    return sorted;
  }
  return value;
}

/** Pretty-printed, stable-key-order JSON. Same data in → byte-identical string out. */
export function serializeBundle(bundle: ExportBundle): string {
  return JSON.stringify(sortKeysDeep(bundle), null, 2) + "\n";
}

function defaultFilename(bundle: ExportBundle): string {
  const date = bundle.exportedAt.slice(0, 10);
  return `nuzlocke-${date}.json`;
}

/**
 * The one browser-specific function in this module: Blob + object URL + a synthetic anchor click.
 * M6 replaces this single function with a Capacitor filesystem write — nothing else in this file,
 * or any caller, needs to change.
 */
export function downloadBundle(bundle: ExportBundle, filename?: string): void {
  const json = serializeBundle(bundle);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename ?? defaultFilename(bundle);
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------------------------------------------------------------------------
// Parsing / validation
// ---------------------------------------------------------------------------

export type ParseResult = { ok: true; bundle: ExportBundle } | { ok: false; errors: string[] };

const GAME_IDS: readonly GameId[] = ["heartgold"];
const RUN_STATUSES = ["active", "finished"] as const;
const ENCOUNTER_STATUSES = ["open", "caught", "missed", "skipped"] as const;
const MON_STATUSES = ["party", "box", "dead"] as const;
const FIGHT_KINDS = ["gym", "elite_four", "champion", "rival", "custom"] as const;
const FIGHT_STATUSES = ["pending", "cleared"] as const;
const GENDERS = ["male", "female", "genderless"] as const;
const STATUS_CAUSES: readonly StatusCause[] = [
  "poison",
  "burn",
  "sandstorm",
  "hail",
  "recoil",
  "perish-song",
  "confusion",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableFiniteNumber(value: unknown): boolean {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isEnum<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

/** Row label used in every error message: prefers the row's own id, falls back to its index so a
 * row with no valid id at all still gets a locatable error. */
function rowLabel(table: string, index: number, row: unknown): string {
  const id = isRecord(row) && isNonEmptyString(row.id) ? row.id : `#${index}`;
  return `${table}[${id}]`;
}

interface TableValidationResult {
  errors: string[];
  ids: Set<string>;
}

/** Every row is validated regardless of earlier failures on the SAME row (or others) — this is
 * what "accumulate all errors" means at row level, not just across tables. */
function validateTable(
  table: string,
  rows: unknown[],
  validateRow: (label: string, row: Record<string, unknown>) => string[],
): TableValidationResult {
  const errors: string[] = [];
  const ids = new Set<string>();

  rows.forEach((row, index) => {
    const label = rowLabel(table, index, row);
    if (!isRecord(row)) {
      errors.push(`${label}: row is not an object.`);
      return;
    }
    if (isNonEmptyString(row.id)) {
      ids.add(row.id);
    } else {
      errors.push(`${label}: "id" must be a non-empty string.`);
    }
    if (!isString(row.createdAt)) {
      errors.push(`${label}: "createdAt" must be a string.`);
    }
    if (!isString(row.updatedAt)) {
      errors.push(`${label}: "updatedAt" must be a string.`);
    }
    errors.push(...validateRow(label, row));
  });

  return { errors, ids };
}

const RULES_BOOLEAN_FIELDS = [
  "dupesClause",
  "speciesClause",
  "shinyClause",
  "nicknamesRequired",
  "levelCaps",
  "setMode",
  "hardcore",
] as const;

const RANDOMISER_BOOLEAN_FIELDS = [
  "enabled",
  "wildEncounters",
  "trainers",
  "starters",
  "abilities",
  "items",
  "moves",
  "evolutions",
] as const;

function validateRules(label: string, rulesValue: unknown): string[] {
  const errors: string[] = [];

  if (!isRecord(rulesValue)) {
    errors.push(`${label}: "rules" must be an object.`);
    return errors;
  }

  for (const field of RULES_BOOLEAN_FIELDS) {
    if (!isBoolean(rulesValue[field])) {
      errors.push(`${label}: "rules.${field}" must be a boolean.`);
    }
  }
  if (!isNullableString(rulesValue.customClause)) {
    errors.push(`${label}: "rules.customClause" must be a string or null.`);
  }

  const randomiser = rulesValue.randomiser;
  if (!isRecord(randomiser)) {
    errors.push(`${label}: "rules.randomiser" must be an object.`);
  } else {
    for (const field of RANDOMISER_BOOLEAN_FIELDS) {
      if (!isBoolean(randomiser[field])) {
        errors.push(`${label}: "rules.randomiser.${field}" must be a boolean.`);
      }
    }
  }

  return errors;
}

/** Fields allowed on each `Cause` variant. Anything else present is exactly the shape a
 * hand-edited file produces (a non-trainer cause carrying a stray `fightId`, say) and must be
 * rejected, not silently ignored. */
const CAUSE_VARIANT_FIELDS: Record<Cause["type"], readonly string[]> = {
  trainer: ["type", "fightId", "trainerName", "species", "level", "move"],
  wild: ["type", "species", "level", "move"],
  status: ["type", "status"],
  other: ["type", "detail"],
};

function validateCauseExtraFields(
  label: string,
  cause: Record<string, unknown>,
  allowed: readonly string[],
): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(cause)) {
    if (!allowed.includes(key)) {
      errors.push(
        `${label}: "cause" has field "${key}" not valid for cause.type = "${String(cause.type)}".`,
      );
    }
  }
  return errors;
}

function validateCause(label: string, causeValue: unknown): string[] {
  const errors: string[] = [];

  if (!isRecord(causeValue)) {
    errors.push(`${label}: "cause" must be an object.`);
    return errors;
  }

  switch (causeValue.type) {
    case "trainer": {
      if (!isNullableString(causeValue.fightId)) {
        errors.push(`${label}: "cause.fightId" must be a string or null.`);
      }
      if (!isNullableString(causeValue.trainerName)) {
        errors.push(`${label}: "cause.trainerName" must be a string or null.`);
      }
      if (!isNonEmptyString(causeValue.species)) {
        errors.push(`${label}: "cause.species" must be a non-empty string.`);
      }
      if (!isFiniteNumber(causeValue.level)) {
        errors.push(`${label}: "cause.level" must be a number.`);
      }
      if (!isNonEmptyString(causeValue.move)) {
        errors.push(`${label}: "cause.move" must be a non-empty string.`);
      }
      errors.push(...validateCauseExtraFields(label, causeValue, CAUSE_VARIANT_FIELDS.trainer));
      break;
    }
    case "wild": {
      if (!isNonEmptyString(causeValue.species)) {
        errors.push(`${label}: "cause.species" must be a non-empty string.`);
      }
      if (!isFiniteNumber(causeValue.level)) {
        errors.push(`${label}: "cause.level" must be a number.`);
      }
      if (!isNonEmptyString(causeValue.move)) {
        errors.push(`${label}: "cause.move" must be a non-empty string.`);
      }
      errors.push(...validateCauseExtraFields(label, causeValue, CAUSE_VARIANT_FIELDS.wild));
      break;
    }
    case "status": {
      if (!isEnum(causeValue.status, STATUS_CAUSES)) {
        errors.push(`${label}: "cause.status" must be one of ${STATUS_CAUSES.join(", ")}.`);
      }
      errors.push(...validateCauseExtraFields(label, causeValue, CAUSE_VARIANT_FIELDS.status));
      break;
    }
    case "other": {
      if (!isNonEmptyString(causeValue.detail)) {
        errors.push(`${label}: "cause.detail" must be a non-empty string.`);
      }
      errors.push(...validateCauseExtraFields(label, causeValue, CAUSE_VARIANT_FIELDS.other));
      break;
    }
    default:
      errors.push(`${label}: "cause.type" must be one of trainer, wild, status, other.`);
  }

  return errors;
}

function validateRuns(rows: unknown[]): TableValidationResult {
  return validateTable("runs", rows, (label, row) => {
    const errors: string[] = [];
    if (!isNonEmptyString(row.name)) {
      errors.push(`${label}: "name" must be a non-empty string.`);
    }
    if (!isEnum(row.game, GAME_IDS)) {
      errors.push(`${label}: "game" must be one of ${GAME_IDS.join(", ")}.`);
    }
    if (!isEnum(row.status, RUN_STATUSES)) {
      errors.push(`${label}: "status" must be one of ${RUN_STATUSES.join(", ")}.`);
    }
    if (!isNullableString(row.finishedAt)) {
      errors.push(`${label}: "finishedAt" must be a string or null.`);
    }
    errors.push(...validateRules(label, row.rules));
    return errors;
  });
}

function validateRoutes(rows: unknown[]): TableValidationResult {
  return validateTable("routes", rows, (label, row) => {
    const errors: string[] = [];
    if (!isNonEmptyString(row.runId)) {
      errors.push(`${label}: "runId" must be a non-empty string.`);
    }
    if (!isNonEmptyString(row.name)) {
      errors.push(`${label}: "name" must be a non-empty string.`);
    }
    if (!isFiniteNumber(row.order)) {
      errors.push(`${label}: "order" must be a number.`);
    }
    if (!isBoolean(row.isCustom)) {
      errors.push(`${label}: "isCustom" must be a boolean.`);
    }
    if (!isNullableString(row.gameRouteId)) {
      errors.push(`${label}: "gameRouteId" must be a string or null.`);
    }
    return errors;
  });
}

function validateEncounters(rows: unknown[]): TableValidationResult {
  return validateTable("encounters", rows, (label, row) => {
    const errors: string[] = [];
    if (!isNonEmptyString(row.runId)) {
      errors.push(`${label}: "runId" must be a non-empty string.`);
    }
    if (!isNonEmptyString(row.routeId)) {
      errors.push(`${label}: "routeId" must be a non-empty string.`);
    }
    if (!isEnum(row.status, ENCOUNTER_STATUSES)) {
      errors.push(`${label}: "status" must be one of ${ENCOUNTER_STATUSES.join(", ")}.`);
    }
    if (!isNullableString(row.speciesId)) {
      errors.push(`${label}: "speciesId" must be a string or null.`);
    }
    if (!isNullableFiniteNumber(row.level)) {
      errors.push(`${label}: "level" must be a number or null.`);
    }
    if (!isNullableString(row.monId)) {
      errors.push(`${label}: "monId" must be a string or null.`);
    }
    if (!isNullableString(row.notes)) {
      errors.push(`${label}: "notes" must be a string or null.`);
    }
    return errors;
  });
}

function validateMons(rows: unknown[]): TableValidationResult {
  return validateTable("mons", rows, (label, row) => {
    const errors: string[] = [];
    if (!isNonEmptyString(row.runId)) {
      errors.push(`${label}: "runId" must be a non-empty string.`);
    }
    if (!isNullableString(row.encounterId)) {
      errors.push(`${label}: "encounterId" must be a string or null.`);
    }
    if (!isNonEmptyString(row.speciesId)) {
      errors.push(`${label}: "speciesId" must be a non-empty string.`);
    }
    if (!isNonEmptyString(row.speciesIdCaught)) {
      errors.push(`${label}: "speciesIdCaught" must be a non-empty string.`);
    }
    if (!isNullableString(row.nickname)) {
      errors.push(`${label}: "nickname" must be a string or null.`);
    }
    if (row.gender !== null && !isEnum(row.gender, GENDERS)) {
      errors.push(`${label}: "gender" must be null or one of ${GENDERS.join(", ")}.`);
    }
    if (!isFiniteNumber(row.level)) {
      errors.push(`${label}: "level" must be a number.`);
    }
    if (!isFiniteNumber(row.levelCaught)) {
      errors.push(`${label}: "levelCaught" must be a number.`);
    }
    if (!isNullableString(row.nature)) {
      errors.push(`${label}: "nature" must be a string or null.`);
    }
    if (!isNullableString(row.ability)) {
      errors.push(`${label}: "ability" must be a string or null.`);
    }
    if (!isNullableString(row.heldItem)) {
      errors.push(`${label}: "heldItem" must be a string or null.`);
    }
    if (!isStringArray(row.moves)) {
      errors.push(`${label}: "moves" must be an array of strings.`);
    }
    if (!isEnum(row.status, MON_STATUSES)) {
      errors.push(`${label}: "status" must be one of ${MON_STATUSES.join(", ")}.`);
    }
    if (!isNullableFiniteNumber(row.partySlot)) {
      errors.push(`${label}: "partySlot" must be a number or null.`);
    }
    if (!isNullableFiniteNumber(row.boxOrder)) {
      errors.push(`${label}: "boxOrder" must be a number or null.`);
    }
    if (!isNullableString(row.caughtRouteId)) {
      errors.push(`${label}: "caughtRouteId" must be a string or null.`);
    }
    return errors;
  });
}

function validateDeaths(rows: unknown[]): TableValidationResult {
  return validateTable("deaths", rows, (label, row) => {
    const errors: string[] = [];
    if (!isNonEmptyString(row.runId)) {
      errors.push(`${label}: "runId" must be a non-empty string.`);
    }
    if (!isNonEmptyString(row.monId)) {
      errors.push(`${label}: "monId" must be a non-empty string.`);
    }
    if (!isFiniteNumber(row.level)) {
      errors.push(`${label}: "level" must be a number.`);
    }
    if (!isNullableString(row.routeId)) {
      errors.push(`${label}: "routeId" must be a string or null.`);
    }
    errors.push(...validateCause(label, row.cause));
    if (!isString(row.diedAt)) {
      errors.push(`${label}: "diedAt" must be a string.`);
    }
    if (!isNullableString(row.notes)) {
      errors.push(`${label}: "notes" must be a string or null.`);
    }
    return errors;
  });
}

function validateFights(rows: unknown[]): TableValidationResult {
  return validateTable("fights", rows, (label, row) => {
    const errors: string[] = [];
    if (!isNonEmptyString(row.runId)) {
      errors.push(`${label}: "runId" must be a non-empty string.`);
    }
    if (!isNullableString(row.gameFightId)) {
      errors.push(`${label}: "gameFightId" must be a string or null.`);
    }
    if (!isNonEmptyString(row.name)) {
      errors.push(`${label}: "name" must be a non-empty string.`);
    }
    if (!isEnum(row.kind, FIGHT_KINDS)) {
      errors.push(`${label}: "kind" must be one of ${FIGHT_KINDS.join(", ")}.`);
    }
    if (!isFiniteNumber(row.order)) {
      errors.push(`${label}: "order" must be a number.`);
    }
    if (!isBoolean(row.grantsBadge)) {
      errors.push(`${label}: "grantsBadge" must be a boolean.`);
    }
    if (!isNullableFiniteNumber(row.levelCap)) {
      errors.push(`${label}: "levelCap" must be a number or null.`);
    }
    if (!isEnum(row.status, FIGHT_STATUSES)) {
      errors.push(`${label}: "status" must be one of ${FIGHT_STATUSES.join(", ")}.`);
    }
    if (!isNullableString(row.clearedAt)) {
      errors.push(`${label}: "clearedAt" must be a string or null.`);
    }
    return errors;
  });
}

/** Every row carrying a `runId` must reference a run present in the SAME bundle — a bundle that
 * references rows it does not contain is corrupt, per spec. */
function validateRunReferences(table: string, rows: unknown[], runIds: Set<string>): string[] {
  const errors: string[] = [];
  rows.forEach((row, index) => {
    if (!isRecord(row) || !isNonEmptyString(row.runId)) {
      return;
    }
    if (!runIds.has(row.runId)) {
      errors.push(
        `${rowLabel(table, index, row)}: "runId" ${JSON.stringify(row.runId)} does not reference a run present in this bundle.`,
      );
    }
  });
  return errors;
}

function validateMonReferences(table: string, rows: unknown[], monIds: Set<string>): string[] {
  const errors: string[] = [];
  rows.forEach((row, index) => {
    if (!isRecord(row)) {
      return;
    }
    const monId = row.monId;
    if (typeof monId === "string" && monId.length > 0 && !monIds.has(monId)) {
      errors.push(
        `${rowLabel(table, index, row)}: "monId" ${JSON.stringify(monId)} does not reference a mon present in this bundle.`,
      );
    }
  });
  return errors;
}

/** Row-level and referential validation over an already-envelope-checked, already-migrated
 * bundle. Returns every problem found — never stops at the first. */
function validateBundleContents(bundle: ExportBundle): string[] {
  const runsResult = validateRuns(bundle.runs);
  const routesResult = validateRoutes(bundle.routes);
  const encountersResult = validateEncounters(bundle.encounters);
  const monsResult = validateMons(bundle.mons);
  const deathsResult = validateDeaths(bundle.deaths);
  const fightsResult = validateFights(bundle.fights);

  const errors = [
    ...runsResult.errors,
    ...routesResult.errors,
    ...encountersResult.errors,
    ...monsResult.errors,
    ...deathsResult.errors,
    ...fightsResult.errors,
    ...validateRunReferences("routes", bundle.routes, runsResult.ids),
    ...validateRunReferences("encounters", bundle.encounters, runsResult.ids),
    ...validateRunReferences("mons", bundle.mons, runsResult.ids),
    ...validateRunReferences("deaths", bundle.deaths, runsResult.ids),
    ...validateRunReferences("fights", bundle.fights, runsResult.ids),
    ...validateMonReferences("encounters", bundle.encounters, monsResult.ids),
    ...validateMonReferences("deaths", bundle.deaths, monsResult.ids),
  ];

  return errors;
}

/**
 * Parses and validates a file's raw text into an `ExportBundle`, never throwing. Order of checks
 * matches the spec exactly:
 *   1. Valid JSON at all.
 *   2. Passes the envelope guard (`isExportBundle`).
 *   3. `schemaVersion`: equal proceeds, greater REFUSES outright (never read a format from the
 *      future), lower runs migrations or refuses if there is no path.
 *   4. Row-level validation, accumulating every error.
 *   5. Referential sanity (runId / monId), accumulating every error.
 * A newer `schemaVersion` is refused before any row is even looked at — an older one is refused
 * only if migration can't bridge the gap, and once bridged, its (migrated) rows are validated the
 * same as any other bundle.
 */
export function parseBundle(text: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, errors: [`File is not valid JSON: ${message}`] };
  }

  if (!isExportBundle(parsed)) {
    return {
      ok: false,
      errors: [
        "File does not match the export bundle format (missing or malformed top-level fields).",
      ],
    };
  }

  if (parsed.schemaVersion > SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [
        `This file was written by a newer version of the app (schemaVersion ${parsed.schemaVersion}; ` +
          `this app supports up to ${SCHEMA_VERSION}). Update the app before importing it.`,
      ],
    };
  }

  let bundle = parsed;
  if (parsed.schemaVersion < SCHEMA_VERSION) {
    const migrated = migrateBundle(parsed);
    if (!migrated.ok) {
      return { ok: false, errors: [migrated.error] };
    }
    bundle = migrated.bundle;
  }

  const errors = validateBundleContents(bundle);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, bundle };
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export type ImportMode = "merge" | "replace";

export interface ImportedRunSummary {
  id: string;
  name: string;
}

export interface ImportRowCounts {
  runs: number;
  routes: number;
  encounters: number;
  mons: number;
  deaths: number;
  fights: number;
}

export interface ImportSummary {
  mode: ImportMode;
  /** Runs actually written. */
  imported: ImportedRunSummary[];
  /** Merge mode only: runs whose id already existed, left completely untouched. */
  skipped: ImportedRunSummary[];
  /** Row counts for what was actually written (not skipped rows). */
  rowCounts: ImportRowCounts;
}

/**
 * Imports `bundle` into `adapter` under `mode`. The ENTIRE import is one `adapter.transaction` —
 * non-negotiable, per spec: a half-applied import of a 31-route run is the one unforgivable bug.
 * If anything throws partway through, the underlying adapter rolls back and nothing is written.
 *
 * "merge": adds only runs whose `id` is not already present, plus THEIR rows. Existing runs, and
 * every row belonging to them, are left completely untouched — reported as skipped. This is
 * deliberately not conflict resolution (no overwrite, no merge-within-a-run, no
 * last-write-wins): CLAUDE.md calls that the hardest thing in the project, and this project does
 * not do it.
 *
 * "replace": clears every table, then writes the whole bundle.
 */
export async function importBundle(
  adapter: StorageAdapter,
  bundle: ExportBundle,
  mode: ImportMode,
): Promise<ImportSummary> {
  return adapter.transaction(async (tx) => {
    if (mode === "replace") {
      await tx.clear();
      await tx.runs.restoreMany(bundle.runs);
      await tx.routes.restoreMany(bundle.routes);
      await tx.encounters.restoreMany(bundle.encounters);
      await tx.mons.restoreMany(bundle.mons);
      await tx.deaths.restoreMany(bundle.deaths);
      await tx.fights.restoreMany(bundle.fights);

      return {
        mode,
        imported: bundle.runs.map((run) => ({ id: run.id, name: run.name })),
        skipped: [],
        rowCounts: {
          runs: bundle.runs.length,
          routes: bundle.routes.length,
          encounters: bundle.encounters.length,
          mons: bundle.mons.length,
          deaths: bundle.deaths.length,
          fights: bundle.fights.length,
        },
      };
    }

    const existingRuns = await tx.runs.getAll();
    const existingIds = new Set(existingRuns.map((run) => run.id));

    const runsToImport = bundle.runs.filter((run) => !existingIds.has(run.id));
    const skippedRuns = bundle.runs.filter((run) => existingIds.has(run.id));
    const importRunIds = new Set(runsToImport.map((run) => run.id));

    const routesToImport = bundle.routes.filter((row) => importRunIds.has(row.runId));
    const encountersToImport = bundle.encounters.filter((row) => importRunIds.has(row.runId));
    const monsToImport = bundle.mons.filter((row) => importRunIds.has(row.runId));
    const deathsToImport = bundle.deaths.filter((row) => importRunIds.has(row.runId));
    const fightsToImport = bundle.fights.filter((row) => importRunIds.has(row.runId));

    await tx.runs.restoreMany(runsToImport);
    await tx.routes.restoreMany(routesToImport);
    await tx.encounters.restoreMany(encountersToImport);
    await tx.mons.restoreMany(monsToImport);
    await tx.deaths.restoreMany(deathsToImport);
    await tx.fights.restoreMany(fightsToImport);

    return {
      mode,
      imported: runsToImport.map((run) => ({ id: run.id, name: run.name })),
      skipped: skippedRuns.map((run) => ({ id: run.id, name: run.name })),
      rowCounts: {
        runs: runsToImport.length,
        routes: routesToImport.length,
        encounters: encountersToImport.length,
        mons: monsToImport.length,
        deaths: deathsToImport.length,
        fights: fightsToImport.length,
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Preview (settings screen, before any write happens)
// ---------------------------------------------------------------------------

export interface ImportPreview {
  mode: ImportMode;
  /** Runs that would be imported. */
  toImport: ImportedRunSummary[];
  /** Merge mode only: runs that would be skipped because their id already exists. */
  toSkip: ImportedRunSummary[];
  rowCounts: ImportRowCounts;
}

/**
 * Computes what `importBundle` WOULD do, without writing anything — what the settings screen
 * shows the user before it asks for confirmation. `existingRuns` is the adapter's current run
 * list (already available to the caller via `useRuns()`), passed in rather than re-fetched here so
 * this function stays a pure, synchronous preview.
 */
export function previewImport(
  bundle: ExportBundle,
  mode: ImportMode,
  existingRuns: readonly { id: string }[],
): ImportPreview {
  if (mode === "replace") {
    return {
      mode,
      toImport: bundle.runs.map((run) => ({ id: run.id, name: run.name })),
      toSkip: [],
      rowCounts: {
        runs: bundle.runs.length,
        routes: bundle.routes.length,
        encounters: bundle.encounters.length,
        mons: bundle.mons.length,
        deaths: bundle.deaths.length,
        fights: bundle.fights.length,
      },
    };
  }

  const existingIds = new Set(existingRuns.map((run) => run.id));
  const toImport = bundle.runs.filter((run) => !existingIds.has(run.id));
  const toSkip = bundle.runs.filter((run) => existingIds.has(run.id));
  const importRunIds = new Set(toImport.map((run) => run.id));

  return {
    mode,
    toImport: toImport.map((run) => ({ id: run.id, name: run.name })),
    toSkip: toSkip.map((run) => ({ id: run.id, name: run.name })),
    rowCounts: {
      runs: toImport.length,
      routes: bundle.routes.filter((row) => importRunIds.has(row.runId)).length,
      encounters: bundle.encounters.filter((row) => importRunIds.has(row.runId)).length,
      mons: bundle.mons.filter((row) => importRunIds.has(row.runId)).length,
      deaths: bundle.deaths.filter((row) => importRunIds.has(row.runId)).length,
      fights: bundle.fights.filter((row) => importRunIds.has(row.runId)).length,
    },
  };
}
