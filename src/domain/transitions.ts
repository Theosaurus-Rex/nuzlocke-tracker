/**
 * Pure state transitions between mon, encounter and fight statuses.
 *
 * No `crypto.randomUUID()`, no `Date.now()`, no `new Date()`. Non-deterministic inputs (ids,
 * timestamps) are supplied by the caller. All functions return new objects; inputs are never
 * mutated.
 *
 * Guards here are invariant checks, not user-input validation. Clause enforcement is out of
 * scope.
 */

import type { Cause, Draft, Encounter, Fight, Gender, Mon, Death } from "./types";

const MAX_PARTY_SIZE = 6;
const MAX_MOVES = 4;

function assertEncounterOpen(encounter: Encounter): void {
  if (encounter.status !== "open") {
    throw new Error(
      `Cannot transition encounter ${encounter.id}: status is '${encounter.status}', not 'open'.`,
    );
  }
}

function assertMonAlive(mon: Mon): void {
  if (mon.status === "dead") {
    throw new Error(`Cannot transition mon ${mon.id}: it is already dead. Death is terminal.`);
  }
}

/**
 * Lowest unoccupied party slot, or null when all six are taken.
 *
 * A slot counts as occupied only when its mon has `status === 'party'` and a non-null
 * `partySlot`; a boxed or dead mon with a stale `partySlot` must not reserve it. `killMon` frees
 * a slot without compacting the survivors, so this scans for the lowest free index rather than
 * deriving it from a count.
 */
function nextFreeSlot(party: readonly Mon[], excludeMonId?: string): number | null {
  const occupied = new Set(
    party
      .filter((mon) => mon.id !== excludeMonId && mon.status === "party" && mon.partySlot !== null)
      .map((mon) => mon.partySlot),
  );

  for (let slot = 0; slot < MAX_PARTY_SIZE; slot++) {
    if (!occupied.has(slot)) {
      return slot;
    }
  }

  return null;
}

/** The attributes of a mon known only at the moment it's caught. */
export interface CatchDetails {
  speciesId: string;
  level: number;
  nickname: string | null;
  gender: Gender | null;
  nature: string | null;
  ability: string | null;
  heldItem: string | null;
  moves: string[];
}

export function catchEncounter({
  encounter,
  party,
  monId,
  details,
}: {
  encounter: Encounter;
  party: readonly Mon[];
  monId: string;
  details: CatchDetails;
}): { encounter: Encounter; mon: Draft<Mon> } {
  assertEncounterOpen(encounter);

  if (details.moves.length > MAX_MOVES) {
    throw new Error(
      `A mon cannot have more than ${MAX_MOVES} moves (got ${details.moves.length}).`,
    );
  }

  const updatedEncounter: Encounter = {
    ...encounter,
    status: "caught",
    speciesId: details.speciesId,
    level: details.level,
    monId,
  };

  const slot = nextFreeSlot(party);

  const mon: Draft<Mon> = {
    id: monId,
    runId: encounter.runId,
    encounterId: encounter.id,
    speciesId: details.speciesId,
    speciesIdCaught: details.speciesId,
    nickname: details.nickname,
    gender: details.gender,
    level: details.level,
    levelCaught: details.level,
    nature: details.nature,
    ability: details.ability,
    heldItem: details.heldItem,
    moves: details.moves,
    status: slot === null ? "box" : "party",
    partySlot: slot,
    boxOrder: null,
    caughtRouteId: encounter.routeId,
  };

  return { encounter: updatedEncounter, mon };
}

export function missEncounter(encounter: Encounter): Encounter {
  assertEncounterOpen(encounter);
  return { ...encounter, status: "missed" };
}

export function skipEncounter(encounter: Encounter): Encounter {
  assertEncounterOpen(encounter);
  return { ...encounter, status: "skipped" };
}

export function moveMonToBox(mon: Mon): Mon {
  assertMonAlive(mon);
  return { ...mon, status: "box", partySlot: null };
}

export function moveMonToParty({ mon, party }: { mon: Mon; party: readonly Mon[] }): Mon {
  assertMonAlive(mon);

  const slot = nextFreeSlot(party, mon.id);

  if (slot === null) {
    throw new Error(`Party cannot exceed ${MAX_PARTY_SIZE} mons (currently at ${MAX_PARTY_SIZE}).`);
  }

  return { ...mon, status: "party", partySlot: slot };
}

/** The attributes of a death known only at the moment it happens. */
export interface KillDetails {
  level: number;
  routeId: string | null;
  cause: Cause;
  diedAt: string;
  notes: string | null;
}

export function killMon({
  mon,
  deathId,
  details,
}: {
  mon: Mon;
  deathId: string;
  details: KillDetails;
}): { mon: Mon; death: Draft<Death> } {
  assertMonAlive(mon);

  const updatedMon: Mon = { ...mon, status: "dead", partySlot: null };

  const death: Draft<Death> = {
    id: deathId,
    runId: mon.runId,
    monId: mon.id,
    level: details.level,
    routeId: details.routeId,
    cause: details.cause,
    diedAt: details.diedAt,
    notes: details.notes,
  };

  return { mon: updatedMon, death };
}

export function clearFight({ fight, clearedAt }: { fight: Fight; clearedAt: string }): Fight {
  if (fight.status !== "pending") {
    throw new Error(`Cannot clear fight ${fight.id}: status is '${fight.status}', not 'pending'.`);
  }

  return { ...fight, status: "cleared", clearedAt };
}
