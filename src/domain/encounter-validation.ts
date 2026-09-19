/**
 * Form validation for logging a catch. Pure, so the rules are testable without a DOM.
 * `transitions.ts` enforces invariants, not user input; this is where the form's own rules live.
 */

import type { CatchDetails } from "./transitions";
import type { Rules } from "./types";

export type EncounterField = "speciesId" | "levelCaught" | "level" | "nickname";

function isValidLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 1 && level <= 100;
}

export function validateCatch(input: {
  details: CatchDetails;
  rules: Rules;
}): Partial<Record<EncounterField, string>> {
  const { details, rules } = input;
  const errors: Partial<Record<EncounterField, string>> = {};

  if (details.speciesId.trim() === "") {
    errors.speciesId = "Choose a species.";
  }

  if (!isValidLevel(details.levelCaught)) {
    errors.levelCaught = "Enter a level from 1 to 100.";
  }

  if (!isValidLevel(details.level)) {
    errors.level = "Enter a level from 1 to 100.";
  } else if (isValidLevel(details.levelCaught) && details.level < details.levelCaught) {
    errors.level = "Current level cannot be below the level it was caught at.";
  }

  if (rules.nicknamesRequired && (details.nickname === null || details.nickname.trim() === "")) {
    errors.nickname = "This run requires a nickname.";
  }

  return errors;
}
