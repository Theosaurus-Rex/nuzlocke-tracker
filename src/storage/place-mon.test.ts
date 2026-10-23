import { describe, expect, it } from "vitest";

import { emptyMoveset } from "@/domain/moveset";
import type { Mon } from "@/domain/types";

import type { StorageAdapter } from "./adapter";
import { createMemoryAdapter } from "./memory-adapter";
import { persistPlaceMon } from "./mutations";

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
    moves: emptyMoveset(),
    status: "box",
    partySlot: null,
    boxOrder: 0,
    caughtRouteId: null,
    shiny: false,
    ...overrides,
  });
}

async function seed() {
  const adapter = createMemoryAdapter();
  await adapter.init();
  const party = await putMon(adapter, { status: "party", partySlot: 2, boxOrder: null });
  const boxed = await putMon(adapter, { boxOrder: 7 });
  return { adapter, party, boxed };
}

describe("persistPlaceMon", () => {
  it("moves a box mon into an exact party slot", async () => {
    const { adapter, boxed } = await seed();

    await persistPlaceMon(adapter, {
      runId: "run-1",
      monId: boxed.id,
      to: { kind: "party", slot: 4 },
    });

    expect(await adapter.mons.get(boxed.id)).toMatchObject({ status: "party", partySlot: 4 });
  });

  it("swaps a party mon with a box mon", async () => {
    const { adapter, party, boxed } = await seed();

    await persistPlaceMon(adapter, {
      runId: "run-1",
      monId: boxed.id,
      to: { kind: "party", slot: 2 },
    });

    expect(await adapter.mons.get(boxed.id)).toMatchObject({ status: "party", partySlot: 2 });
    expect(await adapter.mons.get(party.id)).toMatchObject({
      status: "box",
      partySlot: null,
      boxOrder: 7,
    });
  });

  it("swaps two party mons in one write", async () => {
    const { adapter, party } = await seed();
    const other = await putMon(adapter, { status: "party", partySlot: 5, boxOrder: null });

    await persistPlaceMon(adapter, {
      runId: "run-1",
      monId: party.id,
      to: { kind: "party", slot: 5 },
    });

    expect(await adapter.mons.get(party.id)).toMatchObject({ partySlot: 5 });
    expect(await adapter.mons.get(other.id)).toMatchObject({ partySlot: 2 });
  });

  it("changes neither mon when the second write fails", async () => {
    const { adapter, party, boxed } = await seed();

    await expect(
      persistPlaceMon(withSecondMonPutFailing(adapter), {
        runId: "run-1",
        monId: party.id,
        to: { kind: "box", slot: 7 },
      }),
    ).rejects.toThrow("simulated put failure");

    expect(await adapter.mons.get(party.id)).toMatchObject({ status: "party", partySlot: 2 });
    expect(await adapter.mons.get(boxed.id)).toMatchObject({ status: "box", boxOrder: 7 });
  });
});
