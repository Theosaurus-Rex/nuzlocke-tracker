/**
 * Covers `src/storage/backup.ts` — the JSON export/import that CLAUDE.md hard rule 5 requires as
 * the actual backup for this permadeath tracker. Tested against the in-memory adapter (spec §10),
 * the same reference adapter `adapter.contract.ts` and `queries.test.tsx` use.
 *
 * Three properties matter most here, and each gets a dedicated test: the round trip proves this
 * is really a backup, the atomicity test proves a failed import can never half-apply, and the
 * malformed-row tests prove `parseBundle` actually protects the database rather than rubber-stamping
 * whatever `isExportBundle`'s shallow envelope check let through.
 */

import { describe, expect, it } from "vitest";

import { SCHEMA_VERSION, type ExportBundle } from "@/domain/schema";
import type { Cause, Death, Fight, Mon, Route, Run } from "@/domain/types";

import type { StorageAdapter } from "./adapter";
import {
  exportBundle,
  importBundle,
  parseBundle,
  serializeBundle,
  type ImportMode,
} from "./backup";
import { createMemoryAdapter } from "./memory-adapter";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Round trip
// ---------------------------------------------------------------------------

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

    // `importBundle` writes through `Repository.restoreMany`, not `put`: a restore is not a
    // modification, so every row — including `updatedAt` — must come back byte-identical to what
    // was exported. (Ordinary writes still go through `put`, which stamps `updatedAt` on every
    // write; that behaviour is unchanged and is asserted separately in `adapter.contract.ts`.)
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

    // createdAt AND updatedAt are both preserved byte-identically — a restore recovers rows, it
    // does not modify them.
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
    // `put` always stamps `updatedAt` fresh (see `adapter.contract.ts`), so back-date the row
    // directly through `restoreMany` — the same path a real backup restore uses — to get a row
    // whose `updatedAt` genuinely predates "now" without depending on the clock.
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
});

// ---------------------------------------------------------------------------
// serializeBundle
// ---------------------------------------------------------------------------

describe("serializeBundle", () => {
  it("is stable: the same data serializes to a byte-identical string", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    await seedFullRun(adapter);

    const bundle = await exportBundle(adapter);
    // exportedAt would otherwise differ by wall-clock time between the two calls below; pin it so
    // this test is about key ORDER stability, not about the clock.
    const fixedBundle: ExportBundle = { ...bundle, exportedAt: "2026-01-01T00:00:00.000Z" };

    expect(serializeBundle(fixedBundle)).toBe(serializeBundle(fixedBundle));
    expect(serializeBundle(fixedBundle)).toBe(serializeBundle({ ...fixedBundle }));
  });
});

// ---------------------------------------------------------------------------
// parseBundle — schemaVersion handling
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// parseBundle — malformed rows
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Import modes
// ---------------------------------------------------------------------------

describe("importBundle — merge", () => {
  it("adds new runs and leaves an existing run's rows byte-identical", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const existing = await seedFullRun(adapter);

    // A second, independent adapter supplies the incoming bundle's new run.
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

    // The new run's rows landed.
    expect(await adapter.runs.get(incoming.run.id)).toBeDefined();
    expect(await adapter.mons.get(incoming.mon.id)).toBeDefined();

    // The existing run's rows are untouched, byte-identical.
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
    // Mutate the incoming (but not the stored) copy, to prove skip means "untouched", not
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

// ---------------------------------------------------------------------------
// Atomicity
// ---------------------------------------------------------------------------

/** Wraps a `StorageAdapter` so `mons.restoreMany` always rejects, mirroring the failure-injection
 * pattern `queries.test.tsx` uses for `useCatchEncounter`. `transaction` re-wraps the scoped
 * adapter it hands to the callback, so the injected failure is visible from inside a transaction
 * too — which is what proves a real rollback rather than just a rejected outer promise.
 *
 * Targets `restoreMany` rather than `putMany` because `importBundle` writes through `restoreMany`
 * (see the "restore is not a modification" fix) — `putMany` is no longer on its write path. */
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

    // Nothing was written: not the incoming run (mons.putMany failed after runs/routes had
    // already been written this pass), and — critically — not even the pre-existing run that
    // `clear()` had already removed before the failure. A real rollback restores that too.
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
