/**
 * JSON export and import: the backup this permadeath tracker requires. A file handed to
 * parseBundle has come from outside the app, so every field is re-validated from unknown, and
 * every problem accumulates instead of the parse stopping at the first.
 */

import { SCHEMA_VERSION, isExportBundle, migrateBundle, type ExportBundle } from "@/domain/schema";
import { CLAUSE_FIELDS, RANDOMISER_FIELDS } from "@/domain/rules";
import type {
  Cause,
  StatusCause,
  GameId,
  Run,
  Route,
  Encounter,
  Mon,
  Death,
  Fight,
} from "@/domain/types";

import type { StorageAdapter } from "./adapter";

export function exportBundle(adapter: StorageAdapter): Promise<ExportBundle> {
  return adapter.exportAll();
}

/** Sorts object keys recursively, leaving array order untouched, so two exports of the same
 * data diff cleanly. */
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

export function serializeBundle(bundle: ExportBundle): string {
  return JSON.stringify(sortKeysDeep(bundle), null, 2) + "\n";
}

function defaultFilename(bundle: ExportBundle): string {
  const date = bundle.exportedAt.slice(0, 10);
  return `nuzlocke-${date}.json`;
}

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

function rowLabel(table: string, index: number, row: unknown): string {
  const id = isRecord(row) && isNonEmptyString(row.id) ? row.id : `#${index}`;
  return `${table}[${id}]`;
}

interface TableValidationResult {
  errors: string[];
  ids: Set<string>;
}

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

/** A validity check plus the message fragment for `"<field>" must be ...`. */
interface FieldRule {
  check: (value: unknown) => boolean;
  expected: string;
}

const str: FieldRule = { check: isString, expected: "a string" };
const nonEmptyStr: FieldRule = { check: isNonEmptyString, expected: "a non-empty string" };
const nullableStr: FieldRule = { check: isNullableString, expected: "a string or null" };
const num: FieldRule = { check: isFiniteNumber, expected: "a number" };
const nullableNum: FieldRule = { check: isNullableFiniteNumber, expected: "a number or null" };
const bool: FieldRule = { check: isBoolean, expected: "a boolean" };
const strArray: FieldRule = { check: isStringArray, expected: "an array of strings" };

function oneOf<T extends string>(allowed: readonly T[]): FieldRule {
  return { check: (value) => isEnum(value, allowed), expected: `one of ${allowed.join(", ")}` };
}

function nullableOneOf<T extends string>(allowed: readonly T[]): FieldRule {
  return {
    check: (value) => value === null || isEnum(value, allowed),
    expected: `null or one of ${allowed.join(", ")}`,
  };
}

/** A rule table covering every field of `T` except the ones `validateTable` already checks. */
type RowFields<T> = Record<Exclude<keyof T, "id" | "createdAt" | "updatedAt">, FieldRule>;

function checkFields(
  label: string,
  row: Record<string, unknown>,
  rules: Record<string, FieldRule>,
): string[] {
  const errors: string[] = [];
  for (const [field, rule] of Object.entries(rules)) {
    if (!rule.check(row[field])) {
      errors.push(`${label}: "${field}" must be ${rule.expected}.`);
    }
  }
  return errors;
}

function validateRules(label: string, rulesValue: unknown): string[] {
  const errors: string[] = [];

  if (!isRecord(rulesValue)) {
    errors.push(`${label}: "rules" must be an object.`);
    return errors;
  }

  for (const field of CLAUSE_FIELDS) {
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
    for (const field of RANDOMISER_FIELDS) {
      if (!isBoolean(randomiser[field])) {
        errors.push(`${label}: "rules.randomiser.${field}" must be a boolean.`);
      }
    }
  }

  return errors;
}

/** Fields allowed on each `Cause` variant. An unexpected field here is what a hand-edited file
 * produces and must be rejected, not ignored. */
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

const RUN_FIELDS: RowFields<Omit<Run, "rules">> = {
  name: nonEmptyStr,
  game: oneOf(GAME_IDS),
  status: oneOf(RUN_STATUSES),
  finishedAt: nullableStr,
};

function validateRuns(rows: unknown[]): TableValidationResult {
  return validateTable("runs", rows, (label, row) => [
    ...checkFields(label, row, RUN_FIELDS),
    ...validateRules(label, row.rules),
  ]);
}

const ROUTE_FIELDS: RowFields<Route> = {
  runId: nonEmptyStr,
  name: nonEmptyStr,
  order: num,
  isCustom: bool,
  gameRouteId: nullableStr,
};

function validateRoutes(rows: unknown[]): TableValidationResult {
  return validateTable("routes", rows, (label, row) => checkFields(label, row, ROUTE_FIELDS));
}

const ENCOUNTER_FIELDS: RowFields<Encounter> = {
  runId: nonEmptyStr,
  routeId: nonEmptyStr,
  status: oneOf(ENCOUNTER_STATUSES),
  speciesId: nullableStr,
  level: nullableNum,
  monId: nullableStr,
  notes: nullableStr,
};

function validateEncounters(rows: unknown[]): TableValidationResult {
  return validateTable("encounters", rows, (label, row) =>
    checkFields(label, row, ENCOUNTER_FIELDS),
  );
}

const MON_FIELDS: RowFields<Mon> = {
  runId: nonEmptyStr,
  encounterId: nullableStr,
  speciesId: nonEmptyStr,
  speciesIdCaught: nonEmptyStr,
  nickname: nullableStr,
  gender: nullableOneOf(GENDERS),
  level: num,
  levelCaught: num,
  nature: nullableStr,
  ability: nullableStr,
  heldItem: nullableStr,
  moves: strArray,
  status: oneOf(MON_STATUSES),
  partySlot: nullableNum,
  boxOrder: nullableNum,
  caughtRouteId: nullableStr,
  shiny: bool,
};

function validateMons(rows: unknown[]): TableValidationResult {
  return validateTable("mons", rows, (label, row) => checkFields(label, row, MON_FIELDS));
}

const DEATH_FIELDS: RowFields<Omit<Death, "cause">> = {
  runId: nonEmptyStr,
  monId: nonEmptyStr,
  level: num,
  routeId: nullableStr,
  diedAt: str,
  notes: nullableStr,
};

function validateDeaths(rows: unknown[]): TableValidationResult {
  return validateTable("deaths", rows, (label, row) => [
    ...checkFields(label, row, DEATH_FIELDS),
    ...validateCause(label, row.cause),
  ]);
}

const FIGHT_FIELDS: RowFields<Fight> = {
  runId: nonEmptyStr,
  gameFightId: nullableStr,
  name: nonEmptyStr,
  kind: oneOf(FIGHT_KINDS),
  order: num,
  grantsBadge: bool,
  levelCap: nullableNum,
  status: oneOf(FIGHT_STATUSES),
  clearedAt: nullableStr,
};

function validateFights(rows: unknown[]): TableValidationResult {
  return validateTable("fights", rows, (label, row) => checkFields(label, row, FIGHT_FIELDS));
}

/** Every row with a `runId` must reference a run present in the same bundle. A row that doesn't
 * is corrupt. */
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
 * Parses and validates raw text into an ExportBundle, never throwing. Checks run in order:
 * valid JSON, envelope shape, schemaVersion, then row and reference validation, all
 * accumulating errors rather than stopping at the first.
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

/** What an import would write, computed by the one shared merge/replace rule. */
interface ImportPlan {
  runs: Run[];
  routes: Route[];
  encounters: Encounter[];
  mons: Mon[];
  deaths: Death[];
  fights: Fight[];
  /** Merge mode only: runs already present, left untouched. */
  skippedRuns: Run[];
}

/**
 * The one merge/replace selection rule, shared by importBundle (which writes the plan) and
 * previewImport (which only describes it). "replace" takes every table verbatim. "merge" takes
 * runs not already in existingRunIds, plus their child rows. Everything else is skippedRuns.
 */
function planImport(
  bundle: ExportBundle,
  mode: ImportMode,
  existingRunIds: ReadonlySet<string>,
): ImportPlan {
  if (mode === "replace") {
    return {
      runs: bundle.runs,
      routes: bundle.routes,
      encounters: bundle.encounters,
      mons: bundle.mons,
      deaths: bundle.deaths,
      fights: bundle.fights,
      skippedRuns: [],
    };
  }

  const runs = bundle.runs.filter((run) => !existingRunIds.has(run.id));
  const skippedRuns = bundle.runs.filter((run) => existingRunIds.has(run.id));
  const importRunIds = new Set(runs.map((run) => run.id));

  return {
    runs,
    routes: bundle.routes.filter((row) => importRunIds.has(row.runId)),
    encounters: bundle.encounters.filter((row) => importRunIds.has(row.runId)),
    mons: bundle.mons.filter((row) => importRunIds.has(row.runId)),
    deaths: bundle.deaths.filter((row) => importRunIds.has(row.runId)),
    fights: bundle.fights.filter((row) => importRunIds.has(row.runId)),
    skippedRuns,
  };
}

function countRows(plan: ImportPlan): ImportRowCounts {
  return {
    runs: plan.runs.length,
    routes: plan.routes.length,
    encounters: plan.encounters.length,
    mons: plan.mons.length,
    deaths: plan.deaths.length,
    fights: plan.fights.length,
  };
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
 * Imports bundle into adapter under mode, inside one transaction: a throw partway through rolls
 * everything back. "merge" adds only runs not already present, leaving existing runs untouched
 * and reported as skipped, not conflict-resolved. "replace" clears every table first.
 */
export async function importBundle(
  adapter: StorageAdapter,
  bundle: ExportBundle,
  mode: ImportMode,
): Promise<ImportSummary> {
  return adapter.transaction(async (tx) => {
    let existingRunIds: ReadonlySet<string> = new Set();
    if (mode === "replace") {
      await tx.clear();
    } else {
      existingRunIds = new Set((await tx.runs.getAll()).map((run) => run.id));
    }

    const plan = planImport(bundle, mode, existingRunIds);

    await tx.runs.restoreMany(plan.runs);
    await tx.routes.restoreMany(plan.routes);
    await tx.encounters.restoreMany(plan.encounters);
    await tx.mons.restoreMany(plan.mons);
    await tx.deaths.restoreMany(plan.deaths);
    await tx.fights.restoreMany(plan.fights);

    return {
      mode,
      imported: plan.runs.map((run) => ({ id: run.id, name: run.name })),
      skipped: plan.skippedRuns.map((run) => ({ id: run.id, name: run.name })),
      rowCounts: countRows(plan),
    };
  });
}

export interface ImportPreview {
  mode: ImportMode;
  /** Runs that would be imported. */
  toImport: ImportedRunSummary[];
  /** Merge mode only: runs that would be skipped because their id already exists. */
  toSkip: ImportedRunSummary[];
  rowCounts: ImportRowCounts;
}

/**
 * Computes what `importBundle` would do, without writing anything. `existingRuns` is passed in
 * (the caller already has it via `useRuns()`) rather than fetched here, so this function stays a
 * pure, synchronous preview.
 */
export function previewImport(
  bundle: ExportBundle,
  mode: ImportMode,
  existingRuns: readonly { id: string }[],
): ImportPreview {
  const existingRunIds = new Set(existingRuns.map((run) => run.id));
  const plan = planImport(bundle, mode, existingRunIds);

  return {
    mode,
    toImport: plan.runs.map((run) => ({ id: run.id, name: run.name })),
    toSkip: plan.skippedRuns.map((run) => ({ id: run.id, name: run.name })),
    rowCounts: countRows(plan),
  };
}
