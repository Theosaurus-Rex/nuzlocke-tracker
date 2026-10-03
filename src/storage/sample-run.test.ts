import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";

import type { StorageAdapter } from "./adapter";
import { createDexieAdapter } from "./dexie-adapter";
import { createMemoryAdapter } from "./memory-adapter";
import { loadSampleRun } from "./sample-run";

const FRAME_5C_NICKNAMES = ["Sprig", "Zubb", "Mud", "Pip", "Tock", "Fizz", "Nut", "Bram", "Coil"];

async function freshAdapter(): Promise<StorageAdapter> {
  const adapter = createMemoryAdapter();
  await adapter.init();
  return adapter;
}

function withFailingDeathsPut(base: StorageAdapter): StorageAdapter {
  return {
    init: () => base.init(),
    runs: base.runs,
    routes: base.routes,
    encounters: base.encounters,
    mons: base.mons,
    deaths: { ...base.deaths, put: () => Promise.reject(new Error("simulated death failure")) },
    fights: base.fights,
    transaction: (fn) => base.transaction((tx) => fn(withFailingDeathsPut(tx))),
    exportAll: () => base.exportAll(),
    clear: () => base.clear(),
    deathsByFight: (fightId) => base.deathsByFight(fightId),
  };
}

describe("loadSampleRun", () => {
  it("creates the run with every mon belonging to it", async () => {
    const adapter = await freshAdapter();
    const run = await loadSampleRun(adapter);

    const mons = await adapter.mons.getAll();
    expect(run.name).toBe("Johto Hardcore");
    expect(mons.every((mon) => mon.runId === run.id)).toBe(true);
    expect(mons.filter((mon) => mon.status === "party")).toHaveLength(4);
    expect(mons.filter((mon) => mon.status === "box")).toHaveLength(35);
    expect(mons.filter((mon) => mon.status === "dead")).toHaveLength(6);
    expect(await adapter.deaths.getAll()).toHaveLength(6);
  });

  it("leaves a gap in the party where the dead mon stood", async () => {
    const adapter = await freshAdapter();
    await loadSampleRun(adapter);

    const party = (await adapter.mons.getAll()).filter((mon) => mon.status === "party");
    expect(party.map((mon) => mon.partySlot).sort()).toEqual([0, 2, 3, 4]);
  });

  it("boxes the nine mons from the design, in order", async () => {
    const adapter = await freshAdapter();
    await loadSampleRun(adapter);

    const boxed = (await adapter.mons.getAll())
      .filter((mon) => mon.status === "box")
      .sort((a, b) => (a.boxOrder ?? 0) - (b.boxOrder ?? 0));
    expect(boxed.slice(0, 9).map((mon) => mon.nickname)).toEqual(FRAME_5C_NICKNAMES);
    expect(boxed.map((mon) => mon.boxOrder)).toEqual(boxed.map((_, index) => index));
    expect(boxed.filter((mon) => mon.shiny).map((mon) => mon.nickname)).toEqual(["Tock"]);
    expect(boxed.filter((mon) => (mon.boxOrder ?? 0) >= 30)).toHaveLength(5);
  });

  it("links each death to exactly one dead mon", async () => {
    const adapter = await freshAdapter();
    await loadSampleRun(adapter);

    const mons = await adapter.mons.getAll();
    const deaths = await adapter.deaths.getAll();
    for (const death of deaths) {
      expect(mons.find((mon) => mon.id === death.monId)?.status).toBe("dead");
    }
    for (const mon of mons.filter((m) => m.status === "dead")) {
      expect(deaths.filter((death) => death.monId === mon.id)).toHaveLength(1);
    }
  });

  it("logs every outcome, including one on the custom route", async () => {
    const adapter = await freshAdapter();
    const run = await loadSampleRun(adapter);

    const encounters = await adapter.encounters.where("runId", run.id);
    const count = (status: string): number => encounters.filter((e) => e.status === status).length;
    expect(count("missed")).toBe(4);
    expect(count("skipped")).toBe(2);
    expect(count("open")).toBe(0);
    const routes = await adapter.routes.where("runId", run.id);
    const custom = routes.find((route) => route.isCustom);
    expect(encounters.some((e) => e.routeId === custom?.id)).toBe(true);
  });

  it("clears every fight up to Bugsy and links a death to him", async () => {
    const adapter = await freshAdapter();
    const run = await loadSampleRun(adapter);

    const fights = await adapter.fights.where("runId", run.id);
    const cleared = fights.filter((fight) => fight.status === "cleared");
    const bugsyFight = fights.find((fight) => fight.name === "Bugsy");
    const ordered = [...fights].sort((a, b) => a.order - b.order);
    const firstPending = ordered.find((fight) => fight.status === "pending");
    expect(firstPending?.order).toBeGreaterThan(bugsyFight?.order ?? Infinity);
    expect(cleared.map((fight) => fight.name)).toEqual(
      expect.arrayContaining(["Falkner", "Bugsy"]),
    );
    expect(cleared.every((fight) => fight.order <= (bugsyFight?.order ?? -1))).toBe(true);
    expect(cleared.every((fight) => fight.clearedAt !== null)).toBe(true);
    const bugsy = fights.find((fight) => fight.name === "Bugsy");
    const deaths = await adapter.deaths.getAll();
    const linked = deaths.filter(
      (d) => d.cause.type === "trainer" && d.cause.fightId === bugsy?.id,
    );
    expect(linked).toHaveLength(1);
    expect(linked[0]?.cause).toMatchObject({ trainerName: null });
  });

  it("makes a separate run each time and leaves an earlier run alone", async () => {
    const adapter = await freshAdapter();
    const first = await loadSampleRun(adapter);
    const runBefore = await adapter.runs.get(first.id);
    const monsBefore = await adapter.mons.where("runId", first.id);

    const second = await loadSampleRun(adapter);

    expect(second.id).not.toBe(first.id);
    expect(await adapter.runs.getAll()).toHaveLength(2);
    expect(await adapter.runs.get(first.id)).toEqual(runBefore);
    expect(await adapter.mons.where("runId", first.id)).toEqual(monsBefore);
    expect(await adapter.mons.where("runId", second.id)).toHaveLength(45);
  });

  it("leaves nothing behind when a write fails partway", async () => {
    const adapter = await freshAdapter();

    await expect(loadSampleRun(withFailingDeathsPut(adapter))).rejects.toThrow(
      "simulated death failure",
    );

    expect(await adapter.runs.getAll()).toEqual([]);
    expect(await adapter.routes.getAll()).toEqual([]);
    expect(await adapter.encounters.getAll()).toEqual([]);
    expect(await adapter.mons.getAll()).toEqual([]);
    expect(await adapter.deaths.getAll()).toEqual([]);
  });
});

describe("loadSampleRun on Dexie", () => {
  let counter = 0;
  let databaseName: string | undefined;

  afterEach(() => {
    if (databaseName !== undefined) {
      indexedDB.deleteDatabase(databaseName);
      databaseName = undefined;
    }
  });

  async function dexieAdapter(): Promise<StorageAdapter> {
    counter += 1;
    databaseName = `nuzlocke-tracker-sample-${Date.now()}-${counter}`;
    const adapter = createDexieAdapter(databaseName);
    await adapter.init();
    return adapter;
  }

  it("loads the party, box and dead mons with a gap in the party", async () => {
    const adapter = await dexieAdapter();
    await loadSampleRun(adapter);

    const mons = await adapter.mons.getAll();
    const party = mons.filter((mon) => mon.status === "party");
    expect(party).toHaveLength(4);
    expect(party.map((mon) => mon.partySlot).sort()).toEqual([0, 2, 3, 4]);
    expect(mons.filter((mon) => mon.status === "box")).toHaveLength(35);
    expect(mons.filter((mon) => mon.status === "dead")).toHaveLength(6);
    expect(await adapter.deaths.getAll()).toHaveLength(6);
  });

  it("leaves nothing behind when a write fails partway", async () => {
    const adapter = await dexieAdapter();

    await expect(loadSampleRun(withFailingDeathsPut(adapter))).rejects.toThrow(
      "simulated death failure",
    );

    expect(await adapter.runs.getAll()).toEqual([]);
    expect(await adapter.routes.getAll()).toEqual([]);
    expect(await adapter.encounters.getAll()).toEqual([]);
    expect(await adapter.mons.getAll()).toEqual([]);
    expect(await adapter.deaths.getAll()).toEqual([]);
  });
});
