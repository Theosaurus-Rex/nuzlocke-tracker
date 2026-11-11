import { describe, expect, it } from "vitest";

import { makeMonDraft } from "@/test/factories";

import type { StorageAdapter } from "./adapter";
import { createMemoryAdapter } from "./memory-adapter";
import { persistLevelParty } from "./mutations";

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

async function seed() {
  const adapter = createMemoryAdapter();
  await adapter.init();
  const put = async (runId: string, overrides: Parameters<typeof makeMonDraft>[1]) =>
    (await adapter.mons.put(makeMonDraft(runId, overrides))).id;
  const ids = {
    low: await put("run-1", { level: 10, partySlot: 0 }),
    gap: await put("run-1", { level: 12, partySlot: 3 }),
    atCap: await put("run-1", { level: 20, partySlot: 4 }),
    boxed: await put("run-1", { level: 5, status: "box", partySlot: null, boxOrder: 0 }),
    otherRun: await put("run-2", { level: 5, partySlot: 0 }),
  };
  return { adapter, ids };
}

async function levels(adapter: StorageAdapter, ids: string[]) {
  return Promise.all(ids.map(async (id) => (await adapter.mons.get(id))?.level));
}

describe("persistLevelParty", () => {
  it("raises the party mons below the cap and leaves the rest", async () => {
    const { adapter, ids } = await seed();

    await persistLevelParty(adapter, { runId: "run-1", cap: 20 });

    expect(await levels(adapter, [ids.low, ids.gap, ids.atCap, ids.boxed, ids.otherRun])).toEqual([
      20, 20, 20, 5, 5,
    ]);
  });

  it("keeps every level when the second write fails", async () => {
    const { adapter, ids } = await seed();

    await expect(
      persistLevelParty(withSecondMonPutFailing(adapter), { runId: "run-1", cap: 20 }),
    ).rejects.toThrow("simulated put failure");

    expect(await levels(adapter, [ids.low, ids.gap])).toEqual([10, 12]);
  });
});
