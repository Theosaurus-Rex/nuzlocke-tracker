import "fake-indexeddb/auto";

import Dexie from "dexie";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach } from "vitest";

import { runAdapterContractTests } from "./adapter.contract";
import { createDexieAdapter } from "./dexie-adapter";

let counter = 0;

// Each test gets a fresh in-memory IndexedDB, so state cannot leak and no database is ever
// deleted while a connection to it is open.
beforeEach(() => {
  Dexie.dependencies.indexedDB = new IDBFactory();
});

runAdapterContractTests("DexieAdapter", async () => {
  counter += 1;
  const adapter = createDexieAdapter(`nuzlocke-tracker-test-${counter}`);
  await adapter.init();
  return adapter;
});
