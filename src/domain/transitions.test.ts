import { describe, expect, test } from "vitest";

import {
  catchEncounter,
  clearFight,
  killMon,
  missEncounter,
  moveMonToBox,
  moveMonToParty,
  skipEncounter,
  type CatchDetails,
  type KillDetails,
} from "@/domain/transitions";
import type { Encounter, Fight, Mon } from "@/domain/types";

function makeEncounter(overrides: Partial<Encounter> = {}): Encounter {
  return {
    id: "encounter-1",
    runId: "run-1",
    routeId: "route-1",
    status: "open",
    speciesId: null,
    level: null,
    monId: null,
    notes: null,
    createdAt: "2026-09-17T00:00:00.000Z",
    updatedAt: "2026-09-17T00:00:00.000Z",
    ...overrides,
  };
}

function makeMon(overrides: Partial<Mon> = {}): Mon {
  return {
    id: "mon-1",
    runId: "run-1",
    encounterId: "encounter-1",
    speciesId: "chikorita",
    speciesIdCaught: "chikorita",
    nickname: null,
    gender: null,
    level: 5,
    levelCaught: 5,
    nature: null,
    ability: null,
    heldItem: null,
    moves: [],
    status: "party",
    partySlot: 0,
    boxOrder: null,
    caughtRouteId: "route-1",
    createdAt: "2026-09-17T00:00:00.000Z",
    updatedAt: "2026-09-17T00:00:00.000Z",
    ...overrides,
  };
}

function makeFight(overrides: Partial<Fight> = {}): Fight {
  return {
    id: "fight-1",
    runId: "run-1",
    gameFightId: null,
    name: "Falkner",
    kind: "gym",
    order: 1,
    grantsBadge: true,
    levelCap: 15,
    status: "pending",
    clearedAt: null,
    createdAt: "2026-09-17T00:00:00.000Z",
    updatedAt: "2026-09-17T00:00:00.000Z",
    ...overrides,
  };
}

const catchDetails: CatchDetails = {
  speciesId: "chikorita",
  level: 5,
  nickname: null,
  gender: "female",
  nature: null,
  ability: null,
  heldItem: null,
  moves: ["tackle"],
};

/** Builds a party of mons occupying exactly the given slots (in `'party'` status). */
function partyInSlots(slots: number[]): Mon[] {
  return slots.map((slot) =>
    makeMon({ id: `party-mon-${String(slot)}`, status: "party", partySlot: slot }),
  );
}

describe("catchEncounter", () => {
  test("moves the encounter to caught and links the new mon", () => {
    const encounter = makeEncounter();
    const { encounter: result, mon } = catchEncounter({
      encounter,
      party: [],
      monId: "mon-1",
      details: catchDetails,
    });

    expect(result.status).toBe("caught");
    expect(result.speciesId).toBe("chikorita");
    expect(result.level).toBe(5);
    expect(result.monId).toBe("mon-1");
    expect(mon.id).toBe("mon-1");
  });

  test("sends the mon to the party with the next free slot when party has room", () => {
    const { mon } = catchEncounter({
      encounter: makeEncounter(),
      party: partyInSlots([0, 1, 2]),
      monId: "mon-4",
      details: catchDetails,
    });

    expect(mon.status).toBe("party");
    expect(mon.partySlot).toBe(3);
  });

  test("a gap in the party is reused before any higher slot: slots 0, 2, 3 occupied gets slot 1", () => {
    const { mon } = catchEncounter({
      encounter: makeEncounter(),
      party: partyInSlots([0, 2, 3]),
      monId: "mon-new",
      details: catchDetails,
    });

    expect(mon.status).toBe("party");
    expect(mon.partySlot).toBe(1);
  });

  test("no two party mons share a partySlot after a gap is filled", () => {
    const party = partyInSlots([0, 2, 3]);
    const { mon } = catchEncounter({
      encounter: makeEncounter(),
      party,
      monId: "mon-new",
      details: catchDetails,
    });

    const resultingParty = [...party, mon];
    const usedSlots = resultingParty.map((m) => m.partySlot);
    expect(new Set(usedSlots).size).toBe(usedSlots.length);
  });

  test("a full party (slots 0-5 occupied) boxes the catch with a null slot", () => {
    const { mon } = catchEncounter({
      encounter: makeEncounter(),
      party: partyInSlots([0, 1, 2, 3, 4, 5]),
      monId: "mon-7",
      details: catchDetails,
    });

    expect(mon.status).toBe("box");
    expect(mon.partySlot).toBeNull();
  });

  test("boxed and dead mons in the party array do not reserve their stale slots", () => {
    const staleBoxedMon = makeMon({ id: "boxed", status: "box", partySlot: 1 });
    const staleDeadMon = makeMon({ id: "dead", status: "dead", partySlot: 2 });
    const party = [staleBoxedMon, staleDeadMon, ...partyInSlots([0])];

    const { mon } = catchEncounter({
      encounter: makeEncounter(),
      party,
      monId: "mon-new",
      details: catchDetails,
    });

    // Slot 0 is genuinely occupied; slots 1 and 2 look occupied only via stale non-party rows,
    // so the lowest real free slot is 1, not 3.
    expect(mon.status).toBe("party");
    expect(mon.partySlot).toBe(1);
  });

  test("sets speciesIdCaught and levelCaught to match the catch-time values", () => {
    const { mon } = catchEncounter({
      encounter: makeEncounter(),
      party: [],
      monId: "mon-1",
      details: catchDetails,
    });

    expect(mon.speciesIdCaught).toBe(mon.speciesId);
    expect(mon.levelCaught).toBe(mon.level);
  });

  test("stamps caughtRouteId from the encounter's routeId", () => {
    const { mon } = catchEncounter({
      encounter: makeEncounter({ routeId: "route-42" }),
      party: [],
      monId: "mon-1",
      details: catchDetails,
    });

    expect(mon.caughtRouteId).toBe("route-42");
  });

  test("does not mutate the input encounter", () => {
    const encounter = makeEncounter();
    const snapshot = { ...encounter };
    catchEncounter({ encounter, party: [], monId: "mon-1", details: catchDetails });
    expect(encounter).toEqual(snapshot);
  });

  test("throws when the encounter is not open", () => {
    const encounter = makeEncounter({ status: "missed" });
    expect(() =>
      catchEncounter({ encounter, party: [], monId: "mon-1", details: catchDetails }),
    ).toThrow(/not 'open'/);
  });

  test("throws when the catch details carry more than 4 moves", () => {
    const encounter = makeEncounter();
    const tooManyMoves: CatchDetails = {
      ...catchDetails,
      moves: ["tackle", "growl", "vine-whip", "razor-leaf", "synthesis"],
    };
    expect(() =>
      catchEncounter({ encounter, party: [], monId: "mon-1", details: tooManyMoves }),
    ).toThrow(/4 moves/);
  });
});

describe("missEncounter", () => {
  test("marks an open encounter as missed", () => {
    const result = missEncounter(makeEncounter());
    expect(result.status).toBe("missed");
  });

  test("does not mutate the input", () => {
    const encounter = makeEncounter();
    const snapshot = { ...encounter };
    missEncounter(encounter);
    expect(encounter).toEqual(snapshot);
  });

  test("throws when the encounter is not open", () => {
    expect(() => missEncounter(makeEncounter({ status: "caught" }))).toThrow(/not 'open'/);
  });
});

describe("skipEncounter", () => {
  test("marks an open encounter as skipped", () => {
    const result = skipEncounter(makeEncounter());
    expect(result.status).toBe("skipped");
  });

  test("throws when the encounter is not open", () => {
    expect(() => skipEncounter(makeEncounter({ status: "skipped" }))).toThrow(/not 'open'/);
  });
});

describe("moveMonToBox", () => {
  test("boxes a party mon and clears its slot", () => {
    const mon = makeMon({ status: "party", partySlot: 2 });
    const result = moveMonToBox(mon);
    expect(result.status).toBe("box");
    expect(result.partySlot).toBeNull();
  });

  test("does not mutate the input", () => {
    const mon = makeMon({ status: "party", partySlot: 2 });
    const snapshot = { ...mon };
    moveMonToBox(mon);
    expect(mon).toEqual(snapshot);
  });

  test("throws on a dead mon", () => {
    const mon = makeMon({ status: "dead", partySlot: null });
    expect(() => moveMonToBox(mon)).toThrow(/already dead/);
  });
});

describe("moveMonToParty", () => {
  test("assigns the next free slot when the party has room", () => {
    const mon = makeMon({ id: "boxed-mon", status: "box", partySlot: null });
    const party = partyInSlots([0, 1, 2, 3]);
    const result = moveMonToParty({ mon, party });
    expect(result.status).toBe("party");
    expect(result.partySlot).toBe(4);
  });

  test("a gap in the party is reused: slots 0, 2, 3 occupied gets slot 1", () => {
    const mon = makeMon({ id: "boxed-mon", status: "box", partySlot: null });
    const party = partyInSlots([0, 2, 3]);
    const result = moveMonToParty({ mon, party });
    expect(result.status).toBe("party");
    expect(result.partySlot).toBe(1);
  });

  test("throws when the party is already full", () => {
    const mon = makeMon({ id: "boxed-mon", status: "box", partySlot: null });
    const party = partyInSlots([0, 1, 2, 3, 4, 5]);
    expect(() => moveMonToParty({ mon, party })).toThrow(/cannot exceed 6/);
  });

  test("re-slotting a mon already in the party does not have it block itself", () => {
    // The party is "full" at 6, but one of those 6 is the mon being moved: excluding it should
    // free exactly its own current slot rather than throwing.
    const mon = makeMon({ id: "already-in-party", status: "party", partySlot: 2 });
    const party = [...partyInSlots([0, 1, 3, 4, 5]), mon];

    const result = moveMonToParty({ mon, party });

    expect(result.status).toBe("party");
    expect(result.partySlot).toBe(2);
  });

  test("throws on a dead mon", () => {
    const mon = makeMon({ status: "dead", partySlot: null });
    expect(() => moveMonToParty({ mon, party: [] })).toThrow(/already dead/);
  });
});

describe("killMon", () => {
  const killDetails: KillDetails = {
    level: 12,
    routeId: "route-3",
    cause: { type: "wild", species: "geodude", level: 11, move: "rock-throw" },
    diedAt: "2026-09-17T01:00:00.000Z",
    notes: null,
  };

  test("marks a party mon dead and frees its slot", () => {
    const mon = makeMon({ status: "party", partySlot: 1 });
    const { mon: result, death } = killMon({ mon, deathId: "death-1", details: killDetails });

    expect(result.status).toBe("dead");
    expect(result.partySlot).toBeNull();
    expect(death.id).toBe("death-1");
    expect(death.monId).toBe(mon.id);
    expect(death.cause).toEqual(killDetails.cause);
  });

  test("marks a boxed mon dead", () => {
    const mon = makeMon({ status: "box", partySlot: null });
    const { mon: result } = killMon({ mon, deathId: "death-2", details: killDetails });
    expect(result.status).toBe("dead");
    expect(result.partySlot).toBeNull();
  });

  test("does not mutate the input mon", () => {
    const mon = makeMon({ status: "party", partySlot: 1 });
    const snapshot = { ...mon };
    killMon({ mon, deathId: "death-1", details: killDetails });
    expect(mon).toEqual(snapshot);
  });

  test("throws on a mon that is already dead — there is no revive", () => {
    const mon = makeMon({ status: "dead", partySlot: null });
    expect(() => killMon({ mon, deathId: "death-3", details: killDetails })).toThrow(
      /already dead/,
    );
  });
});

describe("clearFight", () => {
  test("clears a pending fight and stamps clearedAt", () => {
    const fight = makeFight();
    const result = clearFight({ fight, clearedAt: "2026-09-17T02:00:00.000Z" });
    expect(result.status).toBe("cleared");
    expect(result.clearedAt).toBe("2026-09-17T02:00:00.000Z");
  });

  test("does not mutate the input", () => {
    const fight = makeFight();
    const snapshot = { ...fight };
    clearFight({ fight, clearedAt: "2026-09-17T02:00:00.000Z" });
    expect(fight).toEqual(snapshot);
  });

  test("throws when the fight is already cleared", () => {
    const fight = makeFight({ status: "cleared", clearedAt: "2026-09-16T00:00:00.000Z" });
    expect(() => clearFight({ fight, clearedAt: "2026-09-17T02:00:00.000Z" })).toThrow(
      /not 'pending'/,
    );
  });
});
