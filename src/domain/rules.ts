/**
 * Default rules a new run starts from.
 *
 * PER-16 (new run creation) writes these onto every run it creates; PER-18 (the next ticket)
 * builds the rules screen that makes them editable and seeds its form from this constant rather
 * than redefining the values. These are a starting point, not hard-coded policy — nobody reading
 * this file should treat a value here as a decision that can't be revisited from the UI.
 *
 * Chosen to match a standard Nuzlocke: dupes, species and shiny clauses on; level caps on;
 * nicknames-required, set mode and hardcore off; every randomiser sub-toggle off (this run isn't
 * assumed to be a randomiser run); `customClause` null.
 */

import type { Rules } from "./types";

export const DEFAULT_RULES: Rules = {
  dupesClause: true,
  speciesClause: true,
  shinyClause: true,
  nicknamesRequired: false,
  levelCaps: true,
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
};
