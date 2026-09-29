import { describe, expect, it } from "vitest";

import type { Cause } from "@/domain/types";

import type { StorageAdapter } from "./adapter";
import { createMemoryAdapter } from "./memory-adapter";
import { persistLogDeath } from "./mutations";

const CAUSE: Cause = { type: "wild", species: "pidgey", level: 9, move: "gust" };
const DIED_AT = "2026-09-29T10:00:00.000Z";

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

async function seed(status: "party" | "dead" = "party") {
  const adapter = createMemoryAdapter();
  await adapter.init();
  const mon = await adapter.mons.put({
    runId: "run-1",
    encounterId: null,
    speciesId: "geodude",
    speciesIdCaught: "geodude",
    nickname: "Rocky",
    gender: null,
    level: 19,
    levelCaught: 12,
    nature: null,
    ability: null,
    heldItem: null,
    moves: [],
    status,
    partySlot: status === "party" ? 2 : null,
    boxOrder: null,
    caughtRouteId: null,
    shiny: false,
  });
  return { adapter, mon };
}

const input = (monId: string) => ({
  monId,
  cause: CAUSE,
  routeId: "route-9",
  notes: "too brave",
  diedAt: DIED_AT,
});

describe("persistLogDeath", () => {
  it("kills the mon and writes a matching death row", async () => {
    const { adapter, mon } = await seed();

    const result = await persistLogDeath(adapter, input(mon.id));

    const stored = await adapter.mons.get(mon.id);
    expect(stored?.status).toBe("dead");
    expect(stored?.partySlot).toBeNull();
    const [death] = await adapter.deaths.getAll();
    expect(death).toMatchObject({
      id: result.death.id,
      runId: "run-1",
      monId: mon.id,
      level: 19,
      routeId: "route-9",
      cause: CAUSE,
      diedAt: DIED_AT,
      notes: "too brave",
    });
  });

  it("refuses a dead mon and writes no death row", async () => {
    const { adapter, mon } = await seed("dead");

    await expect(persistLogDeath(adapter, input(mon.id))).rejects.toThrow();

    expect(await adapter.deaths.getAll()).toHaveLength(0);
  });

  it("refuses a mon that does not exist", async () => {
    const { adapter } = await seed();

    await expect(persistLogDeath(adapter, input("missing"))).rejects.toThrow(/no longer exists/);
    expect(await adapter.deaths.getAll()).toHaveLength(0);
  });

  it("leaves the mon alive when the death write fails", async () => {
    const { adapter, mon } = await seed();

    await expect(persistLogDeath(withFailingDeathsPut(adapter), input(mon.id))).rejects.toThrow(
      "simulated death failure",
    );

    const stored = await adapter.mons.get(mon.id);
    expect(stored?.status).toBe("party");
    expect(stored?.partySlot).toBe(2);
    expect(await adapter.deaths.getAll()).toHaveLength(0);
  });
});
