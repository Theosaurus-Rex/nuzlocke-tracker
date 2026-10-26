import { describe, expect, it } from "vitest";

import { DEFAULT_RULES } from "@/domain/rules";
import { emptyMoveset } from "@/domain/moveset";
import type { CatchDetails } from "@/domain/transitions";
import type { Rules } from "@/domain/types";

import { createMemoryAdapter } from "./memory-adapter";
import { persistCatchBonus } from "./mutations";

const details: CatchDetails = {
  speciesId: "eevee",
  levelCaught: 20,
  level: 20,
  placement: "party",
  nickname: null,
  gender: null,
  nature: null,
  ability: null,
  heldItem: null,
  moves: emptyMoveset(),
  shiny: false,
};

async function seed(rules: Partial<Rules>) {
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
    name: "Celadon City",
    order: 1,
    isCustom: false,
    gameRouteId: null,
  });
  return { adapter, run, route };
}

describe("persistCatchBonus as a gift", () => {
  it("saves a mon tied to the route and creates no encounter", async () => {
    const { adapter, run, route } = await seed({ giftClause: true });

    const mon = await persistCatchBonus(adapter, {
      kind: "gift",
      runId: run.id,
      routeId: route.id,
      details,
    });

    expect(mon).toMatchObject({ encounterId: null, caughtRouteId: route.id, shiny: false });
    expect(await adapter.encounters.getAll()).toEqual([]);
  });

  it("refuses when the gift clause is off, even if the shiny clause is on", async () => {
    const { adapter, run, route } = await seed({ giftClause: false, shinyClause: true });

    await expect(
      persistCatchBonus(adapter, { kind: "gift", runId: run.id, routeId: route.id, details }),
    ).rejects.toThrow(/gift clause/i);

    expect(await adapter.mons.getAll()).toEqual([]);
  });

  it("refuses a shiny bonus when only the gift clause is on", async () => {
    const { adapter, run, route } = await seed({ giftClause: true, shinyClause: false });

    await expect(
      persistCatchBonus(adapter, { kind: "shiny", runId: run.id, routeId: route.id, details }),
    ).rejects.toThrow(/shiny clause/i);
  });
});
