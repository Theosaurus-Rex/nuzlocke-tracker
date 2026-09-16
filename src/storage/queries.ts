/**
 * Query keys and read hooks over the `StorageAdapter`. See
 * docs/superpowers/specs/2026-09-17-nuzlocke-scaffold-design.md section 8.
 *
 * Every key lives in `queryKeys` so fetching and invalidation cannot drift apart — a hook that
 * fetched under a hand-written key that invalidation forgot to match is exactly the class of bug
 * a single source of truth for keys removes.
 *
 * `staleTime` is `Infinity` everywhere: nothing changes this database except this tab, so
 * background refetching is pure waste. Invalidation is explicit, via `invalidateRun`.
 *
 * This module depends ONLY on the `StorageAdapter` interface (via `useStorage`). It must never
 * import Dexie or know which implementation backs the adapter — that boundary is what keeps the
 * M6 SQLite swap a swap.
 */

import { useQuery, type QueryClient, type UseQueryResult } from "@tanstack/react-query";

import type { Run, Route, Encounter, Mon, Death, Fight } from "@/domain/types";

import { useStorage } from "./storage-context";

export const queryKeys = {
  runs: () => ["runs"] as const,
  run: (runId: string) => ["runs", runId] as const,
  routes: (runId: string) => ["routes", runId] as const,
  encounters: (runId: string) => ["encounters", runId] as const,
  mons: (runId: string) => ["mons", runId] as const,
  deaths: (runId: string) => ["deaths", runId] as const,
  fights: (runId: string) => ["fights", runId] as const,
};

export function useRuns(): UseQueryResult<Run[]> {
  const adapter = useStorage();
  return useQuery({
    queryKey: queryKeys.runs(),
    queryFn: () => adapter.runs.getAll(),
    staleTime: Infinity,
  });
}

export function useRun(runId: string): UseQueryResult<Run | undefined> {
  const adapter = useStorage();
  return useQuery({
    queryKey: queryKeys.run(runId),
    queryFn: () => adapter.runs.get(runId),
    staleTime: Infinity,
  });
}

export function useRoutes(runId: string): UseQueryResult<Route[]> {
  const adapter = useStorage();
  return useQuery({
    queryKey: queryKeys.routes(runId),
    queryFn: () => adapter.routes.where("runId", runId),
    staleTime: Infinity,
  });
}

export function useEncounters(runId: string): UseQueryResult<Encounter[]> {
  const adapter = useStorage();
  return useQuery({
    queryKey: queryKeys.encounters(runId),
    queryFn: () => adapter.encounters.where("runId", runId),
    staleTime: Infinity,
  });
}

export function useMons(runId: string): UseQueryResult<Mon[]> {
  const adapter = useStorage();
  return useQuery({
    queryKey: queryKeys.mons(runId),
    queryFn: () => adapter.mons.where("runId", runId),
    staleTime: Infinity,
  });
}

export function useDeaths(runId: string): UseQueryResult<Death[]> {
  const adapter = useStorage();
  return useQuery({
    queryKey: queryKeys.deaths(runId),
    queryFn: () => adapter.deaths.where("runId", runId),
    staleTime: Infinity,
  });
}

export function useFights(runId: string): UseQueryResult<Fight[]> {
  const adapter = useStorage();
  return useQuery({
    queryKey: queryKeys.fights(runId),
    queryFn: () => adapter.fights.where("runId", runId),
    staleTime: Infinity,
  });
}

/**
 * Invalidates every key belonging to `runId` — the single run row plus its routes, encounters,
 * mons, deaths and fights. Per spec §8, invalidation is per-run rather than per-row: at kilobyte
 * scale with one user, refetching a run's rows is cheaper than fine-grained invalidation and
 * removes a whole class of stale-cache bugs.
 *
 * Deliberately does NOT invalidate the plain `['runs']` list key — creating or catching within an
 * existing run does not change which runs exist, so that key does not "belong to" any one run.
 */
export async function invalidateRun(queryClient: QueryClient, runId: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.run(runId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.routes(runId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.encounters(runId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.mons(runId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.deaths(runId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.fights(runId) }),
  ]);
}
