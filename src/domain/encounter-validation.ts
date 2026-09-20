/**
 * Form validation for logging a catch. Pure, so the rules are testable without a DOM.
 * `transitions.ts` enforces invariants, not user input; this is where the form's own rules live.
 */

import type { CatchDetails, MonAmendments } from "./transitions";
import type { EncounterStatus, Rules } from "./types";

export type EncounterField = "speciesId" | "levelCaught" | "level" | "nickname";

/** What an encounter is being resolved to. An encounter is only `open` before it is logged. */
export type EncounterOutcome = Exclude<EncounterStatus, "open">;

function isValidLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 1 && level <= 100;
}

function validateLevelAgainstCaught(level: number, levelCaught: number): string | undefined {
  if (!isValidLevel(level)) {
    return "Enter a level from 1 to 100.";
  }

  if (isValidLevel(levelCaught) && level < levelCaught) {
    return "Current level cannot be below the level it was caught at.";
  }

  return undefined;
}

function validateNickname(nickname: string | null, rules: Rules): string | undefined {
  return rules.nicknamesRequired && (nickname === null || nickname.trim() === "")
    ? "This run requires a nickname."
    : undefined;
}

export function validateCatch(input: {
  details: CatchDetails;
  rules: Rules;
}): Partial<Record<EncounterField, string>> {
  const { details, rules } = input;
  const errors: Partial<Record<EncounterField, string>> = {};

  if (details.speciesId.trim() === "") {
    errors.speciesId = "Choose a species from the list.";
  }

  if (!isValidLevel(details.levelCaught)) {
    errors.levelCaught = "Enter a level from 1 to 100.";
  }

  const levelError = validateLevelAgainstCaught(details.level, details.levelCaught);
  if (levelError !== undefined) {
    errors.level = levelError;
  }

  const nicknameError = validateNickname(details.nickname, rules);
  if (nicknameError !== undefined) {
    errors.nickname = nicknameError;
  }

  return errors;
}

export function validateAmendment(input: {
  amendments: MonAmendments;
  levelCaught: number;
  rules: Rules;
}): Partial<Record<EncounterField, string>> {
  const { amendments, levelCaught, rules } = input;
  const errors: Partial<Record<EncounterField, string>> = {};

  const levelError = validateLevelAgainstCaught(amendments.level, levelCaught);
  if (levelError !== undefined) {
    errors.level = levelError;
  }

  const nicknameError = validateNickname(amendments.nickname, rules);
  if (nicknameError !== undefined) {
    errors.nickname = nicknameError;
  }

  return errors;
}

/**
 * A missed encounter names what was met. The game shows a species before it flees or faints, so
 * a blank one is information lost rather than a state worth recording.
 *
 * Skipping is different and stays unvalidated: passing on a route can mean never encountering
 * anything there at all.
 */
export function validateMiss(input: {
  speciesId: string;
}): Partial<Record<EncounterField, string>> {
  return input.speciesId.trim() === "" ? { speciesId: "Choose a species from the list." } : {};
}

export function validateEncounter(input: {
  outcome: EncounterOutcome;
  details: CatchDetails;
  rules: Rules;
}): Partial<Record<EncounterField, string>> {
  if (input.outcome === "caught") {
    return validateCatch({ details: input.details, rules: input.rules });
  }

  if (input.outcome === "missed") {
    return validateMiss({ speciesId: input.details.speciesId });
  }

  return {};
}
