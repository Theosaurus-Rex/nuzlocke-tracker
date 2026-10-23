import "fake-indexeddb/auto";

import Dexie from "dexie";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";

import { makeMonDraft } from "@/test/factories";

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

describe("DexieAdapter upgrade to version 2", () => {
  const STORES = {
    runs: "id, status",
    routes: "id, runId",
    encounters: "id, runId, routeId, monId",
    mons: "id, runId, status, encounterId",
    deaths: "id, runId, monId, cause.fightId",
    fights: "id, runId, status",
  };

  async function seedV1(name: string, moves: unknown[]): Promise<void> {
    const legacy = new Dexie(name);
    legacy.version(1).stores(STORES);
    await legacy.table("mons").add({
      ...makeMonDraft("run-1"),
      id: "mon-1",
      moves,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    legacy.close();
  }

  it("pads a mon's moves to four slots and leaves updatedAt alone", async () => {
    await seedV1("upgrade-test-1", ["tackle", "leer"]);
    const adapter = createDexieAdapter("upgrade-test-1");
    await adapter.init();

    const mon = await adapter.mons.get("mon-1");

    expect(mon?.moves).toEqual(["tackle", "leer", null, null]);
    expect(mon?.updatedAt).toBe("2026-01-02T00:00:00.000Z");
  });

  it("leaves a mon that already has four slots as it was", async () => {
    await seedV1("upgrade-test-2", ["tackle", null, "ember", null]);
    const adapter = createDexieAdapter("upgrade-test-2");
    await adapter.init();

    expect((await adapter.mons.get("mon-1"))?.moves).toEqual(["tackle", null, "ember", null]);
  });
});
