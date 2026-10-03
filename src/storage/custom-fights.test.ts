import { describe, expect, it } from "vitest";

import { currentLevelCap } from "@/domain/rules-summary";
import type { Fight } from "@/domain/types";

import type { StorageAdapter } from "./adapter";
import { createMemoryAdapter } from "./memory-adapter";
import { persistAddCustomFight, persistCreateRun, persistDeleteCustomFight } from "./mutations";

async function seed() {
  const adapter = createMemoryAdapter();
  await adapter.init();
  const run = await persistCreateRun(adapter, { name: "Test", game: "heartgold" });
  const ordered = async () =>
    (await adapter.fights.where("runId", run.id)).sort((a, b) => a.order - b.order);
  const find = async (gameFightId: string) => {
    const fight = (await ordered()).find((f) => f.gameFightId === gameFightId);
    if (!fight) throw new Error(`missing ${gameFightId}`);
    return fight;
  };
  return { adapter, run, ordered, find };
}

const names = (fights: Fight[]) => fights.map((f) => f.name);

async function snapshot(adapter: StorageAdapter) {
  const bundle = await adapter.exportAll();
  return JSON.stringify({ ...bundle, exportedAt: null });
}

describe("persistAddCustomFight", () => {
  it("lands between the fight before and the target", async () => {
    const { adapter, run, ordered, find } = await seed();
    const falkner = await find("gym-falkner");

    const added = await persistAddCustomFight(adapter, {
      runId: run.id,
      name: "  Rematch  ",
      levelCap: null,
      beforeFightId: falkner.id,
    });

    expect(added).toMatchObject({
      kind: "custom",
      gameFightId: null,
      grantsBadge: false,
      status: "pending",
      clearedAt: null,
      name: "Rematch",
      levelCap: null,
    });
    const list = names(await ordered());
    const index = list.indexOf("Rematch");
    expect(list[index + 1]).toBe(falkner.name);
    expect(list[index - 1]).toBe((await find("rival-silver-1")).name);
  });

  it("goes first when added before the first fight", async () => {
    const { adapter, run, ordered } = await seed();
    const first = (await ordered())[0]!;

    await persistAddCustomFight(adapter, {
      runId: run.id,
      name: "Opener",
      levelCap: null,
      beforeFightId: first.id,
    });

    expect((await ordered())[0]?.name).toBe("Opener");
  });

  it("makes its cap the current cap while it is next", async () => {
    const { adapter, run, ordered } = await seed();
    const first = (await ordered())[0]!;

    await persistAddCustomFight(adapter, {
      runId: run.id,
      name: "Capped",
      levelCap: 7,
      beforeFightId: first.id,
    });

    expect(currentLevelCap(await ordered())).toBe(7);
  });

  it("respaces when the gap is closed and still lands in the right place", async () => {
    const { adapter, run, ordered, find } = await seed();
    const falkner = await find("gym-falkner");
    const added: string[] = [];

    for (let i = 0; i < 12; i++) {
      const fight = await persistAddCustomFight(adapter, {
        runId: run.id,
        name: `Extra ${i}`,
        levelCap: null,
        beforeFightId: falkner.id,
      });
      added.push(fight.name);
    }

    const list = await ordered();
    expect(new Set(list.map((f) => f.order)).size).toBe(list.length);
    const listNames = names(list);
    const falknerIndex = listNames.indexOf(falkner.name);
    expect(listNames.slice(falknerIndex - 12, falknerIndex)).toEqual(added);
    expect(listNames[falknerIndex - 13]).toBe((await find("rival-silver-1")).name);
  });

  it("throws when the target is already cleared", async () => {
    const { adapter, run, find } = await seed();
    const first = await find("rival-silver-1");
    await adapter.fights.put({
      ...first,
      status: "cleared",
      clearedAt: "2026-10-01T00:00:00.000Z",
    });
    const before = await snapshot(adapter);

    await expect(
      persistAddCustomFight(adapter, {
        runId: run.id,
        name: "Late",
        levelCap: null,
        beforeFightId: first.id,
      }),
    ).rejects.toThrow();
    expect(await snapshot(adapter)).toBe(before);
  });

  it("throws when the target belongs to another run", async () => {
    const { adapter, run } = await seed();
    const other = await persistCreateRun(adapter, { name: "Other", game: "heartgold" });
    const [otherFight] = await adapter.fights.where("runId", other.id);

    await expect(
      persistAddCustomFight(adapter, {
        runId: run.id,
        name: "Wrong",
        levelCap: null,
        beforeFightId: otherFight!.id,
      }),
    ).rejects.toThrow();
  });

  it("adds at the end when there is no target", async () => {
    const { adapter, run, ordered } = await seed();

    await persistAddCustomFight(adapter, {
      runId: run.id,
      name: "Epilogue",
      levelCap: null,
      beforeFightId: null,
    });

    const list = await ordered();
    expect(list.at(-1)?.name).toBe("Epilogue");
  });
});

describe("persistDeleteCustomFight", () => {
  async function withCustom() {
    const ctx = await seed();
    const first = (await ctx.ordered())[0]!;
    const custom = await persistAddCustomFight(ctx.adapter, {
      runId: ctx.run.id,
      name: "Custom",
      levelCap: null,
      beforeFightId: first.id,
    });
    return { ...ctx, custom };
  }

  it("deletes a pending custom fight with no deaths", async () => {
    const { adapter, custom } = await withCustom();

    await persistDeleteCustomFight(adapter, { fight: custom });

    expect(await adapter.fights.get(custom.id)).toBeUndefined();
  });

  it("refuses a seeded fight and writes nothing", async () => {
    const { adapter, find } = await withCustom();
    const seeded = await find("gym-falkner");
    const before = await snapshot(adapter);

    await expect(persistDeleteCustomFight(adapter, { fight: seeded })).rejects.toThrow();
    expect(await snapshot(adapter)).toBe(before);
  });

  it("refuses a cleared custom fight", async () => {
    const { adapter, custom } = await withCustom();
    const cleared = await adapter.fights.put({
      ...custom,
      status: "cleared",
      clearedAt: "2026-10-01T00:00:00.000Z",
    });
    const before = await snapshot(adapter);

    await expect(persistDeleteCustomFight(adapter, { fight: cleared })).rejects.toThrow();
    expect(await snapshot(adapter)).toBe(before);
  });

  it("refuses a custom fight with a linked death", async () => {
    const { adapter, run, custom } = await withCustom();
    await adapter.deaths.put({
      runId: run.id,
      monId: "mon-1",
      level: 10,
      routeId: null,
      cause: {
        type: "trainer",
        fightId: custom.id,
        trainerName: null,
        species: "pidgey",
        level: 9,
        move: null,
      },
      diedAt: "2026-10-01T00:00:00.000Z",
      notes: null,
    });
    const before = await snapshot(adapter);

    await expect(persistDeleteCustomFight(adapter, { fight: custom })).rejects.toThrow();
    expect(await snapshot(adapter)).toBe(before);
  });
});
