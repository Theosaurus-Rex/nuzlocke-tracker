/**
 * `useCatchEncounter` — the one mutation hook built in this commit. See
 * docs/superpowers/specs/2026-09-17-nuzlocke-scaffold-design.md sections 5 and 8.
 *
 * Catch is the hard case on purpose: it runs a pure domain transition and then writes TWO rows
 * (the updated encounter and the new mon) inside ONE `adapter.transaction(...)`, so a partial
 * write can never leave an encounter pointing at a mon that does not exist. The rest of the
 * mutation set lands with the features that need them (M1-M4).
 *
 * The new mon's id is generated with `crypto.randomUUID()` here, at the call site — never inside
 * `catchEncounter` itself, which is pure by design and must stay that way.
 *
 * `useDeleteRun` (PER-14) is the other mutation here. `RunStatus` originally also grew an
 * `"archived"` state with `useArchiveRun`/`useUnarchiveRun`, but Theo rejected the archive concept
 * on review of PER-14: a run is either kept or deleted, no third state. Delete replaces it.
 *
 * `useCreateRun` (PER-16) is the third. It does not generate `id`/`createdAt`/`updatedAt` itself
 * — `adapter.runs.put` assigns those, same as every other write through the adapter — and it does
 * not seed routes or fights: seeding a run's route list from game data is PER-22 (M2), and the
 * boss list is PER-33 (M4). A run created here legitimately has no routes yet.
 *
 * This module depends ONLY on the `StorageAdapter` interface (via `useStorage`) and the pure
 * transition in `src/domain/transitions.ts`. It must never import Dexie.
 */

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { DEFAULT_RULES } from "@/domain/rules";
import { catchEncounter, type CatchDetails } from "@/domain/transitions";
import type { Encounter, GameId, Mon, Run } from "@/domain/types";

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

// ---------------------------------------------------------------------------
// Delete a run (PER-14)
// ---------------------------------------------------------------------------

/**
 * Deletes a run's row plus every row that belongs to it — routes, encounters, mons, deaths and
 * fights — inside ONE `adapter.transaction`, so a failure partway through leaves every row
 * exactly as it was (see the atomicity test in `queries.test.tsx`) rather than an orphaned
 * partial delete that would silently bloat every export from then on.
 *
 * Built entirely from existing `Repository` primitives (`where` + `delete`) rather than a new
 * adapter method: hard rule 1 keeps the adapter interface minimal, and the contract suite that
 * already covers both adapters needs no new capability to exercise this.
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
 * Deletes a run and all of its rows. Irreversible — the caller (the run list screen) is
 * responsible for an explicit, informative confirmation step before calling this; there is no
 * undo at this layer.
 *
 * Like the archive mutation this replaces, deleting a run changes WHICH runs exist, so this
 * invalidates the plain `queryKeys.runs()` list key as well as the per-run keys `invalidateRun`
 * covers. Skipping that would leave the deleted run visible in the list until a manual reload,
 * with nothing erroring — see the "Deliberately does NOT invalidate" note on `invalidateRun` in
 * `queries.ts`.
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

// ---------------------------------------------------------------------------
// Create a run (PER-16)
// ---------------------------------------------------------------------------

export interface CreateRunInput {
  name: string;
  game: GameId;
}

/**
 * Writes the new run's row. `id`, `createdAt` and `updatedAt` are left for `adapter.runs.put` to
 * assign, per hard rule 2 — never generated here. The run starts `active`, with `DEFAULT_RULES`
 * (PER-18 makes them editable) and `finishedAt: null`, and with no routes or fights: seeding those
 * from game data is PER-22 and PER-33.
 */
async function persistCreateRun(adapter: StorageAdapter, input: CreateRunInput): Promise<Run> {
  return adapter.runs.put({
    name: input.name,
    game: input.game,
    status: "active",
    rules: DEFAULT_RULES,
    finishedAt: null,
  });
}

/**
 * Creates a run and switches which runs exist, exactly like `useDeleteRun` does — so, like that
 * mutation, this invalidates the plain `queryKeys.runs()` list key in addition to the newly
 * created run's own per-run keys (via `invalidateRun`). Skipping the list key would leave a
 * mounted run list not showing the new run until a manual reload, with nothing erroring — see the
 * "Deliberately does NOT invalidate" note on `invalidateRun` in `queries.ts`.
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
