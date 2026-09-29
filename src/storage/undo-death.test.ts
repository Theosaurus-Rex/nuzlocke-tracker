import { describe, expect, it } from "vitest";

import type { StorageAdapter } from "./adapter";
import { createMemoryAdapter } from "./memory-adapter";
import { persistUndoDeath } from "./mutations";

function withFailingDeathsDelete(base: StorageAdapter): StorageAdapter {
  return {
    ...base,
    deaths: { ...base.deaths, delete: () => Promise.reject(new Error("simulated delete failure")) },
    transaction: (fn) => base.transaction((tx) => fn(withFailingDeathsDelete(tx))),
  };
}

async function seed(partySlots: number[]) {
  const adapter = createMemoryAdapter();
  await adapter.init();
  const base = {
    runId: "run-1",
    encounterId: null,
    speciesId: "geodude",
    speciesIdCaught: "geodude",
    nickname: null,
    gender: null,
    level: 19,
    levelCaught: 12,
    nature: null,
    ability: null,
    heldItem: null,
    moves: [],
    boxOrder: null,
    caughtRouteId: null,
    shiny: false,
  };
  for (const slot of partySlots) {
    await adapter.mons.put({ ...base, status: "party", partySlot: slot });
  }
  const mon = await adapter.mons.put({
    ...base,
    nickname: "Rocky",
    status: "dead",
    partySlot: null,
  });
  const death = await adapter.deaths.put({
    runId: "run-1",
    monId: mon.id,
    level: 19,
    routeId: null,
    cause: { type: "status", status: "burn" },
    diedAt: "2026-09-29T10:00:00.000Z",
    notes: null,
  });
  return { adapter, mon, death };
}

describe("persistUndoDeath", () => {
  it("sends the mon to the box and deletes the death", async () => {
    const { adapter, mon, death } = await seed([0]);

    await persistUndoDeath(adapter, { deathId: death.id, placement: "box" });

    const stored = await adapter.mons.get(mon.id);
    expect(stored).toMatchObject({ status: "box", partySlot: null });
    expect(await adapter.deaths.get(death.id)).toBeUndefined();
  });

  it("takes the lowest free party slot when the party has a gap", async () => {
    const { adapter, mon, death } = await seed([0, 2, 3]);

    await persistUndoDeath(adapter, { deathId: death.id, placement: "party" });

    expect(await adapter.mons.get(mon.id)).toMatchObject({ status: "party", partySlot: 1 });
    expect(await adapter.deaths.get(death.id)).toBeUndefined();
  });

  it("changes nothing when the party is full", async () => {
    const { adapter, mon, death } = await seed([0, 1, 2, 3, 4, 5]);

    await expect(
      persistUndoDeath(adapter, { deathId: death.id, placement: "party" }),
    ).rejects.toThrow(/cannot exceed 6/);

    expect(await adapter.deaths.get(death.id)).toBeDefined();
    expect((await adapter.mons.get(mon.id))?.status).toBe("dead");
  });

  it("rolls the mon back to dead when deleting the death fails", async () => {
    const { adapter, mon, death } = await seed([0]);

    await expect(
      persistUndoDeath(withFailingDeathsDelete(adapter), { deathId: death.id, placement: "box" }),
    ).rejects.toThrow("simulated delete failure");

    expect(await adapter.deaths.get(death.id)).toBeDefined();
    expect(await adapter.mons.get(mon.id)).toMatchObject({ status: "dead", partySlot: null });
  });

  it("refuses a death that no longer exists", async () => {
    const { adapter } = await seed([]);

    await expect(
      persistUndoDeath(adapter, { deathId: "missing", placement: "box" }),
    ).rejects.toThrow("Death missing no longer exists.");
  });
});
