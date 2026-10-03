import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";

import { createDexieAdapter } from "./dexie-adapter";
import { persistLogFightAttempt } from "./mutations";

const AT = "2026-09-30T10:00:00.000Z";
let databaseName: string | undefined;

afterEach(() => {
  if (databaseName !== undefined) {
    indexedDB.deleteDatabase(databaseName);
    databaseName = undefined;
  }
});

describe("persistLogFightAttempt on Dexie", () => {
  it("rolls back earlier deaths and the clear when a later loss is a dead mon", async () => {
    databaseName = `fight-attempt-${String(Date.now())}`;
    const adapter = createDexieAdapter(databaseName);
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
    const alive = await adapter.mons.put({ ...base, status: "party", partySlot: 0 });
    const dead = await adapter.mons.put({ ...base, status: "dead", partySlot: null });
    const fight = await adapter.fights.put({
      runId: "run-1",
      gameFightId: null,
      name: "Falkner",
      kind: "gym",
      order: 1,
      grantsBadge: true,
      levelCap: 15,
      status: "pending",
      clearedAt: null,
    });
    const loss = (monId: string) => ({ monId, species: "pidgey", level: 9, move: null });

    await expect(
      persistLogFightAttempt(adapter, {
        fightId: fight.id,
        won: true,
        losses: [loss(alive.id), loss(dead.id)],
        at: AT,
      }),
    ).rejects.toThrow(/already dead/);

    expect((await adapter.mons.get(alive.id))?.status).toBe("party");
    expect(await adapter.deaths.getAll()).toHaveLength(0);
    expect((await adapter.fights.get(fight.id))?.status).toBe("pending");
  });
});
