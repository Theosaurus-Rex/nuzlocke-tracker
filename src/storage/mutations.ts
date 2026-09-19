/**
 * Mutation hooks over the `StorageAdapter`.
 *
 * `useCatchEncounter` runs a pure domain transition and then writes two rows, the updated
 * encounter and the new mon, inside one `adapter.transaction(...)`, so a partial write can never
 * leave an encounter pointing at a mon that does not exist. The new mon's id is generated at the
 * call site, never inside `catchEncounter` itself, which is pure by design.
 *
 * A run created by `useCreateRun` has no fights yet; seeding those is out of scope here.
 */

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { DEFAULT_RULES } from "@/domain/rules";
import { canDeleteRoute, nextRouteOrder } from "@/domain/routes";
import {
  catchEncounter,
  missEncounter,
  skipEncounter,
  type CatchDetails,
} from "@/domain/transitions";
import type { Encounter, GameId, Mon, Route, Rules, Run } from "@/domain/types";
import { GAMES } from "@/game/registry";
import { seedRoutes } from "@/game/seed";

import type { StorageAdapter } from "./adapter";
import { invalidateRun, queryKeys } from "./queries";
import { useStorage } from "./storage-context";

export interface CatchEncounterInput {
  encounter: Encounter;
  /** The current party, used to find the lowest free party slot (or overflow to the box). */
  party: readonly Mon[];
  details: CatchDetails;
}

export interface CatchEncounterResult {
  encounter: Encounter;
  mon: Mon;
}

async function persistCatch(
  adapter: StorageAdapter,
  input: CatchEncounterInput,
): Promise<CatchEncounterResult> {
  const monId = crypto.randomUUID();

  const { encounter: updatedEncounter, mon: monDraft } = catchEncounter({
    encounter: input.encounter,
    party: input.party,
    monId,
    details: input.details,
  });

  return adapter.transaction(async (tx) => {
    const [savedEncounter, savedMon] = await Promise.all([
      tx.encounters.put(updatedEncounter),
      tx.mons.put(monDraft),
    ]);

    return { encounter: savedEncounter, mon: savedMon };
  });
}

export function useCatchEncounter(): UseMutationResult<
  CatchEncounterResult,
  Error,
  CatchEncounterInput
> {
  const adapter = useStorage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CatchEncounterInput) => persistCatch(adapter, input),
    onSuccess: async (result) => {
      await invalidateRun(queryClient, result.encounter.runId);
    },
  });
}

export interface LogEncounterInput {
  runId: string;
  routeId: string;
  outcome: "caught" | "missed" | "skipped";
  /** The current party, used to find the lowest free party slot (or overflow to the box). */
  party: readonly Mon[];
  /** Required when `outcome` is `'caught'`. */
  details?: CatchDetails;
  /** What was seen, when `outcome` is `'missed'` or `'skipped'`. Optional: a player often does
   * not know what fled. Ignored when `outcome` is `'caught'`, where `details.speciesId` applies. */
  speciesId?: string | null;
  /** The run's current encounters, used to refuse a second log against the same route. */
  existingEncounters: readonly Encounter[];
}

export interface LogEncounterResult {
  encounter: Encounter;
  mon: Mon | null;
}

async function persistLogEncounter(
  adapter: StorageAdapter,
  input: LogEncounterInput,
): Promise<LogEncounterResult> {
  if (input.existingEncounters.some((encounter) => encounter.routeId === input.routeId)) {
    throw new Error(`Route ${input.routeId} already has an encounter logged against it.`);
  }

  const details = input.details;
  if (input.outcome === "caught" && details === undefined) {
    throw new Error("Logging a caught encounter requires details.");
  }

  const monId = crypto.randomUUID();

  return adapter.transaction(async (tx) => {
    const openEncounter = await tx.encounters.put({
      runId: input.runId,
      routeId: input.routeId,
      status: "open",
      speciesId: null,
      level: null,
      monId: null,
      notes: null,
    });

    if (input.outcome === "missed") {
      const encounter = await tx.encounters.put(
        missEncounter({ ...openEncounter, speciesId: input.speciesId ?? null }),
      );
      return { encounter, mon: null };
    }

    if (input.outcome === "skipped") {
      const encounter = await tx.encounters.put(
        skipEncounter({ ...openEncounter, speciesId: input.speciesId ?? null }),
      );
      return { encounter, mon: null };
    }

    if (details === undefined) {
      throw new Error("Logging a caught encounter requires details.");
    }

    const { encounter: caughtEncounter, mon: monDraft } = catchEncounter({
      encounter: openEncounter,
      party: input.party,
      monId,
      details,
    });

    const [encounter, mon] = await Promise.all([
      tx.encounters.put(caughtEncounter),
      tx.mons.put(monDraft),
    ]);

    return { encounter, mon };
  });
}

export function useLogEncounter(): UseMutationResult<LogEncounterResult, Error, LogEncounterInput> {
  const adapter = useStorage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LogEncounterInput) => persistLogEncounter(adapter, input),
    onSuccess: async (result) => {
      await invalidateRun(queryClient, result.encounter.runId);
    },
  });
}

/**
 * Deletes a run's row plus every row that belongs to it, inside one `adapter.transaction`, so a
 * failure partway through leaves every row exactly as it was rather than an orphaned partial
 * delete.
 */
async function persistDeleteRun(adapter: StorageAdapter, runId: string): Promise<void> {
  await adapter.transaction(async (tx) => {
    const [routes, encounters, mons, deaths, fights] = await Promise.all([
      tx.routes.where("runId", runId),
      tx.encounters.where("runId", runId),
      tx.mons.where("runId", runId),
      tx.deaths.where("runId", runId),
      tx.fights.where("runId", runId),
    ]);

    await Promise.all([
      ...routes.map((row) => tx.routes.delete(row.id)),
      ...encounters.map((row) => tx.encounters.delete(row.id)),
      ...mons.map((row) => tx.mons.delete(row.id)),
      ...deaths.map((row) => tx.deaths.delete(row.id)),
      ...fights.map((row) => tx.fights.delete(row.id)),
      tx.runs.delete(runId),
    ]);
  });
}

/**
 * Deletes a run and all of its rows. Irreversible; the caller is responsible for confirming
 * first.
 *
 * Deleting a run changes which runs exist, so this also invalidates the plain `queryKeys.runs()`
 * list key, which `invalidateRun` deliberately skips (see `queries.ts`).
 */
export function useDeleteRun(): UseMutationResult<void, Error, string> {
  const adapter = useStorage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (runId: string) => persistDeleteRun(adapter, runId),
    onSuccess: async (_result, runId) => {
      await Promise.all([
        invalidateRun(queryClient, runId),
        queryClient.invalidateQueries({ queryKey: queryKeys.runs() }),
      ]);
    },
  });
}

export interface CreateRunInput {
  name: string;
  game: GameId;
  /** Falls back to `DEFAULT_RULES` when omitted. */
  rules?: Rules;
}

async function persistCreateRun(adapter: StorageAdapter, input: CreateRunInput): Promise<Run> {
  return adapter.transaction(async (tx) => {
    const run = await tx.runs.put({
      name: input.name,
      game: input.game,
      status: "active",
      rules: input.rules ?? DEFAULT_RULES,
      finishedAt: null,
    });

    await tx.routes.putMany(seedRoutes(run.id, GAMES[input.game]));

    return run;
  });
}

/**
 * Creates a run, which changes which runs exist, so this also invalidates the plain
 * `queryKeys.runs()` list key in addition to the new run's per-run keys.
 */
export function useCreateRun(): UseMutationResult<Run, Error, CreateRunInput> {
  const adapter = useStorage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRunInput) => persistCreateRun(adapter, input),
    onSuccess: async (run) => {
      await Promise.all([
        invalidateRun(queryClient, run.id),
        queryClient.invalidateQueries({ queryKey: queryKeys.runs() }),
      ]);
    },
  });
}

export interface AddCustomRouteInput {
  runId: string;
  name: string;
  /** The run's current routes, used to place the new route after every existing one. */
  routes: readonly Route[];
}

async function persistAddCustomRoute(
  adapter: StorageAdapter,
  input: AddCustomRouteInput,
): Promise<Route> {
  return adapter.routes.put({
    runId: input.runId,
    name: input.name.trim(),
    order: nextRouteOrder(input.routes),
    isCustom: true,
    gameRouteId: null,
  });
}

export function useAddCustomRoute(): UseMutationResult<Route, Error, AddCustomRouteInput> {
  const adapter = useStorage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddCustomRouteInput) => persistAddCustomRoute(adapter, input),
    onSuccess: async (route) => {
      await invalidateRun(queryClient, route.runId);
    },
  });
}

export interface DeleteCustomRouteInput {
  route: Route;
}

async function persistDeleteCustomRoute(
  adapter: StorageAdapter,
  input: DeleteCustomRouteInput,
): Promise<void> {
  await adapter.transaction(async (tx) => {
    const encounters = await tx.encounters.where("runId", input.route.runId);

    if (!canDeleteRoute(input.route, encounters)) {
      throw new Error(
        input.route.isCustom
          ? `Cannot delete route ${input.route.id}: it has an encounter logged against it.`
          : `Cannot delete route ${input.route.id}: it is not a custom route.`,
      );
    }

    await tx.routes.delete(input.route.id);
  });
}

export function useDeleteCustomRoute(): UseMutationResult<void, Error, DeleteCustomRouteInput> {
  const adapter = useStorage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteCustomRouteInput) => persistDeleteCustomRoute(adapter, input),
    onSuccess: async (_result, input) => {
      await invalidateRun(queryClient, input.route.runId);
    },
  });
}
