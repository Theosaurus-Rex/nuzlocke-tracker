/**
 * Route-seeding, custom-route and encounter-logging mutations, tested against the in-memory
 * adapter: atomic writes, invalidation, and the guards around deleting a route or
 * double-logging an encounter.
 */

import type { ReactNode } from "react";

import { onlineManager, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CatchDetails, MonAmendments } from "@/domain/transitions";
import type { Death, Encounter, Fight, Mon, Route, Run } from "@/domain/types";
import { heartgold } from "@/game/data/heartgold";
import { createQueryClient } from "@/lib/query-client";

import type { StorageAdapter } from "./adapter";
import { createMemoryAdapter } from "./memory-adapter";
import {
  useAddCustomRoute,
  useAmendMon,
  useCreateRun,
  useDeleteCustomRoute,
  useLogEncounter,
  useResetEncounter,
} from "./mutations";
import { useEncounters, useMons } from "./queries";
import { StorageProvider } from "./storage-context";

function makeEncounterDraft(
  runId: string,
  routeId: string,
  overrides: Partial<Encounter> = {},
): Omit<Encounter, "id" | "createdAt" | "updatedAt"> {
  return {
    runId,
    routeId,
    status: "open",
    speciesId: null,
    level: null,
    monId: null,
    notes: null,
    ...overrides,
  };
}

function createWrapper(
  adapter: StorageAdapter,
): ({ children }: { children: ReactNode }) => ReactNode {
  const queryClient = createQueryClient({
    queries: { retry: false },
    mutations: { retry: false },
  });

  return function Wrapper({ children }: { children: ReactNode }): ReactNode {
    return (
      <QueryClientProvider client={queryClient}>
        <StorageProvider adapter={adapter}>{children}</StorageProvider>
      </QueryClientProvider>
    );
  };
}

/**
 * Wraps a StorageAdapter so routes.putMany always rejects. transaction re-wraps the scoped
 * adapter it hands the callback, so the failure is visible inside a transaction, proving a real
 * rollback rather than a rejected promise with a run row left behind.
 */
function withFailingRoutesPutMany(base: StorageAdapter): StorageAdapter {
  return {
    init: () => base.init(),
    runs: base.runs,
    routes: {
      ...base.routes,
      putMany: () => Promise.reject(new Error("simulated route write failure")),
    },
    encounters: base.encounters,
    mons: base.mons,
    deaths: base.deaths,
    fights: base.fights,
    transaction: (fn) => base.transaction((tx) => fn(withFailingRoutesPutMany(tx))),
    exportAll: () => base.exportAll(),
    clear: () => base.clear(),
    deathsByFight: (fightId) => base.deathsByFight(fightId),
  };
}

/**
 * Wraps a StorageAdapter so mons.put always rejects. transaction re-wraps the scoped adapter it
 * hands the callback, so the failure is visible inside a transaction, proving a real rollback of
 * the encounter row written just before it.
 */
function withFailingMonsPut(base: StorageAdapter): StorageAdapter {
  return {
    init: () => base.init(),
    runs: base.runs,
    routes: base.routes,
    encounters: base.encounters,
    mons: {
      ...base.mons,
      put: () => Promise.reject(new Error("simulated mon write failure")),
    },
    deaths: base.deaths,
    fights: base.fights,
    transaction: (fn) => base.transaction((tx) => fn(withFailingMonsPut(tx))),
    exportAll: () => base.exportAll(),
    clear: () => base.clear(),
    deathsByFight: (fightId) => base.deathsByFight(fightId),
  };
}

const CATCH_DETAILS: CatchDetails = {
  speciesId: "chikorita",
  levelCaught: 6,
  level: 18,
  placement: "party",
  nickname: null,
  gender: null,
  nature: null,
  ability: null,
  heldItem: null,
  moves: [],
  shiny: false,
};

async function createSeededRun(adapter: StorageAdapter): Promise<{ run: Run; routes: Route[] }> {
  const { result } = renderHook(() => useCreateRun(), { wrapper: createWrapper(adapter) });
  const run = await result.current.mutateAsync({ name: "Test Run", game: "heartgold" });
  const routes = await adapter.routes.where("runId", run.id);
  return { run, routes };
}

describe("useCreateRun route seeding", () => {
  it("seeds one route per the game's route list, all belonging to the new run", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();

    const { run, routes } = await createSeededRun(adapter);

    expect(routes).toHaveLength(heartgold.routes.length);
    expect(routes.every((route) => route.runId === run.id)).toBe(true);
    expect(routes.every((route) => !route.isCustom)).toBe(true);
  });

  it("is atomic: when seeding the routes fails, no run row is persisted", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();

    const failingAdapter = withFailingRoutesPutMany(adapter);
    const { result } = renderHook(() => useCreateRun(), {
      wrapper: createWrapper(failingAdapter),
    });

    await expect(
      result.current.mutateAsync({ name: "Doomed Run", game: "heartgold" }),
    ).rejects.toThrow("simulated route write failure");

    expect(await adapter.runs.getAll()).toEqual([]);
  });
});

describe("useAddCustomRoute", () => {
  it("appends after every existing route, including seeded ones", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const { run, routes } = await createSeededRun(adapter);
    const highestSeededOrder = Math.max(...routes.map((route) => route.order));

    const { result } = renderHook(() => useAddCustomRoute(), { wrapper: createWrapper(adapter) });
    const custom = await result.current.mutateAsync({
      runId: run.id,
      name: "  Secret Cave  ",
      routes,
    });

    expect(custom.order).toBeGreaterThan(highestSeededOrder);
    expect(custom.isCustom).toBe(true);
    expect(custom.gameRouteId).toBeNull();
    expect(custom.name).toBe("Secret Cave");

    const persisted = await adapter.routes.get(custom.id);
    expect(persisted).toEqual(custom);
  });
});

describe("useDeleteCustomRoute", () => {
  it("deletes a custom route with no encounters logged against it", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const { run, routes } = await createSeededRun(adapter);

    const addWrapper = createWrapper(adapter);
    const add = renderHook(() => useAddCustomRoute(), { wrapper: addWrapper });
    const custom = await add.result.current.mutateAsync({
      runId: run.id,
      name: "Secret Cave",
      routes,
    });

    const del = renderHook(() => useDeleteCustomRoute(), { wrapper: addWrapper });
    await del.result.current.mutateAsync({ route: custom });

    expect(await adapter.routes.get(custom.id)).toBeUndefined();
  });

  it("refuses to delete a custom route that has an encounter logged against it", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const { run, routes } = await createSeededRun(adapter);

    const wrapper = createWrapper(adapter);
    const add = renderHook(() => useAddCustomRoute(), { wrapper });
    const custom = await add.result.current.mutateAsync({
      runId: run.id,
      name: "Secret Cave",
      routes,
    });
    await adapter.encounters.put(makeEncounterDraft(run.id, custom.id));

    const del = renderHook(() => useDeleteCustomRoute(), { wrapper });
    await expect(del.result.current.mutateAsync({ route: custom })).rejects.toThrow(
      /encounter logged/,
    );

    expect(await adapter.routes.get(custom.id)).toEqual(custom);
  });

  it("refuses to delete a non-custom (seeded) route", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const { routes } = await createSeededRun(adapter);
    const seeded = routes[0];
    if (seeded === undefined) {
      throw new Error("expected at least one seeded route");
    }

    const del = renderHook(() => useDeleteCustomRoute(), { wrapper: createWrapper(adapter) });
    await expect(del.result.current.mutateAsync({ route: seeded })).rejects.toThrow(
      /not a custom route/,
    );

    expect(await adapter.routes.get(seeded.id)).toEqual(seeded);
  });
});

describe("useLogEncounter", () => {
  it("logs a caught encounter, writing the encounter and the mon and linking them", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const { run, routes } = await createSeededRun(adapter);
    const route = routes[0];
    if (route === undefined) {
      throw new Error("expected at least one seeded route");
    }

    const { result } = renderHook(() => useLogEncounter(), { wrapper: createWrapper(adapter) });
    const { encounter, mon } = await result.current.mutateAsync({
      runId: run.id,
      routeId: route.id,
      outcome: "caught",
      party: [],
      details: CATCH_DETAILS,
      existingEncounters: [],
    });

    expect(encounter.status).toBe("caught");
    expect(encounter.routeId).toBe(route.id);
    expect(encounter.monId).toBe(mon?.id);
    expect(mon).not.toBeNull();
    expect(mon?.speciesId).toBe("chikorita");
    expect(mon?.levelCaught).toBe(6);
    expect(mon?.level).toBe(18);

    const persistedEncounter = await adapter.encounters.get(encounter.id);
    expect(persistedEncounter?.status).toBe("caught");
    expect(persistedEncounter?.monId).toBe(mon?.id);

    const persistedMon = mon === null ? undefined : await adapter.mons.get(mon.id);
    expect(persistedMon).toBeDefined();
  });

  it("logs a shiny catch and persists it onto the mon", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const { run, routes } = await createSeededRun(adapter);
    const route = routes[0];
    if (route === undefined) {
      throw new Error("expected at least one seeded route");
    }

    const { result } = renderHook(() => useLogEncounter(), { wrapper: createWrapper(adapter) });
    const { mon } = await result.current.mutateAsync({
      runId: run.id,
      routeId: route.id,
      outcome: "caught",
      party: [],
      details: { ...CATCH_DETAILS, shiny: true },
      existingEncounters: [],
    });
    if (mon === null) {
      throw new Error("expected a mon from a caught encounter");
    }

    expect(mon.shiny).toBe(true);
    expect((await adapter.mons.get(mon.id))?.shiny).toBe(true);
  });

  it("logs a missed encounter, writing the encounter with no mon", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const { run, routes } = await createSeededRun(adapter);
    const route = routes[0];
    if (route === undefined) {
      throw new Error("expected at least one seeded route");
    }

    const { result } = renderHook(() => useLogEncounter(), { wrapper: createWrapper(adapter) });
    const { encounter, mon } = await result.current.mutateAsync({
      runId: run.id,
      routeId: route.id,
      outcome: "missed",
      party: [],
      existingEncounters: [],
    });

    expect(encounter.status).toBe("missed");
    expect(mon).toBeNull();

    const persistedEncounter = await adapter.encounters.get(encounter.id);
    expect(persistedEncounter?.status).toBe("missed");
    expect(await adapter.mons.getAll()).toEqual([]);
  });

  it("logs a missed encounter's optional species guess onto the encounter", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const { run, routes } = await createSeededRun(adapter);
    const route = routes[0];
    if (route === undefined) {
      throw new Error("expected at least one seeded route");
    }

    const { result } = renderHook(() => useLogEncounter(), { wrapper: createWrapper(adapter) });
    const { encounter } = await result.current.mutateAsync({
      runId: run.id,
      routeId: route.id,
      outcome: "missed",
      party: [],
      speciesId: "geodude",
      existingEncounters: [],
    });

    expect(encounter.speciesId).toBe("geodude");
  });

  it("logs a skipped encounter, writing the encounter with no mon", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const { run, routes } = await createSeededRun(adapter);
    const route = routes[0];
    if (route === undefined) {
      throw new Error("expected at least one seeded route");
    }

    const { result } = renderHook(() => useLogEncounter(), { wrapper: createWrapper(adapter) });
    const { encounter, mon } = await result.current.mutateAsync({
      runId: run.id,
      routeId: route.id,
      outcome: "skipped",
      party: [],
      existingEncounters: [],
    });

    expect(encounter.status).toBe("skipped");
    expect(mon).toBeNull();

    const persistedEncounter = await adapter.encounters.get(encounter.id);
    expect(persistedEncounter?.status).toBe("skipped");
    expect(await adapter.mons.getAll()).toEqual([]);
  });

  it("invalidates the run's encounters and mons queries on success", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const { run, routes } = await createSeededRun(adapter);
    const route = routes[0];
    if (route === undefined) {
      throw new Error("expected at least one seeded route");
    }

    const wrapper = createWrapper(adapter);
    const encounters = renderHook(() => useEncounters(run.id), { wrapper });
    const mons = renderHook(() => useMons(run.id), { wrapper });
    const logHook = renderHook(() => useLogEncounter(), { wrapper });

    await waitFor(() => {
      expect(encounters.result.current.data).toEqual([]);
    });

    await logHook.result.current.mutateAsync({
      runId: run.id,
      routeId: route.id,
      outcome: "caught",
      party: [],
      details: CATCH_DETAILS,
      existingEncounters: [],
    });

    await waitFor(() => {
      expect(encounters.result.current.data).toHaveLength(1);
    });
    await waitFor(() => {
      expect(mons.result.current.data).toHaveLength(1);
    });
  });

  it("refuses a second log against a route that already has an encounter", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const { run, routes } = await createSeededRun(adapter);
    const route = routes[0];
    if (route === undefined) {
      throw new Error("expected at least one seeded route");
    }

    const alreadyLogged: Encounter = {
      id: "existing-encounter",
      runId: run.id,
      routeId: route.id,
      status: "caught",
      speciesId: "chikorita",
      level: 6,
      monId: "mon-existing",
      notes: null,
      createdAt: "2026-09-17T00:00:00.000Z",
      updatedAt: "2026-09-17T00:00:00.000Z",
    };

    const { result } = renderHook(() => useLogEncounter(), { wrapper: createWrapper(adapter) });
    await expect(
      result.current.mutateAsync({
        runId: run.id,
        routeId: route.id,
        outcome: "skipped",
        party: [],
        existingEncounters: [alreadyLogged],
      }),
    ).rejects.toThrow(/already has an encounter/);

    expect(await adapter.encounters.where("runId", run.id)).toEqual([]);
  });

  it("refuses a caught outcome without details", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const { run, routes } = await createSeededRun(adapter);
    const route = routes[0];
    if (route === undefined) {
      throw new Error("expected at least one seeded route");
    }

    const { result } = renderHook(() => useLogEncounter(), { wrapper: createWrapper(adapter) });
    await expect(
      result.current.mutateAsync({
        runId: run.id,
        routeId: route.id,
        outcome: "caught",
        party: [],
        existingEncounters: [],
      }),
    ).rejects.toThrow(/requires details/);

    expect(await adapter.encounters.where("runId", run.id)).toEqual([]);
  });

  it("is atomic: a failure writing the mon leaves no encounter row behind", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const { run, routes } = await createSeededRun(adapter);
    const route = routes[0];
    if (route === undefined) {
      throw new Error("expected at least one seeded route");
    }

    const failingAdapter = withFailingMonsPut(adapter);
    const { result } = renderHook(() => useLogEncounter(), {
      wrapper: createWrapper(failingAdapter),
    });

    await expect(
      result.current.mutateAsync({
        runId: run.id,
        routeId: route.id,
        outcome: "caught",
        party: [],
        details: CATCH_DETAILS,
        existingEncounters: [],
      }),
    ).rejects.toThrow("simulated mon write failure");

    expect(await adapter.encounters.where("runId", run.id)).toEqual([]);
    expect(await adapter.mons.getAll()).toEqual([]);
  });
});

async function seedCaughtMon(
  adapter: StorageAdapter,
): Promise<{ wrapper: ({ children }: { children: ReactNode }) => ReactNode; mon: Mon }> {
  await adapter.init();
  const { run, routes } = await createSeededRun(adapter);
  const route = routes[0];
  if (route === undefined) {
    throw new Error("expected at least one seeded route");
  }

  const wrapper = createWrapper(adapter);
  const log = renderHook(() => useLogEncounter(), { wrapper });
  const { mon } = await log.result.current.mutateAsync({
    runId: run.id,
    routeId: route.id,
    outcome: "caught",
    party: [],
    details: CATCH_DETAILS,
    existingEncounters: [],
  });
  if (mon === null) {
    throw new Error("expected a mon from a caught encounter");
  }

  return { wrapper, mon };
}

describe("useAmendMon", () => {
  const amendments: MonAmendments = {
    nickname: "Sprout",
    gender: "male",
    level: 20,
    nature: "adamant",
    ability: "overgrow",
    heldItem: "oran-berry",
    moves: ["vine-whip", "growth"],
    shiny: false,
  };

  it("persists the amended fields and leaves other rows alone", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const { run, routes } = await createSeededRun(adapter);
    const [routeA, routeB] = routes;
    if (routeA === undefined || routeB === undefined) {
      throw new Error("expected at least two seeded routes");
    }

    const logWrapper = createWrapper(adapter);
    const log = renderHook(() => useLogEncounter(), { wrapper: logWrapper });

    const { mon: targetMon } = await log.result.current.mutateAsync({
      runId: run.id,
      routeId: routeA.id,
      outcome: "caught",
      party: [],
      details: CATCH_DETAILS,
      existingEncounters: [],
    });
    if (targetMon === null) {
      throw new Error("expected a mon from a caught encounter");
    }

    const { mon: otherMon } = await log.result.current.mutateAsync({
      runId: run.id,
      routeId: routeB.id,
      outcome: "caught",
      party: [],
      details: CATCH_DETAILS,
      existingEncounters: [],
    });
    if (otherMon === null) {
      throw new Error("expected a mon from a caught encounter");
    }

    const amend = renderHook(() => useAmendMon(), { wrapper: logWrapper });
    const result = await amend.result.current.mutateAsync({ mon: targetMon, amendments });

    expect(result.nickname).toBe("Sprout");
    expect(result.gender).toBe("male");
    expect(result.level).toBe(20);
    expect(result.nature).toBe("adamant");
    expect(result.ability).toBe("overgrow");
    expect(result.heldItem).toBe("oran-berry");
    expect(result.moves).toEqual(["vine-whip", "growth"]);
    expect(result.speciesId).toBe(targetMon.speciesId);

    const persisted = await adapter.mons.get(targetMon.id);
    expect(persisted?.nickname).toBe("Sprout");

    const untouched = await adapter.mons.get(otherMon.id);
    expect(untouched).toEqual(otherMon);
  });

  it("persists a shiny toggle onto the stored mon", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const { run, routes } = await createSeededRun(adapter);
    const route = routes[0];
    if (route === undefined) {
      throw new Error("expected at least one seeded route");
    }

    const wrapper = createWrapper(adapter);
    const log = renderHook(() => useLogEncounter(), { wrapper });
    const { mon } = await log.result.current.mutateAsync({
      runId: run.id,
      routeId: route.id,
      outcome: "caught",
      party: [],
      details: CATCH_DETAILS,
      existingEncounters: [],
    });
    if (mon === null) {
      throw new Error("expected a mon from a caught encounter");
    }

    const amend = renderHook(() => useAmendMon(), { wrapper });
    const result = await amend.result.current.mutateAsync({
      mon,
      amendments: { ...amendments, shiny: true },
    });

    expect(result.shiny).toBe(true);
    expect((await adapter.mons.get(mon.id))?.shiny).toBe(true);
  });

  it("invalidates the run's mons query on success", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const { run, routes } = await createSeededRun(adapter);
    const route = routes[0];
    if (route === undefined) {
      throw new Error("expected at least one seeded route");
    }

    const wrapper = createWrapper(adapter);
    const log = renderHook(() => useLogEncounter(), { wrapper });
    const { mon } = await log.result.current.mutateAsync({
      runId: run.id,
      routeId: route.id,
      outcome: "caught",
      party: [],
      details: CATCH_DETAILS,
      existingEncounters: [],
    });
    if (mon === null) {
      throw new Error("expected a mon from a caught encounter");
    }

    const mons = renderHook(() => useMons(run.id), { wrapper });
    await waitFor(() => {
      expect(mons.result.current.data).toHaveLength(1);
    });

    const amend = renderHook(() => useAmendMon(), { wrapper });
    await amend.result.current.mutateAsync({ mon, amendments });

    await waitFor(() => {
      expect(mons.result.current.data?.[0]?.nickname).toBe("Sprout");
    });
  });

  it("applies an evolve and the amendments in one write", async () => {
    const adapter = createMemoryAdapter();
    const { wrapper, mon } = await seedCaughtMon(adapter);

    const putSpy = vi.spyOn(adapter.mons, "put");
    const amend = renderHook(() => useAmendMon(), { wrapper });
    const result = await amend.result.current.mutateAsync({
      mon,
      amendments,
      evolvedTo: "weepinbell",
    });

    expect(result.speciesId).toBe("weepinbell");
    expect(result.speciesIdCaught).toBe(mon.speciesIdCaught);
    expect(result.level).toBe(20);
    expect(putSpy).toHaveBeenCalledTimes(1);

    const persisted = await adapter.mons.get(mon.id);
    expect(persisted?.speciesId).toBe("weepinbell");
  });

  it("leaves the species alone without evolvedTo", async () => {
    const adapter = createMemoryAdapter();
    const { wrapper, mon } = await seedCaughtMon(adapter);

    const amend = renderHook(() => useAmendMon(), { wrapper });
    const result = await amend.result.current.mutateAsync({ mon, amendments });

    expect(result.speciesId).toBe(mon.speciesId);
  });
});

function makeDeathDraft(
  runId: string,
  monId: string,
  overrides: Partial<Death> = {},
): Omit<Death, "id" | "createdAt" | "updatedAt"> {
  return {
    runId,
    monId,
    level: 10,
    routeId: null,
    cause: { type: "wild", species: "geodude", level: 10, move: "Rock Throw" },
    diedAt: "2026-01-01T00:00:00.000Z",
    notes: null,
    ...overrides,
  };
}

function makeFightDraft(
  runId: string,
  overrides: Partial<Fight> = {},
): Omit<Fight, "id" | "createdAt" | "updatedAt"> {
  return {
    runId,
    gameFightId: null,
    name: "Falkner",
    kind: "gym",
    order: 1,
    grantsBadge: true,
    levelCap: 15,
    status: "pending",
    clearedAt: null,
    ...overrides,
  };
}

async function snapshotRun(
  adapter: StorageAdapter,
): Promise<{ encounters: Encounter[]; mons: Mon[]; deaths: Death[]; fights: Fight[] }> {
  const [encounters, mons, deaths, fights] = await Promise.all([
    adapter.encounters.getAll(),
    adapter.mons.getAll(),
    adapter.deaths.getAll(),
    adapter.fights.getAll(),
  ]);
  return { encounters, mons, deaths, fights };
}

async function seedTwoEncounters(
  adapter: StorageAdapter,
  firstOutcome: "missed" | "caught",
): Promise<{
  wrapper: ReturnType<typeof createWrapper>;
  target: Encounter;
  targetMon: Mon | null;
}> {
  await adapter.init();
  const { run, routes } = await createSeededRun(adapter);
  const [routeA, routeB] = routes;
  if (routeA === undefined || routeB === undefined) {
    throw new Error("expected at least two seeded routes");
  }

  const wrapper = createWrapper(adapter);
  const log = renderHook(() => useLogEncounter(), { wrapper });

  const { encounter: target, mon: targetMon } = await log.result.current.mutateAsync({
    runId: run.id,
    routeId: routeA.id,
    outcome: firstOutcome,
    party: [],
    details: firstOutcome === "caught" ? CATCH_DETAILS : undefined,
    existingEncounters: [],
  });

  await log.result.current.mutateAsync({
    runId: run.id,
    routeId: routeB.id,
    outcome: "caught",
    party: [],
    details: CATCH_DETAILS,
    existingEncounters: [target],
  });

  return { wrapper, target, targetMon };
}

describe("useResetEncounter", () => {
  it("removes a missed encounter and leaves every other row untouched", async () => {
    const adapter = createMemoryAdapter();
    const { wrapper, target } = await seedTwoEncounters(adapter, "missed");

    const before = await snapshotRun(adapter);

    const reset = renderHook(() => useResetEncounter(), { wrapper });
    await reset.result.current.mutateAsync({ encounter: target });

    const after = await snapshotRun(adapter);
    expect(after.encounters).toEqual(before.encounters.filter((row) => row.id !== target.id));
    expect(after.mons).toEqual(before.mons);
    expect(after.deaths).toEqual(before.deaths);
    expect(after.fights).toEqual(before.fights);
  });

  it("removes a caught, alive encounter and its mon, leaving every other row untouched", async () => {
    const adapter = createMemoryAdapter();
    const { wrapper, target, targetMon } = await seedTwoEncounters(adapter, "caught");
    if (targetMon === null) {
      throw new Error("expected a mon from a caught encounter");
    }

    const before = await snapshotRun(adapter);

    const reset = renderHook(() => useResetEncounter(), { wrapper });
    await reset.result.current.mutateAsync({ encounter: target });

    const after = await snapshotRun(adapter);
    expect(after.encounters).toEqual(before.encounters.filter((row) => row.id !== target.id));
    expect(after.mons).toEqual(before.mons.filter((row) => row.id !== targetMon.id));
    expect(after.deaths).toEqual(before.deaths);
    expect(after.fights).toEqual(before.fights);
  });

  it("removes a caught, dead encounter, its mon and its death, leaving the fight untouched", async () => {
    const adapter = createMemoryAdapter();
    const { wrapper, target, targetMon } = await seedTwoEncounters(adapter, "caught");
    if (targetMon === null) {
      throw new Error("expected a mon from a caught encounter");
    }

    const fight = await adapter.fights.put(makeFightDraft(target.runId));
    await adapter.mons.put({ ...targetMon, status: "dead", partySlot: null });
    const death = await adapter.deaths.put(
      makeDeathDraft(target.runId, targetMon.id, {
        cause: {
          type: "trainer",
          fightId: fight.id,
          trainerName: null,
          species: "pidgey",
          level: 9,
          move: "gust",
        },
      }),
    );

    const before = await snapshotRun(adapter);

    const reset = renderHook(() => useResetEncounter(), { wrapper });
    await reset.result.current.mutateAsync({ encounter: target });

    const after = await snapshotRun(adapter);
    expect(after.encounters).toEqual(before.encounters.filter((row) => row.id !== target.id));
    expect(after.mons).toEqual(before.mons.filter((row) => row.id !== targetMon.id));
    expect(after.deaths).toEqual(before.deaths.filter((row) => row.id !== death.id));
    expect(after.fights).toEqual(before.fights);
  });

  it("rolls back entirely when a delete fails partway through", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const { wrapper, mon } = await seedCaughtMon(adapter);
    const deadMon = await adapter.mons.put({ ...mon, status: "dead", partySlot: null });
    const death = await adapter.deaths.put(makeDeathDraft(mon.runId, mon.id));
    const target = await adapter.encounters.get(mon.encounterId ?? "");
    if (target === undefined) {
      throw new Error("expected the mon's encounter to exist");
    }

    // Fails the mon delete, which runs after the death delete, so a rollback here also has to
    // undo the death delete that already ran in the same transaction.
    vi.spyOn(adapter.mons, "delete").mockRejectedValueOnce(new Error("boom"));

    const reset = renderHook(() => useResetEncounter(), { wrapper });
    await expect(reset.result.current.mutateAsync({ encounter: target })).rejects.toThrow("boom");

    expect(await adapter.encounters.get(target.id)).toEqual(target);
    expect(await adapter.mons.get(mon.id)).toEqual(deadMon);
    expect(await adapter.deaths.get(death.id)).toEqual(death);
  });

  it("refuses a second reset of the same encounter", async () => {
    const adapter = createMemoryAdapter();
    const { wrapper, mon } = await seedCaughtMon(adapter);
    const target = await adapter.encounters.get(mon.encounterId ?? "");
    if (target === undefined) {
      throw new Error("expected the mon's encounter to exist");
    }

    const reset = renderHook(() => useResetEncounter(), { wrapper });
    await reset.result.current.mutateAsync({ encounter: target });

    await expect(reset.result.current.mutateAsync({ encounter: target })).rejects.toThrow(
      /no longer exists/,
    );
  });

  it("frees a party slot on reset, so a later catch reuses it rather than the next higher slot", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const { run, routes } = await createSeededRun(adapter);
    if (routes.length < 7) {
      throw new Error("expected at least 7 seeded routes");
    }

    const wrapper = createWrapper(adapter);
    const log = renderHook(() => useLogEncounter(), { wrapper });

    const caughtEncounters: Encounter[] = [];
    for (let i = 0; i < 6; i++) {
      const party = (await adapter.mons.where("runId", run.id)).filter(
        (candidate) => candidate.status === "party",
      );
      const { encounter } = await log.result.current.mutateAsync({
        runId: run.id,
        routeId: routes[i]!.id,
        outcome: "caught",
        party,
        details: CATCH_DETAILS,
        existingEncounters: caughtEncounters,
      });
      caughtEncounters.push(encounter);
    }

    const slotTwoMon = (await adapter.mons.where("runId", run.id)).find(
      (candidate) => candidate.partySlot === 2,
    );
    if (slotTwoMon === undefined) {
      throw new Error("expected a mon in party slot 2");
    }
    const slotTwoEncounter = caughtEncounters.find(
      (encounter) => encounter.id === slotTwoMon.encounterId,
    );
    if (slotTwoEncounter === undefined) {
      throw new Error("expected the encounter belonging to the slot-2 mon");
    }

    const reset = renderHook(() => useResetEncounter(), { wrapper });
    await reset.result.current.mutateAsync({ encounter: slotTwoEncounter });

    const partyAfterReset = (await adapter.mons.where("runId", run.id)).filter(
      (candidate) => candidate.status === "party",
    );

    const { mon: newMon } = await log.result.current.mutateAsync({
      runId: run.id,
      routeId: routes[6]!.id,
      outcome: "caught",
      party: partyAfterReset,
      details: CATCH_DETAILS,
      existingEncounters: caughtEncounters,
    });

    expect(newMon?.partySlot).toBe(2);
  });
});

describe("offline", () => {
  afterEach(() => {
    onlineManager.setOnline(true);
  });

  it("still settles a storage write while the device reports no connection", async () => {
    const adapter = createMemoryAdapter();

    onlineManager.setOnline(false);
    const { result } = renderHook(() => useCreateRun(), { wrapper: createWrapper(adapter) });
    const run = await result.current.mutateAsync({ name: "Test Run", game: "heartgold" });

    expect(await adapter.runs.get(run.id)).toEqual(run);
  });
});
