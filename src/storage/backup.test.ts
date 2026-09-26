/**
 * Covers `src/storage/backup.ts`, the JSON export/import backup this permadeath tracker relies on.
 * A bad import must never destroy good data.
 */

import { describe, expect, it } from "vitest";

import { SCHEMA_VERSION, type ExportBundle } from "@/domain/schema";
import type { Cause, Death, Encounter, Fight, Mon, Route, Run } from "@/domain/types";

import type { StorageAdapter } from "./adapter";
import {
  exportBundle,
  importBundle,
  parseBundle,
  previewImport,
  serializeBundle,
  type ImportMode,
} from "./backup";
import { createMemoryAdapter } from "./memory-adapter";

const RULES_FIXTURE: Run["rules"] = {
  dupesClause: false,
  speciesClause: false,
  shinyClause: false,
  nicknamesRequired: false,
  levelCaps: false,
  setMode: false,
  hardcore: false,
  randomiser: {
    enabled: false,
    wildEncounters: false,
    trainers: false,
    starters: false,
    abilities: false,
    items: false,
    moves: false,
    evolutions: false,
  },
  customClause: null,
};

function makeRunDraft(overrides: Partial<Run> = {}): Omit<Run, "id" | "createdAt" | "updatedAt"> {
  return {
    name: "Test Run",
    game: "heartgold",
    status: "active",
    rules: RULES_FIXTURE,
    finishedAt: null,
    ...overrides,
  };
}

function makeRouteDraft(
  runId: string,
  overrides: Partial<Route> = {},
): Omit<Route, "id" | "createdAt" | "updatedAt"> {
  return {
    runId,
    name: "Route 29",
    order: 1,
    isCustom: false,
    gameRouteId: null,
    ...overrides,
  };
}

function makeEncounterDraft(
  runId: string,
  routeId: string,
  overrides: Partial<Encounter> = {},
): Omit<Encounter, "id" | "createdAt" | "updatedAt"> {
  return {
    runId,
    routeId,
    status: "open",
    speciesId: null,
    level: null,
    monId: null,
    notes: null,
    ...overrides,
  };
}

function makeMonDraft(
  runId: string,
  overrides: Partial<Mon> = {},
): Omit<Mon, "id" | "createdAt" | "updatedAt"> {
  return {
    runId,
    encounterId: null,
    speciesId: "chikorita",
    speciesIdCaught: "chikorita",
    nickname: null,
    gender: "female",
    level: 5,
    levelCaught: 5,
    nature: null,
    ability: null,
    heldItem: null,
    moves: ["tackle"],
    status: "party",
    partySlot: 0,
    boxOrder: null,
    caughtRouteId: null,
    shiny: false,
    ...overrides,
  };
}

function makeDeathDraft(
  runId: string,
  monId: string,
  overrides: Partial<Death> = {},
): Omit<Death, "id" | "createdAt" | "updatedAt"> {
  return {
    runId,
    monId,
    level: 10,
    routeId: null,
    cause: { type: "wild", species: "geodude", level: 10, move: "Rock Throw" },
    diedAt: "2026-01-01T00:00:00.000Z",
    notes: null,
    ...overrides,
  };
}

function makeFightDraft(
  runId: string,
  overrides: Partial<Fight> = {},
): Omit<Fight, "id" | "createdAt" | "updatedAt"> {
  return {
    runId,
    gameFightId: null,
    name: "Falkner",
    kind: "gym",
    order: 1,
    grantsBadge: true,
    levelCap: 15,
    status: "pending",
    clearedAt: null,
    ...overrides,
  };
}

/** Seeds one run with one row in every child table, returning the adapter and every row. */
async function seedFullRun(
  adapter: StorageAdapter,
): Promise<{ run: Run; route: Route; mon: Mon; death: Death; fight: Fight }> {
  const run = await adapter.runs.put(makeRunDraft());
  const route = await adapter.routes.put(makeRouteDraft(run.id));
  const mon = await adapter.mons.put(makeMonDraft(run.id, { caughtRouteId: route.id }));
  const death = await adapter.deaths.put(makeDeathDraft(run.id, mon.id));
  const fight = await adapter.fights.put(makeFightDraft(run.id));
  return { run, route, mon, death, fight };
}

/** Unwraps a `get(id)` result, failing the test immediately (with a useful message) rather than
 * letting `undefined` flow into an equality assertion untyped. */
function mustExist<T>(row: T | undefined, what: string): T {
  if (row === undefined) {
    throw new Error(`expected ${what} to exist`);
  }
  return row;
}

describe("round trip", () => {
  it("exporting then importing (replace) into a fresh adapter reproduces the data, including createdAt", async () => {
    const source = createMemoryAdapter();
    await source.init();
    const seeded = await seedFullRun(source);

    const bundle = await exportBundle(source);

    const target = createMemoryAdapter();
    await target.init();
    const summary = await importBundle(target, bundle, "replace");

    expect(summary.imported).toEqual([{ id: seeded.run.id, name: seeded.run.name }]);

    // importBundle writes via restoreMany, not put: a restore is not a modification, so every
    // row, including updatedAt, must come back byte-identical. put's own stamping is tested
    // separately in adapter.contract.ts.
    const importedRun = mustExist(await target.runs.get(seeded.run.id), "imported run");
    const importedRoute = mustExist(await target.routes.get(seeded.route.id), "imported route");
    const importedMon = mustExist(await target.mons.get(seeded.mon.id), "imported mon");
    const importedDeath = mustExist(await target.deaths.get(seeded.death.id), "imported death");
    const importedFight = mustExist(await target.fights.get(seeded.fight.id), "imported fight");

    expect(importedRun).toEqual(seeded.run);
    expect(importedRoute).toEqual(seeded.route);
    expect(importedMon).toEqual(seeded.mon);
    expect(importedDeath).toEqual(seeded.death);
    expect(importedFight).toEqual(seeded.fight);

    // Both timestamps are checked: a restore recovers rows, it does not modify them.
    expect(importedRun.createdAt).toBe(seeded.run.createdAt);
    expect(importedRun.updatedAt).toBe(seeded.run.updatedAt);
    expect(importedMon.createdAt).toBe(seeded.mon.createdAt);
    expect(importedMon.updatedAt).toBe(seeded.mon.updatedAt);
  });

  it("preserves a deliberately old updatedAt through an export/import cycle intact", async () => {
    const source = createMemoryAdapter();
    await source.init();
    const oldUpdatedAt = "2020-01-01T00:00:00.000Z";
    const run = await source.runs.put(makeRunDraft());
    // put always stamps updatedAt fresh. Back-date the row through restoreMany, the same path a
    // real restore uses, so updatedAt predates now without depending on the clock.
    const backdated = { ...run, updatedAt: oldUpdatedAt };
    await source.runs.restoreMany([backdated]);

    const bundle = await exportBundle(source);
    expect(bundle.runs[0]?.updatedAt).toBe(oldUpdatedAt);

    const target = createMemoryAdapter();
    await target.init();
    await importBundle(target, bundle, "replace");

    const imported = mustExist(await target.runs.get(run.id), "imported run");
    expect(imported.updatedAt).toBe(oldUpdatedAt);
    expect(imported).toEqual(backdated);
  });

  it("round-trips a shiny mon through export and import", async () => {
    const source = createMemoryAdapter();
    await source.init();
    const run = await source.runs.put(makeRunDraft());
    const mon = await source.mons.put(makeMonDraft(run.id, { shiny: true }));

    const bundle = await exportBundle(source);
    expect(bundle.mons[0]?.shiny).toBe(true);

    const target = createMemoryAdapter();
    await target.init();
    await importBundle(target, bundle, "replace");

    expect((await target.mons.get(mon.id))?.shiny).toBe(true);
  });

  it("imports a pre-shiny (schemaVersion 1) export, and its mons read as not shiny", async () => {
    const timestamp = "2020-01-01T00:00:00.000Z";
    // A real v1 export has no `shiny` key on its mons at all: the field did not exist yet.
    const legacyMon = {
      id: "mon-1",
      createdAt: timestamp,
      updatedAt: timestamp,
      runId: "run-1",
      encounterId: null,
      speciesId: "chikorita",
      speciesIdCaught: "chikorita",
      nickname: null,
      gender: "female",
      level: 5,
      levelCaught: 5,
      nature: null,
      ability: null,
      heldItem: null,
      moves: ["tackle"],
      status: "party",
      partySlot: 0,
      boxOrder: null,
      caughtRouteId: null,
    };
    const oldExport = {
      schemaVersion: 1,
      exportedAt: timestamp,
      runs: [{ id: "run-1", createdAt: timestamp, updatedAt: timestamp, ...makeRunDraft() }],
      routes: [],
      encounters: [],
      mons: [legacyMon],
      deaths: [],
      fights: [],
    };

    const result = parseBundle(JSON.stringify(oldExport));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const target = createMemoryAdapter();
    await target.init();
    const summary = await importBundle(target, result.bundle, "replace");

    expect(summary.imported).toEqual([{ id: "run-1", name: "Test Run" }]);
    expect((await target.mons.get("mon-1"))?.shiny).toBe(false);
  });
});

describe("serializeBundle", () => {
  it("is stable: the same data serializes to a byte-identical string", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    await seedFullRun(adapter);

    const bundle = await exportBundle(adapter);
    // exportedAt would otherwise differ between the two calls below. Pin it so this test is
    // about key order stability, not the clock.
    const fixedBundle: ExportBundle = { ...bundle, exportedAt: "2026-01-01T00:00:00.000Z" };

    expect(serializeBundle(fixedBundle)).toBe(serializeBundle(fixedBundle));
    expect(serializeBundle(fixedBundle)).toBe(serializeBundle({ ...fixedBundle }));
  });
});

function emptyBundle(overrides: Partial<ExportBundle> = {}): ExportBundle {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: "2026-01-01T00:00:00.000Z",
    runs: [],
    routes: [],
    encounters: [],
    mons: [],
    deaths: [],
    fights: [],
    ...overrides,
  };
}

describe("parseBundle — schemaVersion", () => {
  it("refuses a schemaVersion greater than SCHEMA_VERSION with a clear message", () => {
    const bundle = emptyBundle({ schemaVersion: SCHEMA_VERSION + 1 });

    const result = parseBundle(JSON.stringify(bundle));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toMatch(/newer version/i);
    }
  });

  it("refuses a schemaVersion lower than SCHEMA_VERSION when no migration path exists", () => {
    const bundle = emptyBundle({ schemaVersion: 0 });

    const result = parseBundle(JSON.stringify(bundle));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toMatch(/no migration path/i);
    }
  });

  it("accepts a bundle at exactly SCHEMA_VERSION", () => {
    const result = parseBundle(JSON.stringify(emptyBundle()));
    expect(result.ok).toBe(true);
  });
});

describe("parseBundle — row validation", () => {
  it("refuses a run missing id", () => {
    const bundle = emptyBundle({
      runs: [
        {
          ...makeRunDraft(),
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ] as unknown as Run[],
    });

    const result = parseBundle(JSON.stringify(bundle));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('"id"'))).toBe(true);
    }
  });

  it("refuses a row whose primitive field has the wrong type", () => {
    const run: Run = {
      id: "run-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ...makeRunDraft({ name: 42 as unknown as string }),
    };
    const bundle = emptyBundle({ runs: [run] });

    const result = parseBundle(JSON.stringify(bundle));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('"name"'))).toBe(true);
    }
  });

  it("refuses a row with a bad enum value", () => {
    const run: Run = {
      id: "run-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ...makeRunDraft({ status: "in-progress" as unknown as Run["status"] }),
    };
    const bundle = emptyBundle({ runs: [run] });

    const result = parseBundle(JSON.stringify(bundle));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('"status"'))).toBe(true);
    }
  });

  it("refuses a cause whose variant does not match its fields (a stray fightId on a non-trainer cause)", () => {
    const run: Run = {
      id: "run-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ...makeRunDraft(),
    };
    const mon: Mon = {
      id: "mon-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ...makeMonDraft(run.id),
    };
    const malformedCause = {
      type: "status",
      status: "poison",
      fightId: "fight-1",
    } as unknown as Cause;
    const death: Death = {
      id: "death-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ...makeDeathDraft(run.id, mon.id, { cause: malformedCause }),
    };
    const bundle = emptyBundle({ runs: [run], mons: [mon], deaths: [death] });

    const result = parseBundle(JSON.stringify(bundle));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("fightId"))).toBe(true);
    }
  });

  it("refuses a bundle whose runId references an absent run", () => {
    const route: Route = {
      id: "route-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ...makeRouteDraft("no-such-run"),
    };
    const bundle = emptyBundle({ routes: [route] });

    const result = parseBundle(JSON.stringify(bundle));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("runId"))).toBe(true);
    }
  });

  it("accumulates multiple errors rather than stopping at the first", () => {
    const run: Run = {
      id: "run-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ...makeRunDraft({ status: "bogus" as unknown as Run["status"] }),
    };
    const route: Route = {
      id: "route-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ...makeRouteDraft("no-such-run"),
    };
    const bundle = emptyBundle({ runs: [run], routes: [route] });

    const result = parseBundle(JSON.stringify(bundle));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      expect(result.errors.some((e) => e.includes('"status"'))).toBe(true);
      expect(result.errors.some((e) => e.includes("runId"))).toBe(true);
    }
  });

  it("refuses text that is not valid JSON", () => {
    const result = parseBundle("{ not json");
    expect(result.ok).toBe(false);
  });
});

/** One valid row per table, cross-linked (route/mon/death/fight all point back at the same run,
 * the death at the same mon). Deliberately all-valid, so `bundleWithBadField` can break exactly
 * one field and any resulting error is attributable to that field alone. */
function baseValidBundle(): ExportBundle {
  const timestamp = "2026-01-01T00:00:00.000Z";
  const run: Run = { id: "run-1", createdAt: timestamp, updatedAt: timestamp, ...makeRunDraft() };
  const route: Route = {
    id: "route-1",
    createdAt: timestamp,
    updatedAt: timestamp,
    ...makeRouteDraft(run.id),
  };
  const encounter: Encounter = {
    id: "enc-1",
    createdAt: timestamp,
    updatedAt: timestamp,
    ...makeEncounterDraft(run.id, route.id),
  };
  const mon: Mon = {
    id: "mon-1",
    createdAt: timestamp,
    updatedAt: timestamp,
    ...makeMonDraft(run.id, { caughtRouteId: route.id }),
  };
  const death: Death = {
    id: "death-1",
    createdAt: timestamp,
    updatedAt: timestamp,
    ...makeDeathDraft(run.id, mon.id),
  };
  const fight: Fight = {
    id: "fight-1",
    createdAt: timestamp,
    updatedAt: timestamp,
    ...makeFightDraft(run.id),
  };

  return emptyBundle({
    runs: [run],
    routes: [route],
    encounters: [encounter],
    mons: [mon],
    deaths: [death],
    fights: [fight],
  });
}

/** The fixture id `baseValidBundle` gives the one row in each table, so a case's error can be
 * matched to the exact row it broke. */
const FIELD_RULE_ROW_ID = {
  runs: "run-1",
  routes: "route-1",
  encounters: "enc-1",
  mons: "mon-1",
  deaths: "death-1",
  fights: "fight-1",
} as const;

type FieldRuleTable = keyof typeof FIELD_RULE_ROW_ID;

/** The base bundle with a single field of one table's one row replaced by `badValue`. Everything
 * else stays valid, so a failure is caused by that field's rule and nothing else. */
function bundleWithBadField(table: FieldRuleTable, field: string, badValue: unknown): ExportBundle {
  const base = baseValidBundle();
  const rows = base[table] as unknown as Record<string, unknown>[];
  const [row] = rows;
  const patched = { ...row, [field]: badValue };
  return { ...base, [table]: [patched] };
}

describe("parseBundle — field rules", () => {
  it("accepts the base fixture bundle unmodified (control for the cases below)", () => {
    const result = parseBundle(JSON.stringify(baseValidBundle()));
    expect(result.ok).toBe(true);
  });

  it.each<[FieldRuleTable, string, unknown]>([
    // non-empty-string fields: "" and a number
    ["runs", "name", ""],
    ["runs", "name", 42],
    ["routes", "name", ""],
    ["routes", "name", 42],
    ["encounters", "routeId", ""],
    ["encounters", "routeId", 9],
    ["mons", "speciesId", ""],
    ["mons", "speciesId", 1],
    ["deaths", "monId", ""],
    ["deaths", "monId", 2],
    ["fights", "name", ""],
    ["fights", "name", 8],

    // nullable-string fields: a number
    ["runs", "finishedAt", 123],
    ["routes", "gameRouteId", 5],
    ["encounters", "speciesId", 3],
    ["mons", "nickname", 5],
    ["deaths", "routeId", 4],
    ["fights", "gameFightId", 6],

    // plain string field (not non-empty): a number
    ["deaths", "diedAt", 12345],

    // number fields: null and a string
    ["routes", "order", null],
    ["routes", "order", "1"],
    ["mons", "level", null],
    ["mons", "level", "5"],
    ["deaths", "level", null],
    ["deaths", "level", "10"],
    ["fights", "order", null],
    ["fights", "order", "1"],

    // nullable-number fields: a string
    ["encounters", "level", "5"],
    ["mons", "partySlot", "0"],
    ["fights", "levelCap", "15"],

    // boolean fields: a string
    ["routes", "isCustom", "yes"],
    ["fights", "grantsBadge", "true"],
    ["mons", "shiny", "yes"],

    // enum fields: an unrecognised value
    ["runs", "status", "in-progress"],
    ["encounters", "status", "unknown"],
    ["mons", "gender", "unknown"],
    ["mons", "status", "fainted"],
    ["fights", "kind", "boss"],

    // Mon.moves: not an array of strings
    ["mons", "moves", ["tackle", 5]],
  ])("rejects %s.%s = %p, naming that table and field", (table, field, badValue) => {
    const bundle = bundleWithBadField(table, field, badValue);

    const result = parseBundle(JSON.stringify(bundle));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const label = `${table}[${FIELD_RULE_ROW_ID[table]}]`;
      expect(result.errors.some((e) => e.startsWith(label) && e.includes(`"${field}"`))).toBe(true);
    }
  });
});

describe("importBundle — merge", () => {
  it("adds new runs and leaves an existing run's rows byte-identical", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const existing = await seedFullRun(adapter);

    const other = createMemoryAdapter();
    await other.init();
    const incoming = await seedFullRun(other);
    const incomingBundle = await exportBundle(other);

    const summary = await importBundle(adapter, incomingBundle, "merge");

    expect(summary.imported).toEqual([{ id: incoming.run.id, name: incoming.run.name }]);
    expect(summary.skipped).toEqual([]);
    expect(summary.rowCounts).toEqual({
      runs: 1,
      routes: 1,
      encounters: 0,
      mons: 1,
      deaths: 1,
      fights: 1,
    });

    expect(await adapter.runs.get(incoming.run.id)).toBeDefined();
    expect(await adapter.mons.get(incoming.mon.id)).toBeDefined();

    expect(await adapter.runs.get(existing.run.id)).toEqual(existing.run);
    expect(await adapter.routes.get(existing.route.id)).toEqual(existing.route);
    expect(await adapter.mons.get(existing.mon.id)).toEqual(existing.mon);
    expect(await adapter.deaths.get(existing.death.id)).toEqual(existing.death);
    expect(await adapter.fights.get(existing.fight.id)).toEqual(existing.fight);
  });

  it("skips a run whose id already exists, reporting it, and does not touch its rows", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const existing = await seedFullRun(adapter);

    const bundle = await exportBundle(adapter);
    // Mutate the incoming copy, not the stored one, so a pass here means "untouched", not
    // "overwritten with the same value by coincidence".
    const mutatedBundle: ExportBundle = {
      ...bundle,
      runs: bundle.runs.map((run) => ({ ...run, name: "Mutated Name" })),
    };

    const summary = await importBundle(adapter, mutatedBundle, "merge");

    expect(summary.imported).toEqual([]);
    expect(summary.skipped).toEqual([{ id: existing.run.id, name: "Mutated Name" }]);
    expect(summary.rowCounts.runs).toBe(0);

    const stored = await adapter.runs.get(existing.run.id);
    expect(stored?.name).toBe("Test Run");
    expect(stored).toEqual(existing.run);
  });
});

describe("importBundle — replace", () => {
  it("clears existing data before writing the bundle", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const stale = await seedFullRun(adapter);

    const other = createMemoryAdapter();
    await other.init();
    const incoming = await seedFullRun(other);
    const incomingBundle = await exportBundle(other);

    const summary = await importBundle(adapter, incomingBundle, "replace");

    expect(summary.imported).toEqual([{ id: incoming.run.id, name: incoming.run.name }]);
    expect(await adapter.runs.get(stale.run.id)).toBeUndefined();
    expect(await adapter.runs.getAll()).toHaveLength(1);
    expect(await adapter.runs.get(incoming.run.id)).toBeDefined();
  });
});

/**
 * previewImport shares planImport with importBundle rather than re-deriving the rule. These
 * tests build and preview a bundle, then actually import it, and assert the two agree, so a bug
 * in the shared filter fails both the same way.
 */
describe("previewImport", () => {
  it("merge mode: agrees with importBundle, including for a colliding run that owns child rows", async () => {
    const target = createMemoryAdapter();
    await target.init();
    const existing = await seedFullRun(target);
    const existingBundle = await exportBundle(target);

    const other = createMemoryAdapter();
    await other.init();
    const incoming = await seedFullRun(other);
    const incomingBundle = await exportBundle(other);

    // One run collides with what's already in target. The other doesn't. A merge filter that
    // selected child rows by the wrong run set would show up in one half but not the other.
    const bundle: ExportBundle = {
      schemaVersion: incomingBundle.schemaVersion,
      exportedAt: incomingBundle.exportedAt,
      runs: [...existingBundle.runs, ...incomingBundle.runs],
      routes: [...existingBundle.routes, ...incomingBundle.routes],
      encounters: [...existingBundle.encounters, ...incomingBundle.encounters],
      mons: [...existingBundle.mons, ...incomingBundle.mons],
      deaths: [...existingBundle.deaths, ...incomingBundle.deaths],
      fights: [...existingBundle.fights, ...incomingBundle.fights],
    };

    const existingRuns = await target.runs.getAll();
    const preview = previewImport(bundle, "merge", existingRuns);
    const summary = await importBundle(target, bundle, "merge");

    expect(preview.toImport).toEqual(summary.imported);
    expect(preview.toSkip).toEqual(summary.skipped);
    expect(preview.rowCounts).toEqual(summary.rowCounts);

    // The agreement above only means something if both halves were actually exercised.
    expect(preview.toImport).toEqual([{ id: incoming.run.id, name: incoming.run.name }]);
    expect(preview.toSkip).toEqual([{ id: existing.run.id, name: existing.run.name }]);
  });

  it("replace mode: agrees with importBundle against an adapter seeded with runs absent from the bundle", async () => {
    const target = createMemoryAdapter();
    await target.init();
    await seedFullRun(target); // present in the adapter, absent from the incoming bundle entirely

    const other = createMemoryAdapter();
    await other.init();
    await seedFullRun(other);
    const bundle = await exportBundle(other);

    const existingRuns = await target.runs.getAll();
    const preview = previewImport(bundle, "replace", existingRuns);
    const summary = await importBundle(target, bundle, "replace");

    expect(preview.toImport).toEqual(summary.imported);
    expect(preview.toSkip).toEqual(summary.skipped);
    expect(preview.rowCounts).toEqual(summary.rowCounts);
  });
});

/**
 * Wraps a StorageAdapter so mons.restoreMany always rejects. transaction re-wraps the scoped
 * adapter it hands the callback, so the failure is visible inside a transaction, proving a real
 * rollback rather than a rejected outer promise.
 */
function withFailingMonsPutMany(base: StorageAdapter): StorageAdapter {
  return {
    init: () => base.init(),
    runs: base.runs,
    routes: base.routes,
    encounters: base.encounters,
    mons: {
      ...base.mons,
      restoreMany: () => Promise.reject(new Error("simulated write failure")),
    },
    deaths: base.deaths,
    fights: base.fights,
    transaction: (fn) => base.transaction((tx) => fn(withFailingMonsPutMany(tx))),
    exportAll: () => base.exportAll(),
    clear: () => base.clear(),
    deathsByFight: (fightId) => base.deathsByFight(fightId),
  };
}

describe("atomicity", () => {
  it("leaves the store completely unchanged when a write fails partway through an import", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const existing = await seedFullRun(adapter);

    const other = createMemoryAdapter();
    await other.init();
    await seedFullRun(other);
    const incomingBundle = await exportBundle(other);

    const failingAdapter = withFailingMonsPutMany(adapter);

    await expect(importBundle(failingAdapter, incomingBundle, "replace")).rejects.toThrow(
      "simulated write failure",
    );

    // Nothing was written, not even the pre-existing run that clear() had already removed
    // before the failure. A real rollback restores that too.
    expect(await adapter.runs.getAll()).toEqual([existing.run]);
    expect(await adapter.routes.getAll()).toEqual([existing.route]);
    expect(await adapter.mons.getAll()).toEqual([existing.mon]);
    expect(await adapter.deaths.getAll()).toEqual([existing.death]);
    expect(await adapter.fights.getAll()).toEqual([existing.fight]);
  });

  it.each<ImportMode>(["merge", "replace"])(
    "%s mode: a failure leaves the store unchanged even when only some tables had been written",
    async (mode) => {
      const adapter = createMemoryAdapter();
      await adapter.init();
      const existing = await seedFullRun(adapter);

      const other = createMemoryAdapter();
      await other.init();
      await seedFullRun(other);
      const incomingBundle = await exportBundle(other);

      const failingAdapter = withFailingMonsPutMany(adapter);

      await expect(importBundle(failingAdapter, incomingBundle, mode)).rejects.toThrow();

      expect(await adapter.runs.getAll()).toEqual([existing.run]);
      expect(await adapter.mons.getAll()).toEqual([existing.mon]);
    },
  );
});
