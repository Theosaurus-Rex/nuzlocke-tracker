import { describe, expect, it } from "vitest";

import { DEFAULT_RULES } from "@/domain/rules";
import type { CatchDetails } from "@/domain/transitions";
import type { Rules } from "@/domain/types";

import type { StorageAdapter } from "./adapter";
import { createMemoryAdapter } from "./memory-adapter";
import { persistCatchShinyBonus, persistResetEncounter } from "./mutations";

const details: CatchDetails = {
  speciesId: "rattata",
  levelCaught: 3,
  level: 4,
  placement: "party",
  nickname: null,
  gender: null,
  nature: null,
  ability: null,
  heldItem: null,
  moves: [],
  shiny: false,
};

async function seed(rules: Partial<Rules> = { shinyClause: true }) {
  const adapter = createMemoryAdapter();
  await adapter.init();
  const run = await adapter.runs.put({
    name: "Run",
    game: "heartgold",
    status: "active",
    rules: { ...DEFAULT_RULES, ...rules },
    finishedAt: null,
  });
  const route = await adapter.routes.put({
    runId: run.id,
    name: "Route 29",
    order: 1,
    isCustom: false,
    gameRouteId: null,
  });
  const encounter = await adapter.encounters.put({
    runId: run.id,
    routeId: route.id,
    status: "missed",
    speciesId: "pidgey",
    level: null,
    monId: null,
    notes: null,
  });
  return { adapter, run, route, encounter };
}

async function counts(adapter: StorageAdapter) {
  return {
    mons: (await adapter.mons.getAll()).length,
    encounters: await adapter.encounters.getAll(),
    routes: await adapter.routes.getAll(),
  };
}

describe("persistCatchShinyBonus", () => {
  it("saves a shiny mon with no encounter, tied to the route, and leaves the encounter alone", async () => {
    const { adapter, run, route, encounter } = await seed();

    const mon = await persistCatchShinyBonus(adapter, {
      runId: run.id,
      routeId: route.id,
      details,
    });

    expect(mon).toMatchObject({
      runId: run.id,
      encounterId: null,
      caughtRouteId: route.id,
      shiny: true,
      status: "party",
    });
    expect(await adapter.mons.getAll()).toHaveLength(1);
    expect(await adapter.encounters.getAll()).toEqual([encounter]);
  });

  it("refuses when the shiny clause is off and writes nothing", async () => {
    const { adapter, run, route } = await seed({ shinyClause: false });
    const before = await counts(adapter);

    await expect(
      persistCatchShinyBonus(adapter, { runId: run.id, routeId: route.id, details }),
    ).rejects.toThrow(/shiny clause/i);

    expect(await counts(adapter)).toEqual(before);
  });

  it("refuses a route from another run and writes nothing", async () => {
    const { adapter, run } = await seed();
    const otherRun = await adapter.runs.put({
      name: "Other",
      game: "heartgold",
      status: "active",
      rules: DEFAULT_RULES,
      finishedAt: null,
    });
    const otherRoute = await adapter.routes.put({
      runId: otherRun.id,
      name: "Route 30",
      order: 1,
      isCustom: false,
      gameRouteId: null,
    });
    const before = await counts(adapter);

    await expect(
      persistCatchShinyBonus(adapter, { runId: run.id, routeId: otherRoute.id, details }),
    ).rejects.toThrow(/does not belong/);

    expect(await counts(adapter)).toEqual(before);
  });

  it("survives resetting the route's own encounter", async () => {
    const { adapter, run, route, encounter } = await seed();
    const mon = await persistCatchShinyBonus(adapter, {
      runId: run.id,
      routeId: route.id,
      details,
    });

    await persistResetEncounter(adapter, { encounter });

    expect(await adapter.encounters.getAll()).toEqual([]);
    expect(await adapter.mons.get(mon.id)).toMatchObject({ shiny: true, encounterId: null });
  });
});
