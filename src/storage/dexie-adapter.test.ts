import "fake-indexeddb/auto";

import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { runAdapterContractTests } from "./adapter.contract";
import { createDexieAdapter } from "./dexie-adapter";

let counter = 0;
let currentDatabaseName: string | undefined;

// Every test gets its own, uniquely-named IndexedDB database, so state from one test can never
// leak into the next. `afterEach` then deletes it so fake-indexeddb doesn't accumulate a database
// per assertion over the life of the run.
afterEach(() => {
  if (currentDatabaseName !== undefined) {
    indexedDB.deleteDatabase(currentDatabaseName);
    currentDatabaseName = undefined;
  }
});

runAdapterContractTests("DexieAdapter", async () => {
  counter += 1;
  currentDatabaseName = `nuzlocke-tracker-test-${Date.now()}-${counter}`;

  const adapter = createDexieAdapter(currentDatabaseName);
  await adapter.init();
  return adapter;
});

describe("DexieAdapter — mons predating shiny", () => {
  it("reads a mon row saved before shiny existed as shiny: false", async () => {
    counter += 1;
    const databaseName = `nuzlocke-tracker-test-${Date.now()}-${counter}`;
    currentDatabaseName = databaseName;

    // A second, plain connection to the same database, with no reading hook attached, so the
    // row it writes is exactly what a pre-shiny save left behind: no `shiny` key at all.
    const rawDb = new Dexie(databaseName);
    rawDb.version(1).stores({ mons: "id, runId, status, encounterId" });
    await rawDb.open();
    const legacyMon = {
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
    };
    await rawDb.table("mons").put(legacyMon);
    rawDb.close();

    const adapter = createDexieAdapter(databaseName);
    await adapter.init();

    expect((await adapter.mons.get("mon-1"))?.shiny).toBe(false);
    expect((await adapter.mons.getAll())[0]?.shiny).toBe(false);
  });
});

describe("DexieAdapter — runs predating the folded species clause", () => {
  async function readRunWithRules(rules: Record<string, unknown>) {
    counter += 1;
    const databaseName = `nuzlocke-tracker-test-${Date.now()}-${counter}`;
    currentDatabaseName = databaseName;

    const rawDb = new Dexie(databaseName);
    rawDb.version(1).stores({ runs: "id, status" });
    await rawDb.open();
    await rawDb.table("runs").put({
      id: "run-1",
      name: "Legacy",
      status: "active",
      rules,
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
    });
    rawDb.close();

    const adapter = createDexieAdapter(databaseName);
    await adapter.init();
    return adapter;
  }

  it("reads species on and dupes off as dupes on, with no speciesClause key", async () => {
    const adapter = await readRunWithRules({ dupesClause: false, speciesClause: true });

    const rules = (await adapter.runs.get("run-1"))?.rules as unknown as Record<string, unknown>;
    expect(rules.dupesClause).toBe(true);
    expect("speciesClause" in rules).toBe(false);
    const [listed] = await adapter.runs.getAll();
    expect(listed?.rules.dupesClause).toBe(true);
  });

  it("reads both off as dupes off", async () => {
    const adapter = await readRunWithRules({ dupesClause: false, speciesClause: false });

    expect((await adapter.runs.get("run-1"))?.rules.dupesClause).toBe(false);
  });

  it("leaves a run with no speciesClause key alone", async () => {
    const adapter = await readRunWithRules({ dupesClause: true, hardcore: true });

    expect((await adapter.runs.get("run-1"))?.rules).toEqual({ dupesClause: true, hardcore: true });
  });

  it("returns undefined for a run that does not exist", async () => {
    const adapter = await readRunWithRules({ dupesClause: true });

    expect(await adapter.runs.get("missing")).toBeUndefined();
  });
});
