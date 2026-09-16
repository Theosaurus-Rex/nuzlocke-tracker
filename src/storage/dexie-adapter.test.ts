import "fake-indexeddb/auto";

import { afterEach } from "vitest";

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
