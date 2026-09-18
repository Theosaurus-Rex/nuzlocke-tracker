/**
 * Query layer and `useCatchEncounter` tested against the in-memory adapter (spec §10). These
 * tests cover what THIS app does with TanStack Query — reading rows through the adapter,
 * invalidating on write, and writing atomically — not TanStack Query's own behaviour.
 *
 * Each test gets a FRESH `QueryClient` (retry disabled) and a fresh memory adapter. Sharing
 * either across tests would leak cache or rows between them and produce order-dependent passes.
 */

import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CatchDetails } from "@/domain/transitions";
import type { Encounter, Route, Run, Rules } from "@/domain/types";

import type { StorageAdapter } from "./adapter";
import { createMemoryAdapter } from "./memory-adapter";
import { useArchiveRun, useCatchEncounter, useUnarchiveRun } from "./mutations";
import { useEncounters, useMons, useRun, useRuns } from "./queries";
import { StorageProvider } from "./storage-context";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Failure injection for the atomicity test
// ---------------------------------------------------------------------------

/**
 * Wraps a `StorageAdapter` so `mons.put` always rejects, while every other operation (including
 * `encounters.put`) still goes through to `base`. `transaction` re-wraps the scoped adapter it
 * hands to the callback, so the injected failure is visible from inside a transaction too — which
 * is what lets this prove a real rollback rather than just a rejected promise.
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

// ---------------------------------------------------------------------------
// Read hooks
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// useCatchEncounter
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// useArchiveRun / useUnarchiveRun — the invalidation trap
// ---------------------------------------------------------------------------

describe("useArchiveRun / useUnarchiveRun", () => {
  it("archiving a run updates its status in a mounted useRuns list without a manual refetch", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const run = await adapter.runs.put(makeRunDraft({ name: "Blaze Nuzlocke", status: "active" }));

    const wrapper = createWrapper(adapter);
    // `useRuns` itself returns every run regardless of status — the run-list screen is what
    // filters by tab, and that filter re-derives from whatever `useRuns` currently holds. So the
    // invalidation trap shows up here as `status` on the mounted row going stale, not as the row
    // vanishing: see run-list-screen.test.tsx for the screen-level "moves tabs" version of this.
    const runsList = renderHook(() => useRuns(), { wrapper });
    const archive = renderHook(() => useArchiveRun(), { wrapper });

    await waitFor(() => {
      expect(runsList.result.current.data).toEqual([run]);
    });

    await archive.result.current.mutateAsync(run.id);

    // This is the regression case: `invalidateRun` deliberately does not invalidate the plain
    // `['runs']` list key (see queries.ts), so archiving MUST also invalidate `queryKeys.runs()`
    // itself, or this mounted list keeps reporting "active" with nothing erroring.
    await waitFor(() => {
      expect(runsList.result.current.data?.[0]?.status).toBe("archived");
    });
  });

  it("unarchiving a run restores it to a mounted useRuns list without a manual refetch", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const run = await adapter.runs.put(
      makeRunDraft({ name: "Blaze Nuzlocke", status: "archived" }),
    );

    const wrapper = createWrapper(adapter);
    const runsList = renderHook(() => useRuns(), { wrapper });
    const unarchive = renderHook(() => useUnarchiveRun(), { wrapper });

    await waitFor(() => {
      expect(runsList.result.current.data).toEqual([run]);
    });

    await unarchive.result.current.mutateAsync(run.id);

    await waitFor(() => {
      expect(runsList.result.current.data?.[0]?.status).toBe("active");
    });
  });

  it("persists the status change on the underlying row", async () => {
    const adapter = createMemoryAdapter();
    await adapter.init();
    const run = await adapter.runs.put(makeRunDraft({ name: "Blaze Nuzlocke", status: "active" }));

    const { result } = renderHook(() => useArchiveRun(), { wrapper: createWrapper(adapter) });
    await result.current.mutateAsync(run.id);

    const persisted = await adapter.runs.get(run.id);
    expect(persisted?.status).toBe("archived");
  });
});
