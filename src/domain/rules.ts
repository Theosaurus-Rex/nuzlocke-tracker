/**
 * Default rules a new run starts from, plus the field lists that keep the import validator
 * and the new-run form in step with the `Rules` type.
 */

import type { ClauseField, RandomiserField, RandomiserSubField, Rules, Run } from "./types";

/** Resolves to `never` when a list below covers its field union. Adding a field to `Rules`
 * without listing it here fails the build instead of silently skipping validation and UI. */
type AssertExhaustive<T extends never> = T;

export const CLAUSE_FIELDS = [
  "dupesClause",
  "shinyClause",
  "giftClause",
  "noGifts",
  "nicknamesRequired",
  "levelCaps",
  "setMode",
  "hardcore",
] as const satisfies readonly ClauseField[];

/** Added after the first backups were written, so a missing value reads as off. */
export const DEFAULTED_CLAUSE_FIELDS = [
  "giftClause",
  "noGifts",
] as const satisfies readonly ClauseField[];

export function withDefaultedClauses(rules: Rules): Rules {
  const filled: Rules = { ...rules };
  for (const field of DEFAULTED_CLAUSE_FIELDS) {
    filled[field] = rules[field] === true;
  }
  return filled;
}

export function withRuleDefaults(run: Run): Run {
  return { ...run, rules: withDefaultedClauses(run.rules) };
}

const EXCLUSIVE_CLAUSES: Partial<Record<ClauseField, ClauseField>> = {
  giftClause: "noGifts",
  noGifts: "giftClause",
};

/** Flips one clause. Turning on Gift clause turns off No gifts, and the other way round. */
export function toggleClause(rules: Rules, key: ClauseField): Rules {
  const next: Rules = { ...rules, [key]: !rules[key] };
  const rival = EXCLUSIVE_CLAUSES[key];
  if (next[key] && rival !== undefined) {
    next[rival] = false;
  }
  return next;
}

export type UnlistedClauseField = AssertExhaustive<
  Exclude<ClauseField, (typeof CLAUSE_FIELDS)[number]>
>;

export const RANDOMISER_SUB_FIELDS = [
  "wildEncounters",
  "trainers",
  "starters",
  "abilities",
  "items",
  "moves",
  "evolutions",
] as const satisfies readonly RandomiserSubField[];

export type UnlistedRandomiserSubField = AssertExhaustive<
  Exclude<RandomiserSubField, (typeof RANDOMISER_SUB_FIELDS)[number]>
>;

/** Master toggle first, then the sub-toggles. */
export const RANDOMISER_FIELDS = [
  "enabled",
  ...RANDOMISER_SUB_FIELDS,
] as const satisfies readonly RandomiserField[];

/** Every randomiser toggle off. The new-run form resets to this when the master toggle is
 * cleared, so a sub-toggle can never be stored as on while the run itself is not a randomiser. */
export const RANDOMISER_OFF: Rules["randomiser"] = {
  enabled: false,
  wildEncounters: false,
  trainers: false,
  starters: false,
  abilities: false,
  items: false,
  moves: false,
  evolutions: false,
};

/**
 * A standard Nuzlocke: dupes, species and shiny clauses on, level caps on, everything else off.
 * The new-run form seeds itself from this, so these are a starting point rather than policy.
 */
export const DEFAULT_RULES: Rules = {
  dupesClause: true,
  shinyClause: true,
  giftClause: false,
  noGifts: false,
  nicknamesRequired: false,
  levelCaps: true,
  setMode: false,
  hardcore: false,
  randomiser: RANDOMISER_OFF,
  customClause: null,
};
