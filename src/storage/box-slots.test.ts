import { describe, expect, it } from "vitest";

import { boxLayout } from "@/domain/box-slots";
import type { CatchDetails, MonAmendments } from "@/domain/transitions";
import type { Mon } from "@/domain/types";

import type { StorageAdapter } from "./adapter";
import { createMemoryAdapter } from "./memory-adapter";
import {
  persistAmendMon,
  persistCatch,
  persistLogDeath,
  persistMoveMonToParty,
  persistResetEncounter,
  persistUndoDeath,
} from "./mutations";

const DETAILS: CatchDetails = {
  speciesId: "geodude",
  levelCaught: 10,
  level: 10,
  placement: "box",
  nickname: null,
  gender: null,
  nature: null,
  ability: null,
  heldItem: null,
  moves: [],
  shiny: false,
};

const AMENDMENTS: MonAmendments = {
  nickname: "Rocky",
  gender: null,
  level: 12,
  nature: null,
  ability: null,
  heldItem: null,
  moves: [],
  shiny: false,
};

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
    status: "box",
    partySlot: null,
    boxOrder: null,
    caughtRouteId: null,
    shiny: false,
    ...overrides,
  });
}

async function seed() {
  const adapter = createMemoryAdapter();
  await adapter.init();
  return adapter;
}

async function openEncounter(adapter: StorageAdapter) {
  return adapter.encounters.put({
    runId: "run-1",
    routeId: "route-1",
    status: "open",
    speciesId: null,
    level: null,
    monId: null,
    notes: null,
  });
}

const runMons = (adapter: StorageAdapter) => adapter.mons.where("runId", "run-1");

describe("box slots on write", () => {
  it("a box catch takes the lowest free slot when the box has a gap", async () => {
    const adapter = await seed();
    await putMon(adapter, { boxOrder: 0 });
    await putMon(adapter, { boxOrder: 1 });
    await putMon(adapter, { boxOrder: 3 });
    const encounter = await openEncounter(adapter);

    const { mon } = await persistCatch(adapter, { encounter, details: DETAILS });

    expect(mon).toMatchObject({ status: "box", boxOrder: 2 });
  });

  it("a party catch gets no box slot", async () => {
    const adapter = await seed();
    const encounter = await openEncounter(adapter);

    const { mon } = await persistCatch(adapter, {
      encounter,
      details: { ...DETAILS, placement: "party" },
    });

    expect(mon).toMatchObject({ status: "party", boxOrder: null });
  });

  it("amending to the box takes the lowest free slot", async () => {
    const adapter = await seed();
    await putMon(adapter, { boxOrder: 0 });
    await putMon(adapter, { boxOrder: 2 });
    const party = await putMon(adapter, { status: "party", partySlot: 0 });

    const result = await persistAmendMon(adapter, {
      mon: party,
      amendments: AMENDMENTS,
      placement: "box",
    });

    expect(result).toMatchObject({ status: "box", partySlot: null, boxOrder: 1 });
  });

  it("undoing a death to the box takes the lowest free slot", async () => {
    const adapter = await seed();
    await putMon(adapter, { boxOrder: 0 });
    await putMon(adapter, { boxOrder: 1 });
    const dead = await putMon(adapter, { status: "dead" });
    const death = await adapter.deaths.put({
      runId: "run-1",
      monId: dead.id,
      level: 10,
      routeId: null,
      cause: { type: "status", status: "burn" },
      diedAt: "2026-09-29T10:00:00.000Z",
      notes: null,
    });

    const revived = await persistUndoDeath(adapter, { deathId: death.id, placement: "box" });

    expect(revived).toMatchObject({ status: "box", boxOrder: 2 });
  });

  it("moving a mon to the party clears its slot", async () => {
    const adapter = await seed();
    const boxed = await putMon(adapter, { boxOrder: 4 });

    const result = await persistMoveMonToParty(adapter, { monId: boxed.id });

    expect(result).toMatchObject({ status: "party", boxOrder: null });
  });

  it("logging a death clears the slot", async () => {
    const adapter = await seed();
    const boxed = await putMon(adapter, { boxOrder: 4 });

    const { mon } = await persistLogDeath(adapter, {
      monId: boxed.id,
      cause: { type: "status", status: "burn" },
      routeId: null,
      notes: null,
      diedAt: "2026-09-29T10:00:00.000Z",
    });

    expect(mon).toMatchObject({ status: "dead", boxOrder: null });
  });
});

describe("settling existing runs", () => {
  async function seedUnsettled() {
    const adapter = await seed();
    const early = await putMon(adapter, { createdAt: "2026-09-01T00:00:00.000Z" });
    const fixed = await putMon(adapter, { boxOrder: 0, createdAt: "2026-09-02T00:00:00.000Z" });
    const late = await putMon(adapter, { createdAt: "2026-09-03T00:00:00.000Z" });
    const leaver = await putMon(adapter, { boxOrder: 5, createdAt: "2026-09-04T00:00:00.000Z" });
    return { adapter, early, fixed, late, leaver };
  }

  it("a later write pins null mons to the positions the layout showed before it", async () => {
    const { adapter, early, fixed, late, leaver } = await seedUnsettled();
    const before = boxLayout(await runMons(adapter));
    expect(before.get(early.id)).toBe(1);
    expect(before.get(late.id)).toBe(2);

    await persistMoveMonToParty(adapter, { monId: leaver.id });

    const stored = new Map((await runMons(adapter)).map((mon) => [mon.id, mon.boxOrder]));
    expect(stored.get(early.id)).toBe(before.get(early.id));
    expect(stored.get(fixed.id)).toBe(before.get(fixed.id));
    expect(stored.get(late.id)).toBe(before.get(late.id));
  });

  it("a death leaves the other mons where they were shown", async () => {
    const { adapter, early, late, leaver } = await seedUnsettled();
    const before = boxLayout(await runMons(adapter));

    await persistLogDeath(adapter, {
      monId: leaver.id,
      cause: { type: "status", status: "burn" },
      routeId: null,
      notes: null,
      diedAt: "2026-09-29T10:00:00.000Z",
    });

    expect((await adapter.mons.get(early.id))?.boxOrder).toBe(before.get(early.id));
    expect((await adapter.mons.get(late.id))?.boxOrder).toBe(before.get(late.id));
  });

  it("a catch lands after the settled mons, not on top of them", async () => {
    const { adapter } = await seedUnsettled();
    const encounter = await openEncounter(adapter);

    const { mon } = await persistCatch(adapter, { encounter, details: DETAILS });

    expect(mon.boxOrder).toBe(3);
  });

  it("a catch writes the layout slots of the null mons", async () => {
    const { adapter, early, late } = await seedUnsettled();
    const encounter = await openEncounter(adapter);

    await persistCatch(adapter, { encounter, details: DETAILS });

    expect((await adapter.mons.get(early.id))?.boxOrder).toBe(1);
    expect((await adapter.mons.get(late.id))?.boxOrder).toBe(2);
  });

  it("resetting an encounter pins the null mons before the mon is deleted", async () => {
    const { adapter, early, late, leaver } = await seedUnsettled();
    const encounter = await adapter.encounters.put({
      runId: "run-1",
      routeId: "route-1",
      status: "caught",
      speciesId: "geodude",
      level: 10,
      monId: leaver.id,
      notes: null,
    });
    await adapter.mons.put({ ...leaver, encounterId: encounter.id });

    await persistResetEncounter(adapter, { encounter });

    expect((await adapter.mons.get(early.id))?.boxOrder).toBe(1);
    expect((await adapter.mons.get(late.id))?.boxOrder).toBe(2);
  });

  it("amending without a placement change keeps the settled slot", async () => {
    const { adapter, early } = await seedUnsettled();
    expect(early.boxOrder).toBeNull();

    const result = await persistAmendMon(adapter, { mon: early, amendments: AMENDMENTS });

    expect(result.boxOrder).toBe(1);
    expect((await adapter.mons.get(early.id))?.boxOrder).toBe(1);
  });

  it("amending a settled mon from a stale copy keeps the real slot", async () => {
    const adapter = await seed();
    const mon = await putMon(adapter, { boxOrder: 7 });

    await persistAmendMon(adapter, { mon: { ...mon, boxOrder: null }, amendments: AMENDMENTS });

    expect((await adapter.mons.get(mon.id))?.boxOrder).toBe(7);
  });
});
