import { describe, expect, test } from "vitest";

import {
  amendMon,
  catchEncounter,
  clearFight,
  evolveMon,
  killMon,
  missEncounter,
  moveMonToBox,
  moveMonToParty,
  planEncounterReset,
  skipEncounter,
  type CatchDetails,
  type KillDetails,
  type MonAmendments,
} from "@/domain/transitions";
import type { Death, Encounter, Fight, Mon } from "@/domain/types";

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
    shiny: false,
    createdAt: "2026-09-17T00:00:00.000Z",
    updatedAt: "2026-09-17T00:00:00.000Z",
    ...overrides,
  };
}

function makeDeath(overrides: Partial<Death> = {}): Death {
  return {
    id: "death-1",
    runId: "run-1",
    monId: "mon-1",
    level: 12,
    routeId: "route-3",
    cause: { type: "wild", species: "geodude", level: 11, move: "rock-throw" },
    diedAt: "2026-09-17T01:00:00.000Z",
    notes: null,
    createdAt: "2026-09-17T01:00:00.000Z",
    updatedAt: "2026-09-17T01:00:00.000Z",
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
  levelCaught: 5,
  level: 5,
  placement: "party",
  nickname: null,
  gender: "female",
  nature: null,
  ability: null,
  heldItem: null,
  moves: ["tackle"],
  shiny: false,
};

const killDetails: KillDetails = {
  level: 12,
  routeId: "route-3",
  cause: { type: "wild", species: "geodude", level: 11, move: "rock-throw" },
  diedAt: "2026-09-17T01:00:00.000Z",
  notes: null,
};

/** Builds a party of mons occupying exactly the given slots (in `'party'` status). */
function partyInSlots(slots: number[]): Mon[] {
  return slots.map((slot) =>
    makeMon({ id: `party-mon-${String(slot)}`, status: "party", partySlot: slot }),
  );
}

describe("catchEncounter", () => {
  test("moves the encounter to caught and links the new mon", () => {
    // routeId is deliberately non-default here, to prove caughtRouteId is read from the
    // encounter, not hardcoded.
    const encounter = makeEncounter({ routeId: "route-42" });
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

    expect(mon).toMatchObject({
      id: "mon-1",
      speciesId: "chikorita",
      speciesIdCaught: "chikorita",
      level: 5,
      levelCaught: 5,
      status: "party",
      partySlot: 0,
      caughtRouteId: "route-42",
    });
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

  test("the encounter records the level met at, not the mon's current level", () => {
    const details: CatchDetails = { ...catchDetails, levelCaught: 6, level: 18 };
    const { encounter: result, mon } = catchEncounter({
      encounter: makeEncounter(),
      party: [],
      monId: "mon-1",
      details,
    });

    expect(result.level).toBe(6);
    expect(mon.levelCaught).toBe(6);
    expect(mon.level).toBe(18);
  });

  test("placement 'box' boxes the catch with a null party slot even though the party has room", () => {
    const details: CatchDetails = { ...catchDetails, placement: "box" };
    const { mon } = catchEncounter({
      encounter: makeEncounter(),
      party: [],
      monId: "mon-1",
      details,
    });

    expect(mon.status).toBe("box");
    expect(mon.partySlot).toBeNull();
  });

  test("placement 'party' takes the lowest free slot, reusing a gap left by a boxed mon", () => {
    const staleBoxedMon = makeMon({ id: "boxed", status: "box", partySlot: 1 });
    const party = [staleBoxedMon, ...partyInSlots([0, 2])];
    const details: CatchDetails = { ...catchDetails, placement: "party" };

    const { mon } = catchEncounter({
      encounter: makeEncounter(),
      party,
      monId: "mon-new",
      details,
    });

    expect(mon.status).toBe("party");
    expect(mon.partySlot).toBe(1);
  });

  test("placement 'party' still overflows to the box when the party is full", () => {
    const details: CatchDetails = { ...catchDetails, placement: "party" };
    const { mon } = catchEncounter({
      encounter: makeEncounter(),
      party: partyInSlots([0, 1, 2, 3, 4, 5]),
      monId: "mon-7",
      details,
    });

    expect(mon.status).toBe("box");
    expect(mon.partySlot).toBeNull();
  });

  test("carries shiny from the catch details onto the new mon", () => {
    const { mon } = catchEncounter({
      encounter: makeEncounter(),
      party: [],
      monId: "mon-1",
      details: { ...catchDetails, shiny: true },
    });

    expect(mon.shiny).toBe(true);
  });

  test("throws when the current level is below the level caught", () => {
    const encounter = makeEncounter();
    const details: CatchDetails = { ...catchDetails, levelCaught: 20, level: 19 };
    let error: unknown;
    try {
      catchEncounter({ encounter, party: [], monId: "mon-1", details });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("20");
    expect((error as Error).message).toContain("19");
  });
});

describe("missEncounter / skipEncounter", () => {
  const cases: {
    label: string;
    transition: (encounter: Encounter) => Encounter;
    expected: Encounter["status"];
  }[] = [
    { label: "missEncounter", transition: missEncounter, expected: "missed" },
    { label: "skipEncounter", transition: skipEncounter, expected: "skipped" },
  ];

  test.each(cases)("$label marks an open encounter as $expected", ({ transition, expected }) => {
    const result = transition(makeEncounter());
    expect(result.status).toBe(expected);
  });
});

describe("moveMonToBox", () => {
  test("boxes a party mon and clears its slot", () => {
    const mon = makeMon({ status: "party", partySlot: 2 });
    const result = moveMonToBox(mon);
    expect(result.status).toBe("box");
    expect(result.partySlot).toBeNull();
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
    // The party is full at 6, but one of those 6 is the mon being moved, so excluding it should
    // free its own slot rather than throwing.
    const mon = makeMon({ id: "already-in-party", status: "party", partySlot: 2 });
    const party = [...partyInSlots([0, 1, 3, 4, 5]), mon];

    const result = moveMonToParty({ mon, party });

    expect(result.status).toBe("party");
    expect(result.partySlot).toBe(2);
  });
});

describe("killMon", () => {
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

  test("throws on a mon that is already dead — there is no revive", () => {
    const mon = makeMon({ status: "dead", partySlot: null });
    expect(() => killMon({ mon, deathId: "death-3", details: killDetails })).toThrow(
      /already dead/,
    );
  });
});

describe("amendMon", () => {
  const amendments: MonAmendments = {
    nickname: "Sprout",
    gender: "male",
    level: 20,
    nature: "adamant",
    ability: "overgrow",
    heldItem: "oran-berry",
    moves: ["vine-whip", "growth"],
    shiny: false,
  };

  test("changes nickname, gender, level, nature, ability, heldItem and moves", () => {
    const mon = makeMon({
      nickname: null,
      gender: "female",
      level: 10,
      levelCaught: 10,
      nature: null,
      ability: null,
      heldItem: null,
      moves: ["tackle"],
    });

    const result = amendMon({ mon, amendments });

    expect(result.nickname).toBe("Sprout");
    expect(result.gender).toBe("male");
    expect(result.level).toBe(20);
    expect(result.nature).toBe("adamant");
    expect(result.ability).toBe("overgrow");
    expect(result.heldItem).toBe("oran-berry");
    expect(result.moves).toEqual(["vine-whip", "growth"]);
  });

  test("preserves everything an amendment does not touch", () => {
    const mon = makeMon({
      speciesId: "bayleef",
      speciesIdCaught: "chikorita",
      levelCaught: 10,
      moves: ["tackle", "razor-leaf"],
      status: "box",
      partySlot: null,
      boxOrder: 3,
      caughtRouteId: "route-9",
      encounterId: "encounter-77",
      runId: "run-9",
      id: "mon-77",
    });

    const result = amendMon({
      mon,
      amendments: { ...amendments, level: 15, moves: mon.moves },
    });

    expect(result.speciesId).toBe("bayleef");
    expect(result.speciesIdCaught).toBe("chikorita");
    expect(result.levelCaught).toBe(10);
    expect(result.status).toBe("box");
    expect(result.partySlot).toBeNull();
    expect(result.boxOrder).toBe(3);
    expect(result.caughtRouteId).toBe("route-9");
    expect(result.encounterId).toBe("encounter-77");
    expect(result.runId).toBe("run-9");
    expect(result.id).toBe("mon-77");
  });

  test("replaces the mon's moves with the amendment's list", () => {
    const mon = makeMon({ moves: ["tackle"] });
    const result = amendMon({ mon, amendments: { ...amendments, moves: ["surf", "dig"] } });
    expect(result.moves).toEqual(["surf", "dig"]);
  });

  test("preserves the mon's moves when the amendment carries the same list", () => {
    const mon = makeMon({ moves: ["tackle", "growl"] });
    const result = amendMon({ mon, amendments: { ...amendments, moves: ["tackle", "growl"] } });
    expect(result.moves).toEqual(["tackle", "growl"]);
  });

  test("throws when the amendment carries more than 4 moves", () => {
    const mon = makeMon();
    expect(() =>
      amendMon({
        mon,
        amendments: {
          ...amendments,
          moves: ["tackle", "growl", "vine-whip", "razor-leaf", "synthesis"],
        },
      }),
    ).toThrow(/4 moves/);
  });

  test("amending a dead mon works and leaves it dead", () => {
    const mon = makeMon({ status: "dead", partySlot: null, levelCaught: 10 });
    const result = amendMon({ mon, amendments: { ...amendments, level: 15 } });
    expect(result.status).toBe("dead");
    expect(result.nickname).toBe("Sprout");
  });

  test("amending a party mon keeps its exact partySlot, gap included", () => {
    const mon = makeMon({ status: "party", partySlot: 4, levelCaught: 10 });
    const result = amendMon({ mon, amendments: { ...amendments, level: 15 } });
    expect(result.status).toBe("party");
    expect(result.partySlot).toBe(4);
  });

  test("can mark a mon shiny, or clear it, independent of every other amendment", () => {
    const mon = makeMon({ shiny: false });
    expect(amendMon({ mon, amendments: { ...amendments, shiny: true } }).shiny).toBe(true);

    const shinyMon = makeMon({ shiny: true });
    expect(amendMon({ mon: shinyMon, amendments: { ...amendments, shiny: false } }).shiny).toBe(
      false,
    );
  });

  test("throws when the amended level is below levelCaught", () => {
    const mon = makeMon({ levelCaught: 18 });
    let error: unknown;
    try {
      amendMon({ mon, amendments: { ...amendments, level: 6 } });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("18");
    expect((error as Error).message).toContain("6");
  });
});

describe("evolveMon", () => {
  it("changes the current species and nothing else", () => {
    const mon = makeMon({ speciesId: "bellsprout", speciesIdCaught: "bellsprout" });
    const evolved = evolveMon({ mon, speciesId: "weepinbell" });
    expect(evolved).toEqual({ ...mon, speciesId: "weepinbell" });
  });

  it("keeps the species it was caught as after a second evolve", () => {
    const mon = makeMon({ speciesId: "weepinbell", speciesIdCaught: "bellsprout" });
    expect(evolveMon({ mon, speciesId: "victreebel" }).speciesIdCaught).toBe("bellsprout");
  });

  it("rejects an empty species", () => {
    expect(() => evolveMon({ mon: makeMon(), speciesId: " " })).toThrow();
  });
});

describe("clearFight", () => {
  test("clears a pending fight and stamps clearedAt", () => {
    const fight = makeFight();
    const result = clearFight({ fight, clearedAt: "2026-09-17T02:00:00.000Z" });
    expect(result.status).toBe("cleared");
    expect(result.clearedAt).toBe("2026-09-17T02:00:00.000Z");
  });

  test("throws when the fight is already cleared", () => {
    const fight = makeFight({ status: "cleared", clearedAt: "2026-09-16T00:00:00.000Z" });
    expect(() => clearFight({ fight, clearedAt: "2026-09-17T02:00:00.000Z" })).toThrow(
      /not 'pending'/,
    );
  });
});

describe("planEncounterReset", () => {
  test("missed: plan removes only the encounter", () => {
    const encounter = makeEncounter({ status: "missed" });
    const plan = planEncounterReset({ encounter, mon: null, deaths: [] });
    expect(plan).toEqual({ encounterId: encounter.id, monId: null, deathIds: [] });
  });

  test("skipped: plan removes only the encounter", () => {
    const encounter = makeEncounter({ status: "skipped" });
    const plan = planEncounterReset({ encounter, mon: null, deaths: [] });
    expect(plan).toEqual({ encounterId: encounter.id, monId: null, deathIds: [] });
  });

  test("caught and alive: plan removes the encounter and the mon, no deaths", () => {
    const encounter = makeEncounter({ status: "caught", monId: "mon-1" });
    const mon = makeMon({ id: "mon-1", encounterId: encounter.id, status: "party" });
    const plan = planEncounterReset({ encounter, mon, deaths: [] });
    expect(plan).toEqual({ encounterId: encounter.id, monId: "mon-1", deathIds: [] });
  });

  test("caught and dead with one death: plan removes the encounter, mon and death", () => {
    const encounter = makeEncounter({ status: "caught", monId: "mon-1" });
    const mon = makeMon({ id: "mon-1", encounterId: encounter.id, status: "dead" });
    const death = makeDeath({ id: "death-1", monId: "mon-1" });
    const plan = planEncounterReset({ encounter, mon, deaths: [death] });
    expect(plan).toEqual({ encounterId: encounter.id, monId: "mon-1", deathIds: ["death-1"] });
  });

  test("throws for an open encounter", () => {
    const encounter = makeEncounter({ status: "open" });
    expect(() => planEncounterReset({ encounter, mon: null, deaths: [] })).toThrow(
      /has not been logged/,
    );
  });

  test("throws when the encounter has a monId but no mon was passed", () => {
    const encounter = makeEncounter({ status: "caught", monId: "mon-1" });
    expect(() => planEncounterReset({ encounter, mon: null, deaths: [] })).toThrow(/do not match/);
  });

  test("throws when a mon is passed for an encounter with no monId", () => {
    const encounter = makeEncounter({ status: "missed", monId: null });
    const mon = makeMon({ id: "mon-1", encounterId: encounter.id });
    expect(() => planEncounterReset({ encounter, mon, deaths: [] })).toThrow(/do not match/);
  });

  test("throws when the mon's encounterId is not the encounter's id", () => {
    const encounter = makeEncounter({ id: "encounter-1", status: "caught", monId: "mon-1" });
    const mon = makeMon({ id: "mon-1", encounterId: "encounter-other" });
    expect(() => planEncounterReset({ encounter, mon, deaths: [] })).toThrow(
      /does not belong to encounter/,
    );
  });

  test("throws when a death's monId is not the mon's id", () => {
    const encounter = makeEncounter({ status: "caught", monId: "mon-1" });
    const mon = makeMon({ id: "mon-1", encounterId: encounter.id, status: "dead" });
    const death = makeDeath({ id: "death-1", monId: "mon-other" });
    expect(() => planEncounterReset({ encounter, mon, deaths: [death] })).toThrow(
      /does not belong to its mon/,
    );
  });

  test("throws when deaths are given but mon is null", () => {
    const encounter = makeEncounter({ status: "missed", monId: null });
    const death = makeDeath({ id: "death-1", monId: "mon-1" });
    expect(() => planEncounterReset({ encounter, mon: null, deaths: [death] })).toThrow(
      /does not belong to its mon/,
    );
  });
});

describe("guard: encounter must be open", () => {
  const cases: [string, (encounter: Encounter) => unknown][] = [
    [
      "catchEncounter",
      (encounter) =>
        catchEncounter({ encounter, party: [], monId: "mon-1", details: catchDetails }),
    ],
    ["missEncounter", (encounter) => missEncounter(encounter)],
    ["skipEncounter", (encounter) => skipEncounter(encounter)],
  ];

  test.each(cases)("%s throws when the encounter is not open", (_label, run) => {
    const encounter = makeEncounter({ status: "caught" });
    expect(() => run(encounter)).toThrow(/not 'open'/);
  });
});

describe("guard: mon must be alive", () => {
  const cases: [string, (mon: Mon) => unknown][] = [
    ["moveMonToBox", (mon) => moveMonToBox(mon)],
    ["moveMonToParty", (mon) => moveMonToParty({ mon, party: [] })],
  ];

  test.each(cases)("%s throws on a dead mon", (_label, run) => {
    const mon = makeMon({ status: "dead", partySlot: null });
    expect(() => run(mon)).toThrow(/already dead/);
  });
});

describe("input immutability", () => {
  // Every transition returns a new object rather than mutating its input. A mutating transition
  // would leave the caller's existing reference unchanged, so a shallow equality check in React
  // would never see the update and the component would not re-render.
  const catchEncounterInput = makeEncounter();
  const missEncounterInput = makeEncounter();
  const skipEncounterInput = makeEncounter();
  const moveMonToBoxInput = makeMon({ status: "party", partySlot: 2 });
  const moveMonToPartyInput = makeMon({ id: "boxed-mon", status: "box", partySlot: null });
  const killMonInput = makeMon({ status: "party", partySlot: 1 });
  const amendMonInput = makeMon({ levelCaught: 5 });
  const clearFightInput = makeFight();

  const cases: { label: string; input: object; run: () => void }[] = [
    {
      label: "catchEncounter",
      input: catchEncounterInput,
      run: () => {
        catchEncounter({
          encounter: catchEncounterInput,
          party: [],
          monId: "mon-1",
          details: catchDetails,
        });
      },
    },
    {
      label: "missEncounter",
      input: missEncounterInput,
      run: () => {
        missEncounter(missEncounterInput);
      },
    },
    {
      label: "skipEncounter",
      input: skipEncounterInput,
      run: () => {
        skipEncounter(skipEncounterInput);
      },
    },
    {
      label: "moveMonToBox",
      input: moveMonToBoxInput,
      run: () => {
        moveMonToBox(moveMonToBoxInput);
      },
    },
    {
      label: "moveMonToParty",
      input: moveMonToPartyInput,
      run: () => {
        moveMonToParty({ mon: moveMonToPartyInput, party: partyInSlots([0, 1, 2, 3]) });
      },
    },
    {
      label: "killMon",
      input: killMonInput,
      run: () => {
        killMon({ mon: killMonInput, deathId: "death-1", details: killDetails });
      },
    },
    {
      label: "amendMon",
      input: amendMonInput,
      run: () => {
        amendMon({
          mon: amendMonInput,
          amendments: {
            nickname: "Sprout",
            gender: "male",
            level: 20,
            nature: "adamant",
            ability: "overgrow",
            heldItem: "oran-berry",
            moves: ["tackle"],
            shiny: false,
          },
        });
      },
    },
    {
      label: "clearFight",
      input: clearFightInput,
      run: () => {
        clearFight({ fight: clearFightInput, clearedAt: "2026-09-17T02:00:00.000Z" });
      },
    },
  ];

  test.each(cases)("$label does not mutate its input", ({ input, run }) => {
    const snapshot = { ...input };
    run();
    expect(input).toEqual(snapshot);
  });
});
