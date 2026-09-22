/**
 * Pure state transitions between mon, encounter and fight statuses. No random ids or
 * timestamps: callers supply them, and every function returns a new object rather than
 * mutating its input.
 */

import type { Cause, Draft, Encounter, Fight, Gender, Mon, Death } from "./types";

const MAX_PARTY_SIZE = 6;
export const MAX_MOVES = 4;

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
 * Lowest unoccupied party slot, or null when full. A boxed or dead mon can carry a stale
 * `partySlot`, so occupancy checks status too. Scans for the lowest free index rather than
 * counting, since `killMon` leaves gaps instead of compacting survivors.
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
  levelCaught: number;
  /** Its level now, which can be well past `levelCaught` by the time it's logged. */
  level: number;
  placement: "party" | "box";
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

  if (details.level < details.levelCaught) {
    throw new Error(
      `A mon's current level (${details.level}) cannot be below the level it was caught at (${details.levelCaught}).`,
    );
  }

  const updatedEncounter: Encounter = {
    ...encounter,
    status: "caught",
    speciesId: details.speciesId,
    level: details.levelCaught,
    monId,
  };

  const slot = details.placement === "party" ? nextFreeSlot(party) : null;

  const mon: Draft<Mon> = {
    id: monId,
    runId: encounter.runId,
    encounterId: encounter.id,
    speciesId: details.speciesId,
    speciesIdCaught: details.speciesId,
    nickname: details.nickname,
    gender: details.gender,
    level: details.level,
    levelCaught: details.levelCaught,
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

/** The fields of a caught mon that a correction can change. */
export interface MonAmendments {
  nickname: string | null;
  gender: Gender | null;
  level: number;
  nature: string | null;
  ability: string | null;
  heldItem: string | null;
  moves: string[];
}

export function amendMon({ mon, amendments }: { mon: Mon; amendments: MonAmendments }): Mon {
  if (amendments.level < mon.levelCaught) {
    throw new Error(
      `A mon's current level (${amendments.level}) cannot be below the level it was caught at (${mon.levelCaught}).`,
    );
  }

  if (amendments.moves.length > MAX_MOVES) {
    throw new Error(
      `A mon cannot have more than ${MAX_MOVES} moves (got ${amendments.moves.length}).`,
    );
  }

  return {
    ...mon,
    nickname: amendments.nickname,
    gender: amendments.gender,
    level: amendments.level,
    nature: amendments.nature,
    ability: amendments.ability,
    heldItem: amendments.heldItem,
    moves: amendments.moves,
  };
}

export function clearFight({ fight, clearedAt }: { fight: Fight; clearedAt: string }): Fight {
  if (fight.status !== "pending") {
    throw new Error(`Cannot clear fight ${fight.id}: status is '${fight.status}', not 'pending'.`);
  }

  return { ...fight, status: "cleared", clearedAt };
}
