import { describe, expect, it } from "vitest";

import type { Mon } from "@/domain/types";

import type { StorageAdapter } from "./adapter";
import { createMemoryAdapter } from "./memory-adapter";
import { persistLogFightAttempt, persistUndoClearFight } from "./mutations";

const AT = "2026-09-30T10:00:00.000Z";

function withFailingFightsPut(base: StorageAdapter): StorageAdapter {
  return {
    init: () => base.init(),
    runs: base.runs,
    routes: base.routes,
    encounters: base.encounters,
    mons: base.mons,
    deaths: base.deaths,
    fights: { ...base.fights, put: () => Promise.reject(new Error("simulated fight failure")) },
    transaction: (fn) => base.transaction((tx) => fn(withFailingFightsPut(tx))),
    exportAll: () => base.exportAll(),
    clear: () => base.clear(),
    deathsByFight: (fightId) => base.deathsByFight(fightId),
  };
}

async function seed() {
  const adapter = createMemoryAdapter();
  await adapter.init();
  const putMon = (overrides: Partial<Mon>) =>
    adapter.mons.put({
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
      status: "party",
      partySlot: 0,
      boxOrder: null,
      caughtRouteId: null,
      shiny: false,
      ...overrides,
    });
  const a = await putMon({ partySlot: 0, level: 21 });
  const b = await putMon({ partySlot: 1, level: 22 });
  const c = await putMon({ partySlot: 2 });
  const other = await putMon({ runId: "run-2", partySlot: 0 });
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
  return { adapter, a, b, c, other, fight };
}

const loss = (monId: string, species = "pidgeotto") => ({
  monId,
  species,
  level: 15,
  move: "gust",
});

describe("persistLogFightAttempt", () => {
  it("kills each lost mon with a trainer cause and clears a won fight", async () => {
    const { adapter, a, b, c, fight } = await seed();

    const result = await persistLogFightAttempt(adapter, {
      fightId: fight.id,
      won: true,
      losses: [loss(a.id), loss(b.id, "pidgey")],
      at: AT,
    });

    expect(result.deaths).toHaveLength(2);
    expect(result.deaths[0]).toMatchObject({
      monId: a.id,
      level: 21,
      routeId: null,
      diedAt: AT,
      notes: null,
      cause: {
        type: "trainer",
        fightId: fight.id,
        trainerName: null,
        species: "pidgeotto",
        level: 15,
        move: "gust",
      },
    });
    expect(result.deaths[1]?.cause).toMatchObject({ species: "pidgey", fightId: fight.id });
    expect((await adapter.mons.get(a.id))?.status).toBe("dead");
    expect((await adapter.mons.get(b.id))?.status).toBe("dead");
    expect((await adapter.mons.get(c.id))?.partySlot).toBe(2);
    expect(await adapter.deathsByFight(fight.id)).toHaveLength(2);
    expect(result.fight).toMatchObject({ status: "cleared", clearedAt: AT });
    expect(await adapter.fights.get(fight.id)).toMatchObject({ status: "cleared", clearedAt: AT });
  });

  it("keeps the fight pending after a lost attempt", async () => {
    const { adapter, a, fight } = await seed();

    const result = await persistLogFightAttempt(adapter, {
      fightId: fight.id,
      won: false,
      losses: [loss(a.id)],
      at: AT,
    });

    expect((await adapter.mons.get(a.id))?.status).toBe("dead");
    expect(result.deaths).toHaveLength(1);
    expect(result.fight).toMatchObject({ status: "pending", clearedAt: null });
    expect(await adapter.fights.get(fight.id)).toMatchObject({ status: "pending" });
  });

  it("only clears the fight when won with no losses", async () => {
    const { adapter, fight } = await seed();

    const result = await persistLogFightAttempt(adapter, {
      fightId: fight.id,
      won: true,
      losses: [],
      at: AT,
    });

    expect(result.deaths).toEqual([]);
    expect(await adapter.deaths.getAll()).toHaveLength(0);
    expect(result.fight.status).toBe("cleared");
  });

  it("undoes the first death when a later loss names a dead mon", async () => {
    const { adapter, a, b, fight } = await seed();
    await adapter.mons.put({ ...b, status: "dead", partySlot: null });

    await expect(
      persistLogFightAttempt(adapter, {
        fightId: fight.id,
        won: true,
        losses: [loss(a.id), loss(b.id)],
        at: AT,
      }),
    ).rejects.toThrow(/already dead/);

    expect((await adapter.mons.get(a.id))?.status).toBe("party");
    expect(await adapter.deaths.getAll()).toHaveLength(0);
    expect((await adapter.fights.get(fight.id))?.status).toBe("pending");
  });

  it("undoes the deaths when the fight write fails", async () => {
    const { adapter, a, fight } = await seed();

    await expect(
      persistLogFightAttempt(withFailingFightsPut(adapter), {
        fightId: fight.id,
        won: true,
        losses: [loss(a.id)],
        at: AT,
      }),
    ).rejects.toThrow("simulated fight failure");

    expect((await adapter.mons.get(a.id))?.status).toBe("party");
    expect(await adapter.deaths.getAll()).toHaveLength(0);
  });

  it("refuses an already cleared fight and writes nothing", async () => {
    const { adapter, a, fight } = await seed();
    await adapter.fights.put({
      ...fight,
      status: "cleared",
      clearedAt: "2026-09-01T00:00:00.000Z",
    });

    await expect(
      persistLogFightAttempt(adapter, {
        fightId: fight.id,
        won: false,
        losses: [loss(a.id)],
        at: AT,
      }),
    ).rejects.toThrow(/already cleared/);

    expect((await adapter.mons.get(a.id))?.status).toBe("party");
    expect(await adapter.deaths.getAll()).toHaveLength(0);
    expect((await adapter.fights.get(fight.id))?.clearedAt).toBe("2026-09-01T00:00:00.000Z");
  });

  it("refuses a mon from another run", async () => {
    const { adapter, a, other, fight } = await seed();

    await expect(
      persistLogFightAttempt(adapter, {
        fightId: fight.id,
        won: true,
        losses: [loss(a.id), loss(other.id)],
        at: AT,
      }),
    ).rejects.toThrow(/not part of run/);

    expect((await adapter.mons.get(a.id))?.status).toBe("party");
    expect((await adapter.mons.get(other.id))?.status).toBe("party");
    expect(await adapter.deaths.getAll()).toHaveLength(0);
    expect((await adapter.fights.get(fight.id))?.status).toBe("pending");
  });

  it("refuses a fight that does not exist", async () => {
    const { adapter } = await seed();

    await expect(
      persistLogFightAttempt(adapter, { fightId: "missing", won: true, losses: [], at: AT }),
    ).rejects.toThrow(/no longer exists/);
  });
});

describe("persistUndoClearFight", () => {
  it("makes a cleared fight pending again and keeps its deaths", async () => {
    const { adapter, a, fight } = await seed();
    await persistLogFightAttempt(adapter, {
      fightId: fight.id,
      won: true,
      losses: [loss(a.id)],
      at: AT,
    });

    const result = await persistUndoClearFight(adapter, fight.id);

    expect(result).toMatchObject({ status: "pending", clearedAt: null });
    expect(await adapter.fights.get(fight.id)).toMatchObject({
      status: "pending",
      clearedAt: null,
    });
    expect(await adapter.deathsByFight(fight.id)).toHaveLength(1);
    expect((await adapter.mons.get(a.id))?.status).toBe("dead");
  });

  it("refuses a fight that is not cleared", async () => {
    const { adapter, fight } = await seed();

    await expect(persistUndoClearFight(adapter, fight.id)).rejects.toThrow(/not 'cleared'/);
  });
});
