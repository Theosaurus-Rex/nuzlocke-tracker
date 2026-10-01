import { describe, expect, it } from "vitest";

import type { Mon } from "@/domain/types";

import type { StorageAdapter } from "./adapter";
import { createMemoryAdapter } from "./memory-adapter";
import { persistMoveMonToParty } from "./mutations";

function withMonPutFailing(base: StorageAdapter): StorageAdapter {
  return {
    ...base,
    mons: { ...base.mons, put: () => Promise.reject(new Error("simulated put failure")) },
    transaction: (fn) => base.transaction((tx) => fn(withMonPutFailing(tx))),
  };
}

async function putMon(adapter: StorageAdapter, overrides: Partial<Mon>): Promise<Mon> {
  return adapter.mons.put({
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
    status: "party",
    partySlot: 0,
    boxOrder: null,
    caughtRouteId: null,
    shiny: false,
    ...overrides,
  });
}

async function seedParty(slots: number[]) {
  const adapter = createMemoryAdapter();
  await adapter.init();
  for (const slot of slots) {
    await putMon(adapter, { partySlot: slot });
  }
  const boxed = await putMon(adapter, { status: "box", partySlot: null, boxOrder: 0 });
  return { adapter, boxed };
}

describe("persistMoveMonToParty", () => {
  it("puts a boxed mon in the lowest free slot when the party has a gap", async () => {
    const { adapter, boxed } = await seedParty([0, 2]);

    await persistMoveMonToParty(adapter, { monId: boxed.id });

    expect(await adapter.mons.get(boxed.id)).toMatchObject({ status: "party", partySlot: 1 });
  });

  it("refuses a full party and leaves the mon boxed", async () => {
    const { adapter, boxed } = await seedParty([0, 1, 2, 3, 4, 5]);

    await expect(persistMoveMonToParty(adapter, { monId: boxed.id })).rejects.toThrow(
      /cannot exceed 6/,
    );

    expect(await adapter.mons.get(boxed.id)).toMatchObject({ status: "box", partySlot: null });
  });

  it("refuses a dead mon", async () => {
    const { adapter } = await seedParty([0]);
    const dead = await putMon(adapter, { status: "dead", partySlot: null });

    await expect(persistMoveMonToParty(adapter, { monId: dead.id })).rejects.toThrow();

    expect(await adapter.mons.get(dead.id)).toMatchObject({ status: "dead", partySlot: null });
  });

  it("refuses a mon that does not exist", async () => {
    const { adapter } = await seedParty([]);

    await expect(persistMoveMonToParty(adapter, { monId: "missing" })).rejects.toThrow(/not found/);
  });

  it("leaves the mon boxed when the write fails", async () => {
    const { adapter, boxed } = await seedParty([0]);

    await expect(
      persistMoveMonToParty(withMonPutFailing(adapter), { monId: boxed.id }),
    ).rejects.toThrow("simulated put failure");

    expect(await adapter.mons.get(boxed.id)).toMatchObject({ status: "box", partySlot: null });
  });
});
