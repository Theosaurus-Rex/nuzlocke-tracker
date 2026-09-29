/**
 * Form rules and cause building for logging a death. Pure, so they are testable without a DOM.
 */

import type { Cause, StatusCause } from "./types";

export type DeathField = "speciesId" | "level" | "detail";

export type CauseType = Cause["type"];

export const CAUSE_TYPES: readonly CauseType[] = ["trainer", "wild", "status", "other"];

export const STATUS_CAUSES: readonly StatusCause[] = [
  "poison",
  "burn",
  "sandstorm",
  "hail",
  "recoil",
  "perish-song",
  "confusion",
];

export interface DeathFormValues {
  type: CauseType;
  speciesId: string;
  level: number;
  move: string;
  trainerName: string;
  status: StatusCause;
  detail: string;
}

export function validateDeath(values: DeathFormValues): Partial<Record<DeathField, string>> {
  const errors: Partial<Record<DeathField, string>> = {};

  if (values.type === "trainer" || values.type === "wild") {
    if (values.speciesId.trim() === "") {
      errors.speciesId = "Choose a species from the list.";
    }
    if (!Number.isInteger(values.level) || values.level < 1 || values.level > 100) {
      errors.level = "Enter a level from 1 to 100.";
    }
  }

  if (values.type === "other" && values.detail.trim() === "") {
    errors.detail = "Say what happened.";
  }

  return errors;
}

function blankToNull(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === "" ? null : trimmed;
}

export function buildCause(values: DeathFormValues): Cause {
  switch (values.type) {
    case "trainer": {
      const trainerName = values.trainerName.trim();
      return {
        type: "trainer",
        fightId: null,
        trainerName: trainerName === "" ? null : trainerName,
        species: values.speciesId,
        level: values.level,
        move: blankToNull(values.move),
      };
    }
    case "wild":
      return {
        type: "wild",
        species: values.speciesId,
        level: values.level,
        move: blankToNull(values.move),
      };
    case "status":
      return { type: "status", status: values.status };
    case "other":
      return { type: "other", detail: values.detail.trim() };
  }
}
