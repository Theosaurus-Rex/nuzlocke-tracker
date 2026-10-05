import type { Death, Draft, Encounter, Fight, Mon, Route, Run, Rules } from "@/domain/types";

const PLACEHOLDER_TIME = "2000-01-01T00:00:00.000Z";

const stamps = {
  createdAt: PLACEHOLDER_TIME,
  updatedAt: PLACEHOLDER_TIME,
};

export function makeRules(overrides: Partial<Rules> = {}): Rules {
  return {
    dupesClause: false,
    shinyClause: false,
    nicknamesRequired: false,
    levelCaps: false,
    setMode: false,
    hardcore: false,
    randomiser: {
      enabled: false,
      wildEncounters: false,
      trainers: false,
      starters: false,
      abilities: false,
      items: false,
      moves: false,
      evolutions: false,
    },
    customClause: null,
    ...overrides,
  };
}

export function makeRunDraft(overrides: Partial<Draft<Run>> = {}): Draft<Run> {
  return {
    name: "Test Run",
    game: "heartgold",
    status: "active",
    rules: makeRules(),
    finishedAt: null,
    ...overrides,
  };
}

export function makeRouteDraft(runId: string, overrides: Partial<Draft<Route>> = {}): Draft<Route> {
  return {
    runId,
    name: "Test Route",
    order: 0,
    isCustom: false,
    gameRouteId: null,
    ...overrides,
  };
}

export function makeEncounterDraft(
  runId: string,
  routeId: string,
  overrides: Partial<Draft<Encounter>> = {},
): Draft<Encounter> {
  return {
    runId,
    routeId,
    status: "open",
    speciesId: null,
    level: null,
    monId: null,
    notes: null,
    ...overrides,
  };
}

export function makeMonDraft(runId: string, overrides: Partial<Draft<Mon>> = {}): Draft<Mon> {
  return {
    runId,
    encounterId: null,
    speciesId: "test-species",
    speciesIdCaught: "test-species",
    nickname: null,
    gender: null,
    level: 1,
    levelCaught: 1,
    nature: null,
    ability: null,
    heldItem: null,
    moves: [],
    status: "party",
    partySlot: 0,
    boxOrder: null,
    caughtRouteId: null,
    shiny: false,
    ...overrides,
  };
}

export function makeDeathDraft(
  runId: string,
  monId: string,
  overrides: Partial<Draft<Death>> = {},
): Draft<Death> {
  return {
    runId,
    monId,
    level: 1,
    routeId: null,
    cause: { type: "other", detail: "test-detail" },
    diedAt: PLACEHOLDER_TIME,
    notes: null,
    ...overrides,
  };
}

export function makeFightDraft(runId: string, overrides: Partial<Draft<Fight>> = {}): Draft<Fight> {
  return {
    runId,
    gameFightId: null,
    name: "Test Fight",
    kind: "custom",
    order: 0,
    grantsBadge: false,
    levelCap: null,
    status: "pending",
    clearedAt: null,
    ...overrides,
  };
}

export function makeRun(overrides: Partial<Run> = {}): Run {
  return { id: "test-run-id", ...stamps, ...makeRunDraft(), ...overrides };
}

export function makeRoute(overrides: Partial<Route> = {}): Route {
  return { id: "test-route-id", ...stamps, ...makeRouteDraft("test-run-id"), ...overrides };
}

export function makeEncounter(overrides: Partial<Encounter> = {}): Encounter {
  return {
    id: "test-encounter-id",
    ...stamps,
    ...makeEncounterDraft("test-run-id", "test-route-id"),
    ...overrides,
  };
}

export function makeMon(overrides: Partial<Mon> = {}): Mon {
  return { id: "test-mon-id", ...stamps, ...makeMonDraft("test-run-id"), ...overrides };
}

export function makeDeath(overrides: Partial<Death> = {}): Death {
  return {
    id: "test-death-id",
    ...stamps,
    ...makeDeathDraft("test-run-id", "test-mon-id"),
    ...overrides,
  };
}

export function makeFight(overrides: Partial<Fight> = {}): Fight {
  return { id: "test-fight-id", ...stamps, ...makeFightDraft("test-run-id"), ...overrides };
}
