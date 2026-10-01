import { describe, expect, it } from "vitest";

import type { StorageAdapter } from "./adapter";
import { createMemoryAdapter } from "./memory-adapter";
import { persistReorderParty } from "./mutations";

function withSecondMonPutFailing(base: StorageAdapter): StorageAdapter {
  let puts = 0;
  return {
    ...base,
    mons: {
      ...base.mons,
      put: (record) => {
        puts += 1;
        return puts === 2
          ? Promise.reject(new Error("simulated put failure"))
          : base.mons.put(record);
      },
    },
    transaction: (fn) => base.transaction((tx) => fn(withSecondMonPutFailing(tx))),
  };
}

async function seed(partySlots: number[]) {
  const adapter = createMemoryAdapter();
  await adapter.init();
  const ids: string[] = [];
  for (const slot of partySlots) {
    const mon = await adapter.mons.put({
      runId: "run-1",
      encounterId: null,
      speciesId: "geodude",
      speciesIdCaught: "geodude",
      nickname: `Mon${String(slot)}`,
      gender: null,
      level: 10,
      levelCaught: 10,
      nature: null,
      ability: null,
      heldItem: null,
      moves: [],
      status: "party",
      partySlot: slot,
      boxOrder: null,
      caughtRouteId: null,
      shiny: false,
    });
    ids.push(mon.id);
  }
  return { adapter, ids };
}

async function slots(adapter: StorageAdapter, ids: string[]) {
  return Promise.all(ids.map(async (id) => (await adapter.mons.get(id))?.partySlot));
}

describe("persistReorderParty", () => {
  it("writes the new slots, closing gaps", async () => {
    const { adapter, ids } = await seed([0, 2, 5]);

    await persistReorderParty(adapter, { runId: "run-1", orderedIds: [ids[2]!, ids[0]!, ids[1]!] });

    expect(await slots(adapter, ids)).toEqual([1, 2, 0]);
  });

  it("refuses a list that does not match the party and changes nothing", async () => {
    const { adapter, ids } = await seed([0, 1, 2]);

    await expect(
      persistReorderParty(adapter, { runId: "run-1", orderedIds: [ids[1]!, ids[0]!] }),
    ).rejects.toThrow(/exactly once/);

    expect(await slots(adapter, ids)).toEqual([0, 1, 2]);
  });

  it("keeps no slot change when the second write fails", async () => {
    const { adapter, ids } = await seed([0, 1, 2]);

    await expect(
      persistReorderParty(withSecondMonPutFailing(adapter), {
        runId: "run-1",
        orderedIds: [ids[2]!, ids[1]!, ids[0]!],
      }),
    ).rejects.toThrow("simulated put failure");

    expect(await slots(adapter, ids)).toEqual([0, 1, 2]);
  });
});
