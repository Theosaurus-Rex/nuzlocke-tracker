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
import type { Encounter, Mon } from "@/domain/types";

import type { StorageAdapter } from "./adapter";
import { invalidateRun } from "./queries";
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
