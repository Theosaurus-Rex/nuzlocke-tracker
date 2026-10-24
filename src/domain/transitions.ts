/**
 * Pure state transitions between mon, encounter and fight statuses. No random ids or
 * timestamps: callers supply them, and every function returns a new object rather than
 * mutating its input.
 */

import { boxLayout, nextFreeBoxSlot } from "./box-slots";
import { MAX_MOVES, isMoveset } from "./moveset";
import type { Cause, Draft, Encounter, Fight, Gender, Mon, Moveset, Death } from "./types";

export const MAX_PARTY_SIZE = 6;
export { MAX_MOVES };

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

function assertMonDead(mon: Mon): void {
  if (mon.status !== "dead") {
    throw new Error(`Cannot revive mon ${mon.id}: it is not dead.`);
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
  moves: Moveset;
  shiny: boolean;
}

function assertMoveset(moves: unknown): void {
  if (!isMoveset(moves)) {
    throw new Error(
      `A mon needs exactly ${MAX_MOVES} move slots, each a move or null (got ${JSON.stringify(moves)}).`,
    );
  }
}

function assertCatchDetails(details: CatchDetails): void {
  assertMoveset(details.moves);

  if (details.level < details.levelCaught) {
    throw new Error(
      `A mon's current level (${details.level}) cannot be below the level it was caught at (${details.levelCaught}).`,
    );
  }
}

function buildCaughtMon({
  runId,
  encounterId,
  routeId,
  party,
  box,
  monId,
  details,
}: {
  runId: string;
  encounterId: string | null;
  routeId: string;
  party: readonly Mon[];
  box: readonly Mon[];
  monId: string;
  details: CatchDetails;
}): Draft<Mon> {
  const slot = details.placement === "party" ? nextFreeSlot(party) : null;

  return {
    id: monId,
    runId,
    encounterId,
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
    boxOrder: slot === null ? nextFreeBoxSlot(box) : null,
    caughtRouteId: routeId,
    shiny: details.shiny,
  };
}

export function catchEncounter({
  encounter,
  party,
  box,
  monId,
  details,
}: {
  encounter: Encounter;
  party: readonly Mon[];
  box: readonly Mon[];
  monId: string;
  details: CatchDetails;
}): { encounter: Encounter; mon: Draft<Mon> } {
  assertEncounterOpen(encounter);
  assertCatchDetails(details);

  const updatedEncounter: Encounter = {
    ...encounter,
    status: "caught",
    speciesId: details.speciesId,
    level: details.levelCaught,
    monId,
  };

  const mon = buildCaughtMon({
    runId: encounter.runId,
    encounterId: encounter.id,
    routeId: encounter.routeId,
    party,
    box,
    monId,
    details,
  });

  return { encounter: updatedEncounter, mon };
}

/** A shiny caught on a route whose encounter is already used. It has no encounter of its own. */
export function catchShinyBonus({
  runId,
  routeId,
  party,
  box,
  monId,
  details,
}: {
  runId: string;
  routeId: string;
  party: readonly Mon[];
  box: readonly Mon[];
  monId: string;
  details: CatchDetails;
}): Draft<Mon> {
  assertCatchDetails(details);

  return buildCaughtMon({
    runId,
    encounterId: null,
    routeId,
    party,
    box,
    monId,
    details: { ...details, shiny: true },
  });
}

export function missEncounter(encounter: Encounter): Encounter {
  assertEncounterOpen(encounter);
  return { ...encounter, status: "missed" };
}

export function skipEncounter(encounter: Encounter): Encounter {
  assertEncounterOpen(encounter);
  return { ...encounter, status: "skipped" };
}

function assertPartySlotFree(slot: number, party: readonly Mon[], monId: string): void {
  if (!Number.isInteger(slot) || slot < 0 || slot >= MAX_PARTY_SIZE) {
    throw new Error(`Party slot ${String(slot)} is not between 0 and ${MAX_PARTY_SIZE - 1}.`);
  }
  if (party.some((m) => m.id !== monId && m.status === "party" && m.partySlot === slot)) {
    throw new Error(`Party slot ${String(slot)} is already taken.`);
  }
}

function assertBoxSlotFree(slot: number, box: readonly Mon[], monId: string): void {
  if (!Number.isInteger(slot) || slot < 0) {
    throw new Error(`Box slot ${String(slot)} is not a non-negative integer.`);
  }
  const taken = boxLayout(box.filter((m) => m.id !== monId)).values();
  if ([...taken].includes(slot)) {
    throw new Error(`Box slot ${String(slot)} is already taken.`);
  }
}

export function moveMonToBox({
  mon,
  box,
  slot,
}: {
  mon: Mon;
  box: readonly Mon[];
  slot?: number;
}): Mon {
  assertMonAlive(mon);
  if (slot === undefined) {
    return { ...mon, status: "box", partySlot: null, boxOrder: nextFreeBoxSlot(box, mon.id) };
  }
  assertBoxSlotFree(slot, box, mon.id);
  return { ...mon, status: "box", partySlot: null, boxOrder: slot };
}

export function moveMonToParty({
  mon,
  party,
  slot,
}: {
  mon: Mon;
  party: readonly Mon[];
  slot?: number;
}): Mon {
  assertMonAlive(mon);

  if (slot !== undefined) {
    assertPartySlotFree(slot, party, mon.id);
    return { ...mon, status: "party", partySlot: slot, boxOrder: null };
  }

  const free = nextFreeSlot(party, mon.id);

  if (free === null) {
    throw new Error(`Party cannot exceed ${MAX_PARTY_SIZE} mons (currently at ${MAX_PARTY_SIZE}).`);
  }

  return { ...mon, status: "party", partySlot: free, boxOrder: null };
}

function reslotPartyMon(mon: Mon, party: readonly Mon[], slot: number): Mon[] {
  if (mon.partySlot === null) {
    throw new Error(`Mon ${mon.id} has no party slot.`);
  }
  if (mon.partySlot === slot) {
    return [];
  }
  const occupant = party.find((m) => m.id !== mon.id && m.partySlot === slot);
  if (occupant === undefined) {
    return [moveMonToParty({ mon, party, slot })];
  }
  return [
    moveMonToParty({ mon, party: party.filter((m) => m.id !== occupant.id), slot }),
    moveMonToParty({
      mon: occupant,
      party: party.filter((m) => m.id !== mon.id),
      slot: mon.partySlot,
    }),
  ];
}

export type PlaceTarget = { kind: "party"; slot: number } | { kind: "box"; slot: number };

/**
 * Puts a mon in an exact party or box slot. A mon already there swaps into the slot the mover
 * left, so the party never grows. Returns only the mons that changed. Party to party moves
 * leave gaps alone. A box mon cannot be placed in the box this way.
 */
export function placeMon(mons: readonly Mon[], monId: string, to: PlaceTarget): Mon[] {
  const mon = mons.find((m) => m.id === monId);
  if (mon === undefined) {
    throw new Error(`Mon ${monId} not found.`);
  }
  assertMonAlive(mon);

  const layout = boxLayout(mons);
  const party = mons.filter((m) => m.status === "party");

  if (to.kind === "party") {
    if (mon.status === "party") {
      return reslotPartyMon(mon, party, to.slot);
    }
    const occupant = party.find((m) => m.partySlot === to.slot);
    if (occupant === undefined) {
      return [moveMonToParty({ mon, party, slot: to.slot })];
    }
    const boxSlot = layout.get(mon.id);
    if (boxSlot === undefined) {
      throw new Error(`Mon ${monId} has no box slot.`);
    }
    const others = mons.filter((m) => m.id !== mon.id);
    return [
      moveMonToParty({ mon, party: party.filter((m) => m.id !== occupant.id), slot: to.slot }),
      moveMonToBox({ mon: occupant, box: others, slot: boxSlot }),
    ];
  }

  if (mon.status !== "party" || mon.partySlot === null) {
    throw new Error(`Mon ${monId} is not in the party, so it cannot move to the box.`);
  }
  const occupant = mons.find((m) => m.status === "box" && layout.get(m.id) === to.slot);
  if (occupant === undefined) {
    return [moveMonToBox({ mon, box: mons, slot: to.slot })];
  }
  const others = mons.filter((m) => m.id !== occupant.id);
  return [
    moveMonToBox({ mon, box: others, slot: to.slot }),
    moveMonToParty({
      mon: occupant,
      party: party.filter((m) => m.id !== mon.id),
      slot: mon.partySlot,
    }),
  ];
}

/** Returns only the mons whose slot changed. Slots are compacted to 0..n-1, which closes gaps. */
export function reorderParty(party: readonly Mon[], orderedIds: readonly string[]): Mon[] {
  const partyIds = new Set(party.map((mon) => mon.id));
  const orderedSet = new Set(orderedIds);
  if (
    orderedIds.length !== party.length ||
    orderedSet.size !== orderedIds.length ||
    orderedIds.some((id) => !partyIds.has(id))
  ) {
    throw new Error("The new order must list every party mon exactly once.");
  }

  const changed: Mon[] = [];
  orderedIds.forEach((id, slot) => {
    const mon = party.find((m) => m.id === id);
    if (mon !== undefined && mon.partySlot !== slot) {
      changed.push({ ...mon, partySlot: slot });
    }
  });
  return changed;
}

export function reviveMon({
  mon,
  party,
  box,
  placement,
}: {
  mon: Mon;
  party: readonly Mon[];
  box: readonly Mon[];
  placement: "party" | "box";
}): Mon {
  assertMonDead(mon);

  if (placement === "box") {
    return { ...mon, status: "box", partySlot: null, boxOrder: nextFreeBoxSlot(box, mon.id) };
  }

  const slot = nextFreeSlot(party, mon.id);

  if (slot === null) {
    throw new Error(`Party cannot exceed ${MAX_PARTY_SIZE} mons (currently at ${MAX_PARTY_SIZE}).`);
  }

  return { ...mon, status: "party", partySlot: slot, boxOrder: null };
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

  const updatedMon: Mon = { ...mon, status: "dead", partySlot: null, boxOrder: null };

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
  moves: Moveset;
  shiny: boolean;
}

export function amendMon({ mon, amendments }: { mon: Mon; amendments: MonAmendments }): Mon {
  if (amendments.level < mon.levelCaught) {
    throw new Error(
      `A mon's current level (${amendments.level}) cannot be below the level it was caught at (${mon.levelCaught}).`,
    );
  }

  assertMoveset(amendments.moves);

  return {
    ...mon,
    nickname: amendments.nickname,
    gender: amendments.gender,
    level: amendments.level,
    nature: amendments.nature,
    ability: amendments.ability,
    heldItem: amendments.heldItem,
    moves: amendments.moves,
    shiny: amendments.shiny,
  };
}

export function evolveMon({ mon, speciesId }: { mon: Mon; speciesId: string }): Mon {
  if (speciesId.trim() === "") {
    throw new Error("A mon cannot evolve into an empty species.");
  }
  return { ...mon, speciesId };
}

export function clearFight({ fight, clearedAt }: { fight: Fight; clearedAt: string }): Fight {
  if (fight.status !== "pending") {
    throw new Error(`Cannot clear fight ${fight.id}: status is '${fight.status}', not 'pending'.`);
  }

  return { ...fight, status: "cleared", clearedAt };
}

export function unclearFight({ fight }: { fight: Fight }): Fight {
  if (fight.status !== "cleared") {
    throw new Error(
      `Cannot unclear fight ${fight.id}: status is '${fight.status}', not 'cleared'.`,
    );
  }

  return { ...fight, status: "pending", clearedAt: null };
}

export interface EncounterResetPlan {
  encounterId: string;
  monId: string | null;
  deathIds: string[];
}

export function planEncounterReset({
  encounter,
  mon,
  deaths,
}: {
  encounter: Encounter;
  mon: Mon | null;
  deaths: readonly Death[];
}): EncounterResetPlan {
  if (encounter.status === "open") {
    throw new Error(
      `Encounter ${encounter.id} has not been logged yet, so there is nothing to reset.`,
    );
  }
  if ((encounter.monId === null) !== (mon === null)) {
    throw new Error(`Encounter ${encounter.id} and its mon do not match.`);
  }
  if (mon !== null && (mon.id !== encounter.monId || mon.encounterId !== encounter.id)) {
    throw new Error(`Mon ${mon.id} does not belong to encounter ${encounter.id}.`);
  }
  if (deaths.some((death) => death.monId !== mon?.id)) {
    throw new Error(`A death passed for encounter ${encounter.id} does not belong to its mon.`);
  }
  return {
    encounterId: encounter.id,
    monId: mon?.id ?? null,
    deathIds: deaths.map((death) => death.id),
  };
}
