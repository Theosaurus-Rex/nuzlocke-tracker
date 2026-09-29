import { describe, expect, it } from "vitest";

import type { Cause } from "@/domain/types";

import { createMemoryAdapter } from "./memory-adapter";
import { persistEditDeath } from "./mutations";

const STORED_CAUSE: Cause = {
  type: "trainer",
  fightId: null,
  trainerName: "Joey",
  species: "pidgey",
  level: 9,
  move: "gust",
};
const STORED_DIED_AT = "2026-09-29T10:00:00.000Z";

async function seed() {
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
    moves: ["tackle"],
    status: "dead",
    partySlot: null,
    boxOrder: null,
    caughtRouteId: null,
    shiny: false,
  });
  const death = await adapter.deaths.put({
    runId: "run-1",
    monId: mon.id,
    level: 19,
    routeId: "route-1",
    cause: STORED_CAUSE,
    diedAt: STORED_DIED_AT,
    notes: "first note",
  });
  return { adapter, mon, death };
}

describe("persistEditDeath", () => {
  it("replaces cause, route and notes and leaves when, level, who and the mon alone", async () => {
    const { adapter, mon, death } = await seed();
    const monBefore = await adapter.mons.get(mon.id);

    await persistEditDeath(adapter, {
      deathId: death.id,
      cause: { type: "status", status: "burn" },
      routeId: null,
      notes: null,
    });

    const stored = await adapter.deaths.get(death.id);
    expect(stored).toMatchObject({
      cause: { type: "status", status: "burn" },
      routeId: null,
      notes: null,
      diedAt: STORED_DIED_AT,
      level: 19,
      monId: mon.id,
    });
    expect(await adapter.mons.get(mon.id)).toEqual(monBefore);
    expect(await adapter.deaths.getAll()).toHaveLength(1);
  });

  it("refuses a death that no longer exists", async () => {
    const { adapter } = await seed();

    await expect(
      persistEditDeath(adapter, {
        deathId: "gone",
        cause: { type: "other", detail: "x" },
        routeId: null,
        notes: null,
      }),
    ).rejects.toThrow("Death gone no longer exists.");
    expect(await adapter.deaths.getAll()).toHaveLength(1);
  });
});
