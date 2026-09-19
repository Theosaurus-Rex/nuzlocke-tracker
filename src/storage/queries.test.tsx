/**
 * Query layer and `useCatchEncounter` tested against the in-memory adapter. These tests cover
 * what this app does with TanStack Query: reading rows through the adapter, invalidating on
 * write, and writing atomically, not TanStack Query's own behaviour.
 *
 * Each test gets a fresh `QueryClient` (retry disabled) and a fresh memory adapter, so cache or
 * rows can't leak between tests and produce order-dependent passes.
 */

import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CatchDetails } from "@/domain/transitions";
import type { Death, Encounter, Fight, Mon, Route, Run, Rules } from "@/domain/types";

import { DEFAULT_RULES } from "@/domain/rules";

import type { StorageAdapter } from "./adapter";
import { createMemoryAdapter } from "./memory-adapter";
import { useCatchEncounter, useCreateRun, useDeleteRun } from "./mutations";
import { useEncounters, useMons, useRun, useRuns } from "./queries";
import { StorageProvider } from "./storage-context";

const RULES_FIXTURE: Rules = {
  dupesClause: false,
  speciesClause: false,
  shinyClause: false,
  nicknamesRequired: false,
  levelCaps: false,
  setMode: false,
  hardcore: false,
  randomiser: {
    enabled: false,
    wildEncounters: false,
    trainers: false,
    starters: false,
    abilities: false,
    items: false,
    moves: false,
    evolutions: false,
  },
  customClause: null,
};

function makeRunDraft(overrides: Partial<Run> = {}): Omit<Run, "id" | "createdAt" | "updatedAt"> {
  return {
    name: "Test Run",
    game: "heartgold",
    status: "active",
    rules: RULES_FIXTURE,
    finishedAt: null,
    ...overrides,
  };
}

function makeRouteDraft(
  runId: string,
  overrides: Partial<Route> = {},
): Omit<Route, "id" | "createdAt" | "updatedAt"> {
  return {
    runId,
    name: "Route 29",
    order: 1,
    isCustom: false,
    gameRouteId: null,
    ...overrides,
  };
}

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

function makeMonDraft(
  runId: string,
  overrides: Partial<Mon> = {},
): Omit<Mon, "id" | "createdAt" | "updatedAt"> {
  return {
    runId,
    encounterId: null,
    speciesId: "chikorita",
    speciesIdCaught: "chikorita",
    nickname: null,
    gender: null,
    level: 5,
    levelCaught: 5,
    nature: null,
    ability: null,
    heldItem: null,
    moves: [],
    status: "party",
    partySlot: 0,
    boxOrder: null,
    caughtRouteId: null,
    ...overrides,
  };
}

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

const CATCH_DETAILS: CatchDetails = {
  speciesId: "chikorita",
  level: 5,
  nickname: null,
  gender: "female",
  nature: null,
  ability: null,
  heldItem: null,
  moves: ["tackle"],
};

/** Seeds a run, route and open encounter, returning all three plus the adapter. */
async function seedOpenEncounter(adapter: StorageAdapter): Promise<{
  run: Run;
  route: Route;
  encounter: Encounter;
}> {
  const run = await adapter.runs.put(makeRunDraft());
  const route = await adapter.routes.put(makeRouteDraft(run.id));
  const encounter = await adapter.encounters.put(makeEncounterDraft(run.id, route.id));
  return { run, route, encounter };
}

/**
 * Seeds a run with one row in each of its five child tables. Used to prove `useDeleteRun` clears
 * every table it owns, not just the obvious ones, and leaves a second run's rows alone.
 */
async function seedFullRun(
  adapter: StorageAdapter,
  overrides: Partial<Run> = {},
): Promise<{
  run: Run;
  route: Route;
  encounter: Encounter;
  mon: Mon;
  death: Death;
  fight: Fight;
}> {
  const run = await adapter.runs.put(makeRunDraft(overrides));
  const route = await adapter.routes.put(makeRouteDraft(run.id));
  const encounter = await adapter.encounters.put(
    makeEncounterDraft(run.id, route.id, { status: "caught" }),
  );
  const mon = await adapter.mons.put(makeMonDraft(run.id, { status: "dead", partySlot: null }));
  const death = await adapter.deaths.put(makeDeathDraft(run.id, mon.id));
  const fight = await adapter.fights.put(makeFightDraft(run.id));
  return { run, route, encounter, mon, death, fight };
}

function createWrapper(
  adapter: StorageAdapter,
): ({ children }: { children: ReactNode }) => ReactNode {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
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
 * Wraps a `StorageAdapter` so `mons.put` always rejects while everything else goes through to
 * `base`. `transaction` re-wraps the scoped adapter it hands the callback, so the failure is
 * visible inside a transaction too, which is what proves a real rollback and not just a
 * rejected promise.
 */
function withFailingMonsPut(base: StorageAdapter): StorageAdapter {
  return {
    init: () => base.init(),
    runs: base.runs,
    routes: base.routes,
    encounters: base.encounters,
    mons: {
      ...base.mons,
      put: () => Promise.reject(new Error("simulated write failure")),
    },
    deaths: base.deaths,
    fights: base.fights,
    transaction: (fn) => base.transaction((tx) => fn(withFailingMonsPut(tx))),
    exportAll: () => base.exportAll(),
    clear: () => base.clear(),
    deathsByFight: (fightId) => base.deathsByFight(fightId),
  };
}

/**
 * Wraps a `StorageAdapter` so `mons.delete` always rejects while every other table's `delete`
 * still goes through to `base`. Proves `useDeleteRun`'s six-table delete is genuinely atomic: a
 * failure partway through must roll back the deletes that already ran, not just fail to delete
 * the mon.
 */
function withFailingMonsDelete(base: StorageAdapter): StorageAdapter {
  return {
    init: () => base.init(),
    runs: base.runs,
    routes: base.routes,
    encounters: base.encounters,
    mons: {
      ...base.mons,
      delete: () => Promise.reject(new Error("simulated delete failure")),
    },
    deaths: base.deaths,
    fights: base.fights,
    transaction: (fn) => base.transaction((tx) => fn(withFailingMonsDelete(tx))),
    exportAll: () => base.exportAll(),
    clear: () => base.clear(),
    deathsByFight: (fightId) => base.deathsByFight(fightId),
  };
}

describe("read hooks", () => {
  it("useRuns returns the rows the adapter holds", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const run = await adapter.runs.put(makeRunDraft({ name: "Soul Silver Solo" }));

    const { result } = renderHook(() => useRuns(), { wrapper: createWrapper(adapter) });

    await waitFor(() => {
      expect(result.current.data).toEqual([run]);
    });
  });

  it("useRun returns the single run matching its id, not another run", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const first = await adapter.runs.put(makeRunDraft({ name: "First Run" }));
    const second = await adapter.runs.put(makeRunDraft({ name: "Second Run" }));

    const { result } = renderHook(() => useRun(second.id), { wrapper: createWrapper(adapter) });

    await waitFor(() => {
      expect(result.current.data).toEqual(second);
    });
    expect(result.current.data?.id).not.toBe(first.id);
  });
});

describe("useCatchEncounter", () => {
  it("persists both the caught encounter and the new mon", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const { encounter } = await seedOpenEncounter(adapter);

    const { result } = renderHook(() => useCatchEncounter(), { wrapper: createWrapper(adapter) });

    const mutationResult = await result.current.mutateAsync({
      encounter,
      party: [],
      details: CATCH_DETAILS,
    });

    expect(mutationResult.encounter.status).toBe("caught");
    expect(mutationResult.encounter.monId).toBe(mutationResult.mon.id);

    const persistedEncounter = await adapter.encounters.get(encounter.id);
    expect(persistedEncounter?.status).toBe("caught");
    expect(persistedEncounter?.monId).toBe(mutationResult.mon.id);

    const persistedMon = await adapter.mons.get(mutationResult.mon.id);
    expect(persistedMon).toBeDefined();
    expect(persistedMon?.speciesId).toBe("chikorita");
    expect(persistedMon?.status).toBe("party");
  });

  it("invalidates the run's queries on success, so a mounted useEncounters reflects the catch without a manual refetch", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const { run, encounter } = await seedOpenEncounter(adapter);

    const wrapper = createWrapper(adapter);
    const encounters = renderHook(() => useEncounters(run.id), { wrapper });
    const mons = renderHook(() => useMons(run.id), { wrapper });
    const catchHook = renderHook(() => useCatchEncounter(), { wrapper });

    await waitFor(() => {
      expect(encounters.result.current.data).toHaveLength(1);
    });
    expect(encounters.result.current.data?.[0]?.status).toBe("open");
    expect(mons.result.current.data).toEqual([]);

    await catchHook.result.current.mutateAsync({
      encounter,
      party: [],
      details: CATCH_DETAILS,
    });

    await waitFor(() => {
      expect(encounters.result.current.data?.[0]?.status).toBe("caught");
    });
    await waitFor(() => {
      expect(mons.result.current.data).toHaveLength(1);
    });
  });

  it("writes atomically: when the transaction rejects, neither the encounter nor the mon is persisted", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const { encounter } = await seedOpenEncounter(adapter);

    const failingAdapter = withFailingMonsPut(adapter);
    const { result } = renderHook(() => useCatchEncounter(), {
      wrapper: createWrapper(failingAdapter),
    });

    await expect(
      result.current.mutateAsync({ encounter, party: [], details: CATCH_DETAILS }),
    ).rejects.toThrow("simulated write failure");

    const persistedEncounter = await adapter.encounters.get(encounter.id);
    expect(persistedEncounter?.status).toBe("open");
    expect(persistedEncounter?.monId).toBeNull();

    const allMons = await adapter.mons.getAll();
    expect(allMons).toEqual([]);
  });
});

describe("useDeleteRun", () => {
  it("deletes the run and every row it owns across all six tables", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const { run } = await seedFullRun(adapter);

    const { result } = renderHook(() => useDeleteRun(), { wrapper: createWrapper(adapter) });
    await result.current.mutateAsync(run.id);

    expect(await adapter.runs.get(run.id)).toBeUndefined();
    expect(await adapter.routes.where("runId", run.id)).toEqual([]);
    expect(await adapter.encounters.where("runId", run.id)).toEqual([]);
    expect(await adapter.mons.where("runId", run.id)).toEqual([]);
    expect(await adapter.deaths.where("runId", run.id)).toEqual([]);
    expect(await adapter.fights.where("runId", run.id)).toEqual([]);
  });

  it("does not touch another run's rows", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const doomed = await seedFullRun(adapter, { name: "Doomed Run" });
    const survivor = await seedFullRun(adapter, { name: "Survivor Run" });

    const { result } = renderHook(() => useDeleteRun(), { wrapper: createWrapper(adapter) });
    await result.current.mutateAsync(doomed.run.id);

    expect(await adapter.runs.get(survivor.run.id)).toEqual(survivor.run);
    expect(await adapter.routes.where("runId", survivor.run.id)).toEqual([survivor.route]);
    expect(await adapter.encounters.where("runId", survivor.run.id)).toEqual([survivor.encounter]);
    expect(await adapter.mons.where("runId", survivor.run.id)).toEqual([survivor.mon]);
    expect(await adapter.deaths.where("runId", survivor.run.id)).toEqual([survivor.death]);
    expect(await adapter.fights.where("runId", survivor.run.id)).toEqual([survivor.fight]);
  });

  it("writes atomically: when the transaction rejects, nothing is deleted", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const { run, route, encounter, mon, death, fight } = await seedFullRun(adapter);

    const failingAdapter = withFailingMonsDelete(adapter);
    const { result } = renderHook(() => useDeleteRun(), {
      wrapper: createWrapper(failingAdapter),
    });

    await expect(result.current.mutateAsync(run.id)).rejects.toThrow("simulated delete failure");

    // Nothing was removed, not even the rows deleted before the mon in `persistDeleteRun`. That
    // is what a rollback guarantees, as opposed to a partial delete.
    expect(await adapter.runs.get(run.id)).toEqual(run);
    expect(await adapter.routes.get(route.id)).toEqual(route);
    expect(await adapter.encounters.get(encounter.id)).toEqual(encounter);
    expect(await adapter.mons.get(mon.id)).toEqual(mon);
    expect(await adapter.deaths.get(death.id)).toEqual(death);
    expect(await adapter.fights.get(fight.id)).toEqual(fight);
  });

  it("invalidates the plain runs list as well as the per-run keys, so mounted lists reflect the deletion without a manual refetch", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const { run } = await seedFullRun(adapter);

    const wrapper = createWrapper(adapter);
    const runsList = renderHook(() => useRuns(), { wrapper });
    const encounters = renderHook(() => useEncounters(run.id), { wrapper });
    const deleteRun = renderHook(() => useDeleteRun(), { wrapper });

    await waitFor(() => {
      expect(runsList.result.current.data).toEqual([run]);
    });
    await waitFor(() => {
      expect(encounters.result.current.data).toHaveLength(1);
    });

    await deleteRun.result.current.mutateAsync(run.id);

    // The invalidation trap `invalidateRun` documents: deleting changes which runs exist, so
    // `useDeleteRun` must invalidate the plain `['runs']` list key too, or this mounted list
    // would keep showing the deleted run with nothing erroring.
    await waitFor(() => {
      expect(runsList.result.current.data).toEqual([]);
    });
    await waitFor(() => {
      expect(encounters.result.current.data).toEqual([]);
    });
  });
});

describe("useCreateRun", () => {
  it("persists a run with the given name and game, active status, and DEFAULT_RULES", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();

    const { result } = renderHook(() => useCreateRun(), { wrapper: createWrapper(adapter) });

    const run = await result.current.mutateAsync({ name: "Soul Silver Solo", game: "heartgold" });

    expect(run.name).toBe("Soul Silver Solo");
    expect(run.game).toBe("heartgold");
    expect(run.status).toBe("active");
    expect(run.rules).toEqual(DEFAULT_RULES);
    expect(run.finishedAt).toBeNull();

    const persisted = await adapter.runs.get(run.id);
    expect(persisted).toEqual(run);
  });

  it("persists the caller's rules instead of DEFAULT_RULES when given one", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();

    const { result } = renderHook(() => useCreateRun(), { wrapper: createWrapper(adapter) });

    const customRules = { ...DEFAULT_RULES, hardcore: true, customClause: "No held items" };
    const run = await result.current.mutateAsync({
      name: "Hardcore Run",
      game: "heartgold",
      rules: customRules,
    });

    expect(run.rules).toEqual(customRules);
    expect(run.rules).not.toEqual(DEFAULT_RULES);
  });

  it("invalidates the plain runs list, so a mounted useRuns reflects the new run without a manual refetch", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();

    const wrapper = createWrapper(adapter);
    const runsList = renderHook(() => useRuns(), { wrapper });
    const createRun = renderHook(() => useCreateRun(), { wrapper });

    await waitFor(() => {
      expect(runsList.result.current.data).toEqual([]);
    });

    const run = await createRun.result.current.mutateAsync({
      name: "New Run",
      game: "heartgold",
    });

    // Same invalidation trap: creating a run changes which runs exist, so `useCreateRun` must
    // invalidate the plain `['runs']` list key, or this mounted list would keep showing zero
    // runs with nothing erroring.
    await waitFor(() => {
      expect(runsList.result.current.data).toEqual([run]);
    });
  });
});
