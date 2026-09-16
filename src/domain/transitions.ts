/**
 * Pure state transitions between the statuses in spec section 5.
 *
 * Purity is the point: no `crypto.randomUUID()`, no `Date.now()`, no `new Date()` in here.
 * Anything non-deterministic (new ids, timestamps) is an input the caller supplies, which keeps
 * every transition deterministic and testable without a database. All functions return new
 * objects; inputs are never mutated.
 *
 * Guards here are invariant checks (programmer errors), not user-input validation — clause
 * enforcement (dupes/species clause) is PER-41, out of scope.
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

// ---------------------------------------------------------------------------
// catchEncounter
// ---------------------------------------------------------------------------

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
  partyCount,
  monId,
  details,
}: {
  encounter: Encounter;
  partyCount: number;
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

  const goesToParty = partyCount < MAX_PARTY_SIZE;

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
    status: goesToParty ? "party" : "box",
    partySlot: goesToParty ? partyCount : null,
    boxOrder: null,
    caughtRouteId: encounter.routeId,
  };

  return { encounter: updatedEncounter, mon };
}

// ---------------------------------------------------------------------------
// missEncounter / skipEncounter
// ---------------------------------------------------------------------------

export function missEncounter(encounter: Encounter): Encounter {
  assertEncounterOpen(encounter);
  return { ...encounter, status: "missed" };
}

export function skipEncounter(encounter: Encounter): Encounter {
  assertEncounterOpen(encounter);
  return { ...encounter, status: "skipped" };
}

// ---------------------------------------------------------------------------
// moveMonToBox / moveMonToParty
// ---------------------------------------------------------------------------

export function moveMonToBox(mon: Mon): Mon {
  assertMonAlive(mon);
  return { ...mon, status: "box", partySlot: null };
}

export function moveMonToParty({ mon, partyCount }: { mon: Mon; partyCount: number }): Mon {
  assertMonAlive(mon);

  if (partyCount >= MAX_PARTY_SIZE) {
    throw new Error(`Party cannot exceed ${MAX_PARTY_SIZE} mons (currently at ${partyCount}).`);
  }

  return { ...mon, status: "party", partySlot: partyCount };
}

// ---------------------------------------------------------------------------
// killMon
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// clearFight
// ---------------------------------------------------------------------------

export function clearFight({ fight, clearedAt }: { fight: Fight; clearedAt: string }): Fight {
  if (fight.status !== "pending") {
    throw new Error(`Cannot clear fight ${fight.id}: status is '${fight.status}', not 'pending'.`);
  }

  return { ...fight, status: "cleared", clearedAt };
}
