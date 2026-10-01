import { describe, expect, it } from "vitest";

import { BOX_SIZE, boxLayout } from "@/domain/box-slots";

import type { StorageAdapter } from "./adapter";
import { createMemoryAdapter } from "./memory-adapter";
import { persistMoveBoxedMon } from "./mutations";

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

async function seed(boxOrders: (number | null)[]) {
  const adapter = createMemoryAdapter();
  await adapter.init();
  const ids: string[] = [];
  for (const boxOrder of boxOrders) {
    const mon = await adapter.mons.put({
      runId: "run-1",
      encounterId: null,
      speciesId: "geodude",
      speciesIdCaught: "geodude",
      nickname: null,
      gender: null,
      level: 10,
      levelCaught: 10,
      nature: null,
      ability: null,
      heldItem: null,
      moves: [],
      status: "box",
      partySlot: null,
      boxOrder,
      caughtRouteId: null,
      shiny: false,
    });
    ids.push(mon.id);
  }
  return { adapter, ids };
}

async function slots(adapter: StorageAdapter, ids: string[]) {
  return Promise.all(ids.map(async (id) => (await adapter.mons.get(id))?.boxOrder));
}

describe("persistMoveBoxedMon", () => {
  it("saves both mons when two swap", async () => {
    const { adapter, ids } = await seed([0, 1, 2]);

    await persistMoveBoxedMon(adapter, { runId: "run-1", monId: ids[0]!, toSlot: 2 });

    expect(await slots(adapter, ids)).toEqual([2, 1, 0]);
  });

  it("moves a mon into a gap and leaves the others alone", async () => {
    const { adapter, ids } = await seed([0, 1, 2]);

    await persistMoveBoxedMon(adapter, { runId: "run-1", monId: ids[0]!, toSlot: 9 });

    expect(await slots(adapter, ids)).toEqual([9, 1, 2]);
  });

  it("moves a mon into the second box", async () => {
    const { adapter, ids } = await seed([0, 1]);

    await persistMoveBoxedMon(adapter, { runId: "run-1", monId: ids[1]!, toSlot: BOX_SIZE + 4 });

    expect(await slots(adapter, ids)).toEqual([0, BOX_SIZE + 4]);
  });

  it("pins mons that only had a computed slot", async () => {
    const { adapter, ids } = await seed([null, null, null]);
    const shown = boxLayout(await adapter.mons.getAll());
    const [mover, untouched, displaced] = [0, 1, 2].map(
      (slot) => ids.find((id) => shown.get(id) === slot)!,
    );

    await persistMoveBoxedMon(adapter, { runId: "run-1", monId: mover!, toSlot: 2 });

    expect(await slots(adapter, [mover!, untouched!, displaced!])).toEqual([2, 1, 0]);
  });

  it("reads the target slot inside the transaction, not from the caller's view", async () => {
    const { adapter, ids } = await seed([0, 1]);
    const late = await adapter.mons.put({
      ...(await adapter.mons.get(ids[1]!))!,
      boxOrder: 5,
    });

    await persistMoveBoxedMon(adapter, { runId: "run-1", monId: ids[0]!, toSlot: 5 });

    expect(await slots(adapter, [ids[0]!, late.id])).toEqual([5, 0]);
  });

  it("changes nothing when dropped on its own slot", async () => {
    const { adapter, ids } = await seed([0, 1]);
    const before = await adapter.mons.get(ids[0]!);

    await persistMoveBoxedMon(adapter, { runId: "run-1", monId: ids[0]!, toSlot: 0 });

    expect(await adapter.mons.get(ids[0]!)).toEqual(before);
  });

  it("keeps both slots when the second write fails", async () => {
    const { adapter, ids } = await seed([0, 1]);

    await expect(
      persistMoveBoxedMon(withSecondMonPutFailing(adapter), {
        runId: "run-1",
        monId: ids[0]!,
        toSlot: 1,
      }),
    ).rejects.toThrow("simulated put failure");

    expect(await slots(adapter, ids)).toEqual([0, 1]);
  });
});
