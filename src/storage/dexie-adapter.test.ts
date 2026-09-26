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
