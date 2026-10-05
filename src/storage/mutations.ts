/**
 * Mutation hooks over the StorageAdapter.
 */

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { boxLayout, moveBoxedMon } from "@/domain/box-slots";
import { canDeleteFight, orderAfterLast, orderBefore, respaceFights } from "@/domain/custom-fights";
import { DEFAULT_RULES } from "@/domain/rules";
import { canDeleteRoute, nextRouteOrder } from "@/domain/routes";
import {
  amendMon,
  catchEncounter,
  catchShinyBonus,
  evolveMon,
  killMon,
  missEncounter,
  moveMonToBox,
  moveMonToParty,
  planEncounterReset,
  reorderParty,
  reviveMon,
  skipEncounter,
  clearFight,
  unclearFight,
  type CatchDetails,
  type MonAmendments,
} from "@/domain/transitions";
import type {
  Cause,
  Death,
  Encounter,
  Fight,
  GameId,
  Mon,
  Route,
  Rules,
  Run,
} from "@/domain/types";
import { GAMES } from "@/game/registry";
import { seedFights, seedRoutes } from "@/game/seed";

import type { StorageAdapter } from "./adapter";
import { invalidateRun, queryKeys } from "./queries";
import { useStorage } from "./storage-context";

export interface CatchEncounterInput {
  encounter: Encounter;
  details: CatchDetails;
}

export interface CatchEncounterResult {
  encounter: Encounter;
  mon: Mon;
}

const partyOf = (mons: readonly Mon[]): Mon[] => mons.filter((mon) => mon.status === "party");

/**
 * Pins every boxed mon to its `boxLayout` slot and returns the run's mons with that applied.
 * Run it first in any write that changes box membership, so a mon that only had a computed
 * position does not jump when another mon leaves.
 */
async function settleBoxSlots(tx: StorageAdapter, runId: string): Promise<Mon[]> {
  const runMons = await tx.mons.where("runId", runId);
  const layout = boxLayout(runMons);
  const settled: Mon[] = [];

  for (const mon of runMons) {
    const slot = layout.get(mon.id);
    settled.push(
      slot !== undefined && slot !== mon.boxOrder
        ? await tx.mons.put({ ...mon, boxOrder: slot })
        : mon,
    );
  }

  return settled;
}

/**
 * Writes the updated encounter and new mon in one transaction, so a partial write never leaves
 * an encounter pointing at a mon that doesn't exist. monId is generated here, not inside
 * catchEncounter, which stays pure.
 */
export async function persistCatch(
  adapter: StorageAdapter,
  input: CatchEncounterInput,
): Promise<CatchEncounterResult> {
  const monId = crypto.randomUUID();

  return adapter.transaction(async (tx) => {
    const runMons = await settleBoxSlots(tx, input.encounter.runId);
    const { encounter: updatedEncounter, mon: monDraft } = catchEncounter({
      encounter: input.encounter,
      party: partyOf(runMons),
      box: runMons,
      monId,
      details: input.details,
    });

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
    const runMons = await settleBoxSlots(tx, input.runId);
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
      party: partyOf(runMons),
      box: runMons,
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

export interface CatchShinyBonusInput {
  runId: string;
  routeId: string;
  details: CatchDetails;
}

export async function persistCatchShinyBonus(
  adapter: StorageAdapter,
  input: CatchShinyBonusInput,
): Promise<Mon> {
  const monId = crypto.randomUUID();

  return adapter.transaction(async (tx) => {
    const run = await tx.runs.get(input.runId);
    if (run === undefined) {
      throw new Error(`Run ${input.runId} no longer exists.`);
    }
    if (!run.rules.shinyClause) {
      throw new Error("The shiny clause is off for this run.");
    }
    const route = await tx.routes.get(input.routeId);
    if (route?.runId !== input.runId) {
      throw new Error(`Route ${input.routeId} does not belong to this run.`);
    }

    const runMons = await settleBoxSlots(tx, input.runId);
    const draft = catchShinyBonus({
      runId: input.runId,
      routeId: input.routeId,
      party: partyOf(runMons),
      box: runMons,
      monId,
      details: input.details,
    });

    return tx.mons.put(draft);
  });
}

export function useCatchShinyBonus(): UseMutationResult<Mon, Error, CatchShinyBonusInput> {
  const adapter = useStorage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CatchShinyBonusInput) => persistCatchShinyBonus(adapter, input),
    onSuccess: async (mon) => {
      await invalidateRun(queryClient, mon.runId);
    },
  });
}

export interface AmendMonInput {
  mon: Mon;
  amendments: MonAmendments;
  evolvedTo?: string;
  placement?: "party" | "box";
}

export async function persistAmendMon(adapter: StorageAdapter, input: AmendMonInput): Promise<Mon> {
  return adapter.transaction(async (tx) => {
    const runMons = await settleBoxSlots(tx, input.mon.runId);
    const settled = runMons.find((mon) => mon.id === input.mon.id);
    const amended = amendMon({
      mon: {
        ...input.mon,
        boxOrder: settled === undefined ? input.mon.boxOrder : settled.boxOrder,
      },
      amendments: input.amendments,
    });
    const evolved =
      input.evolvedTo === undefined
        ? amended
        : evolveMon({ mon: amended, speciesId: input.evolvedTo });

    if (input.placement === undefined || input.placement === input.mon.status) {
      return tx.mons.put(evolved);
    }

    if (input.placement === "box") {
      return tx.mons.put(moveMonToBox({ mon: evolved, box: runMons }));
    }

    return tx.mons.put(moveMonToParty({ mon: evolved, party: partyOf(runMons) }));
  });
}

export function useAmendMon(): UseMutationResult<Mon, Error, AmendMonInput> {
  const adapter = useStorage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AmendMonInput) => persistAmendMon(adapter, input),
    onSuccess: async (mon) => {
      await invalidateRun(queryClient, mon.runId);
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
 * Deletes a run and all its rows. Irreversible, and this also invalidates the plain
 * queryKeys.runs() list key, which invalidateRun deliberately skips (see queries.ts).
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

export async function persistCreateRun(
  adapter: StorageAdapter,
  input: CreateRunInput,
): Promise<Run> {
  return adapter.transaction(async (tx) => {
    const run = await tx.runs.put({
      name: input.name,
      game: input.game,
      status: "active",
      rules: input.rules ?? DEFAULT_RULES,
      finishedAt: null,
    });

    await tx.routes.putMany(seedRoutes(run.id, GAMES[input.game]));
    await tx.fights.putMany(seedFights(run.id, GAMES[input.game]));

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

export async function persistAddCustomRoute(
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

export interface AddCustomFightInput {
  runId: string;
  name: string;
  levelCap: number | null;
  /** The pending fight the new one goes before. Null puts it after every existing fight. */
  beforeFightId: string | null;
}

export async function persistAddCustomFight(
  adapter: StorageAdapter,
  input: AddCustomFightInput,
): Promise<Fight> {
  return adapter.transaction(async (tx) => {
    let fights = await tx.fights.where("runId", input.runId);
    let order: number | null;

    if (input.beforeFightId === null) {
      order = orderAfterLast(fights);
    } else {
      const target = fights.find((fight) => fight.id === input.beforeFightId);
      if (target?.status !== "pending") {
        throw new Error(`Fight ${input.beforeFightId} is not a pending fight in this run.`);
      }
      order = orderBefore(fights, input.beforeFightId);
      if (order === null) {
        fights = await tx.fights.putMany(respaceFights(fights));
        order = orderBefore(fights, input.beforeFightId);
      }
    }

    return tx.fights.put({
      runId: input.runId,
      gameFightId: null,
      name: input.name.trim(),
      kind: "custom",
      order: order!,
      grantsBadge: false,
      levelCap: input.levelCap,
      status: "pending",
      clearedAt: null,
    });
  });
}

export function useAddCustomFight(): UseMutationResult<Fight, Error, AddCustomFightInput> {
  const adapter = useStorage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddCustomFightInput) => persistAddCustomFight(adapter, input),
    onSuccess: async (fight) => {
      await invalidateRun(queryClient, fight.runId);
    },
  });
}

export interface DeleteCustomFightInput {
  fight: Fight;
}

export async function persistDeleteCustomFight(
  adapter: StorageAdapter,
  input: DeleteCustomFightInput,
): Promise<void> {
  await adapter.transaction(async (tx) => {
    const current = await tx.fights.get(input.fight.id);
    const deaths = await tx.deathsByFight(input.fight.id);

    if (current === undefined || !canDeleteFight(current, deaths)) {
      throw new Error(
        `Cannot delete fight ${input.fight.id}: only a pending custom fight with no losses can go.`,
      );
    }

    await tx.fights.delete(current.id);
  });
}

export function useDeleteCustomFight(): UseMutationResult<void, Error, DeleteCustomFightInput> {
  const adapter = useStorage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteCustomFightInput) => persistDeleteCustomFight(adapter, input),
    onSuccess: async (_result, input) => {
      await invalidateRun(queryClient, input.fight.runId);
    },
  });
}

export interface ResetEncounterInput {
  encounter: Encounter;
}

/** Re-reads inside the transaction so a stale encounter throws instead of deleting twice. */
export async function persistResetEncounter(
  adapter: StorageAdapter,
  input: ResetEncounterInput,
): Promise<void> {
  await adapter.transaction(async (tx) => {
    await settleBoxSlots(tx, input.encounter.runId);
    const encounter = await tx.encounters.get(input.encounter.id);
    if (encounter === undefined) {
      throw new Error(`Encounter ${input.encounter.id} no longer exists.`);
    }
    const mon = encounter.monId === null ? null : ((await tx.mons.get(encounter.monId)) ?? null);
    const deaths = mon === null ? [] : await tx.deaths.where("monId", mon.id);
    const plan = planEncounterReset({ encounter, mon, deaths });

    for (const deathId of plan.deathIds) {
      await tx.deaths.delete(deathId);
    }
    if (plan.monId !== null) {
      await tx.mons.delete(plan.monId);
    }
    await tx.encounters.delete(plan.encounterId);
  });
}

export function useResetEncounter(): UseMutationResult<void, Error, ResetEncounterInput> {
  const adapter = useStorage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ResetEncounterInput) => persistResetEncounter(adapter, input),
    onSuccess: async (_result, input) => {
      await invalidateRun(queryClient, input.encounter.runId);
    },
  });
}

export interface LogDeathInput {
  monId: string;
  cause: Cause;
  routeId: string | null;
  notes: string | null;
  diedAt: string;
}

export interface LogDeathResult {
  mon: Mon;
  death: Death;
}

/** Reads the mon inside the transaction so a stale caller cannot bury a mon twice. */
export async function persistLogDeath(
  adapter: StorageAdapter,
  input: LogDeathInput,
): Promise<LogDeathResult> {
  const deathId = crypto.randomUUID();

  return adapter.transaction(async (tx) => {
    const found = await tx.mons.get(input.monId);
    if (found === undefined) {
      throw new Error(`Mon ${input.monId} no longer exists.`);
    }
    const runMons = await settleBoxSlots(tx, found.runId);
    const current = runMons.find((mon) => mon.id === found.id) ?? found;

    const { mon: deadMon, death: deathDraft } = killMon({
      mon: current,
      deathId,
      details: {
        level: current.level,
        routeId: input.routeId,
        cause: input.cause,
        diedAt: input.diedAt,
        notes: input.notes,
      },
    });

    const mon = await tx.mons.put(deadMon);
    const death = await tx.deaths.put(deathDraft);
    return { mon, death };
  });
}

export interface EditDeathInput {
  deathId: string;
  cause: Cause;
  routeId: string | null;
  notes: string | null;
}

/** Reads the death inside the transaction and leaves when, level and who untouched. */
export async function persistEditDeath(
  adapter: StorageAdapter,
  input: EditDeathInput,
): Promise<Death> {
  return adapter.transaction(async (tx) => {
    const current = await tx.deaths.get(input.deathId);
    if (current === undefined) {
      throw new Error(`Death ${input.deathId} no longer exists.`);
    }
    return tx.deaths.put({
      ...current,
      cause: input.cause,
      routeId: input.routeId,
      notes: input.notes,
    });
  });
}

export function useEditDeath(): UseMutationResult<Death, Error, EditDeathInput> {
  const adapter = useStorage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EditDeathInput) => persistEditDeath(adapter, input),
    onSuccess: async (death) => {
      await invalidateRun(queryClient, death.runId);
    },
  });
}

export interface UndoDeathInput {
  deathId: string;
  placement: "party" | "box";
}

export async function persistUndoDeath(
  adapter: StorageAdapter,
  input: UndoDeathInput,
): Promise<Mon> {
  return adapter.transaction(async (tx) => {
    const death = await tx.deaths.get(input.deathId);
    if (death === undefined) {
      throw new Error(`Death ${input.deathId} no longer exists.`);
    }
    const runMons = await settleBoxSlots(tx, death.runId);
    const mon = runMons.find((m) => m.id === death.monId);
    if (mon === undefined) {
      throw new Error(`Mon ${death.monId} no longer exists.`);
    }

    const revived = await tx.mons.put(
      reviveMon({ mon, party: partyOf(runMons), box: runMons, placement: input.placement }),
    );
    await tx.deaths.delete(death.id);
    return revived;
  });
}

export function useUndoDeath(): UseMutationResult<Mon, Error, UndoDeathInput> {
  const adapter = useStorage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UndoDeathInput) => persistUndoDeath(adapter, input),
    onSuccess: async (mon) => {
      await invalidateRun(queryClient, mon.runId);
    },
  });
}

export interface ReorderPartyInput {
  runId: string;
  orderedIds: readonly string[];
}

export async function persistReorderParty(
  adapter: StorageAdapter,
  input: ReorderPartyInput,
): Promise<void> {
  await adapter.transaction(async (tx) => {
    const runMons = await tx.mons.where("runId", input.runId);
    const party = runMons.filter((m) => m.status === "party");
    for (const mon of reorderParty(party, input.orderedIds)) {
      await tx.mons.put(mon);
    }
  });
}

export interface MoveBoxedMonInput {
  runId: string;
  monId: string;
  toSlot: number;
}

export async function persistMoveBoxedMon(
  adapter: StorageAdapter,
  input: MoveBoxedMonInput,
): Promise<void> {
  await adapter.transaction(async (tx) => {
    const runMons = await settleBoxSlots(tx, input.runId);
    for (const mon of moveBoxedMon(runMons, input.monId, input.toSlot)) {
      await tx.mons.put(mon);
    }
  });
}

export interface MoveMonToPartyInput {
  monId: string;
}

export async function persistMoveMonToParty(
  adapter: StorageAdapter,
  input: MoveMonToPartyInput,
): Promise<Mon> {
  return adapter.transaction(async (tx) => {
    const found = await tx.mons.get(input.monId);
    if (found === undefined) {
      throw new Error(`Mon ${input.monId} not found`);
    }
    const runMons = await settleBoxSlots(tx, found.runId);
    const mon = runMons.find((m) => m.id === found.id) ?? found;
    return tx.mons.put(moveMonToParty({ mon, party: partyOf(runMons) }));
  });
}

export function useMoveMonToParty(): UseMutationResult<Mon, Error, MoveMonToPartyInput> {
  const adapter = useStorage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MoveMonToPartyInput) => persistMoveMonToParty(adapter, input),
    onSuccess: async (mon) => {
      await invalidateRun(queryClient, mon.runId);
    },
  });
}

export function useMoveBoxedMon(): UseMutationResult<void, Error, MoveBoxedMonInput> {
  const adapter = useStorage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MoveBoxedMonInput) => persistMoveBoxedMon(adapter, input),
    onSuccess: async (_, input) => {
      await invalidateRun(queryClient, input.runId);
    },
  });
}

export function useReorderParty(): UseMutationResult<void, Error, ReorderPartyInput> {
  const adapter = useStorage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReorderPartyInput) => persistReorderParty(adapter, input),
    onSuccess: async (_, input) => {
      await invalidateRun(queryClient, input.runId);
    },
  });
}

export function useLogDeath(): UseMutationResult<LogDeathResult, Error, LogDeathInput> {
  const adapter = useStorage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LogDeathInput) => persistLogDeath(adapter, input),
    onSuccess: async (result) => {
      await invalidateRun(queryClient, result.mon.runId);
    },
  });
}

export interface FightLoss {
  monId: string;
  species: string;
  level: number;
  move: string | null;
}

export interface LogFightAttemptInput {
  fightId: string;
  won: boolean;
  losses: FightLoss[];
  at: string;
}

export interface LogFightAttemptResult {
  fight: Fight;
  deaths: Death[];
}

/** Checks the fight and every loss inside the transaction, so a bad loss undoes the earlier ones. */
export async function persistLogFightAttempt(
  adapter: StorageAdapter,
  input: LogFightAttemptInput,
): Promise<LogFightAttemptResult> {
  return adapter.transaction(async (tx) => {
    const fight = await tx.fights.get(input.fightId);
    if (fight === undefined) {
      throw new Error(`Fight ${input.fightId} no longer exists.`);
    }
    if (fight.status === "cleared") {
      throw new Error(`Fight ${fight.id} is already cleared.`);
    }

    const runMons = await settleBoxSlots(tx, fight.runId);
    const deaths: Death[] = [];

    for (const loss of input.losses) {
      const mon = runMons.find((candidate) => candidate.id === loss.monId);
      if (mon === undefined) {
        throw new Error(`Mon ${loss.monId} is not part of run ${fight.runId}.`);
      }
      const current = (await tx.mons.get(mon.id)) ?? mon;

      const { mon: deadMon, death } = killMon({
        mon: current,
        deathId: crypto.randomUUID(),
        details: {
          level: current.level,
          routeId: null,
          cause: {
            type: "trainer",
            fightId: fight.id,
            trainerName: null,
            species: loss.species,
            level: loss.level,
            move: loss.move,
          },
          diedAt: input.at,
          notes: null,
        },
      });
      await tx.mons.put(deadMon);
      deaths.push(await tx.deaths.put(death));
    }

    const saved = input.won
      ? await tx.fights.put(clearFight({ fight, clearedAt: input.at }))
      : fight;
    return { fight: saved, deaths };
  });
}

export function useLogFightAttempt(): UseMutationResult<
  LogFightAttemptResult,
  Error,
  LogFightAttemptInput
> {
  const adapter = useStorage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LogFightAttemptInput) => persistLogFightAttempt(adapter, input),
    onSuccess: async (result) => {
      await invalidateRun(queryClient, result.fight.runId);
    },
  });
}

/** Leaves the deaths from the fight in place. */
export async function persistUndoClearFight(
  adapter: StorageAdapter,
  fightId: string,
): Promise<Fight> {
  return adapter.transaction(async (tx) => {
    const fight = await tx.fights.get(fightId);
    if (fight === undefined) {
      throw new Error(`Fight ${fightId} no longer exists.`);
    }
    return tx.fights.put(unclearFight({ fight }));
  });
}

export function useUndoClearFight(): UseMutationResult<Fight, Error, string> {
  const adapter = useStorage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fightId: string) => persistUndoClearFight(adapter, fightId),
    onSuccess: async (fight) => {
      await invalidateRun(queryClient, fight.runId);
    },
  });
}
