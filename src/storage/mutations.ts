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
 * This module depends ONLY on the `StorageAdapter` interface (via `useStorage`) and the pure
 * transition in `src/domain/transitions.ts`. It must never import Dexie.
 */

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { catchEncounter, type CatchDetails } from "@/domain/transitions";
import type { Encounter, Mon, Run, RunStatus } from "@/domain/types";

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
// Archive / unarchive a run (PER-14)
// ---------------------------------------------------------------------------

async function persistRunStatus(
  adapter: StorageAdapter,
  runId: string,
  status: RunStatus,
): Promise<Run> {
  const run = await adapter.runs.get(runId);
  if (!run) {
    throw new Error(`Cannot set status on run ${runId}: no such run.`);
  }
  return adapter.runs.put({ ...run, status });
}

/**
 * Shared by `useArchiveRun` and `useUnarchiveRun`. A run changing status changes WHICH runs
 * belong in each tab of the run list, so — unlike `useCatchEncounter` — this must invalidate the
 * plain `queryKeys.runs()` list key as well as the per-run keys `invalidateRun` covers. Skipping
 * that leaves the run visible in its old tab until a manual reload, with nothing erroring. See
 * the "Deliberately does NOT invalidate" note on `invalidateRun` in `queries.ts`.
 */
function useSetRunStatus(status: RunStatus): UseMutationResult<Run, Error, string> {
  const adapter = useStorage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (runId: string) => persistRunStatus(adapter, runId, status),
    onSuccess: async (run) => {
      await Promise.all([
        invalidateRun(queryClient, run.id),
        queryClient.invalidateQueries({ queryKey: queryKeys.runs() }),
      ]);
    },
  });
}

/** Sets a run's status to `"archived"`. Takes the run's id as the mutation variable. */
export function useArchiveRun(): UseMutationResult<Run, Error, string> {
  return useSetRunStatus("archived");
}

/**
 * Sets a run's status back to `"active"`, regardless of whether it was active or finished before
 * being archived — the ticket (PER-14) specifies "returns it to active", not the prior status,
 * and `Run` does not keep a record of the pre-archive status to restore.
 */
export function useUnarchiveRun(): UseMutationResult<Run, Error, string> {
  return useSetRunStatus("active");
}
