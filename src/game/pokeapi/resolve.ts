import type { Type } from "@/game/types";

import type { IndexEntry, Move, Species } from "./model";

export interface ResolvedMoveStats {
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  type: Type;
}

export function typesIn(species: Species, generation: number): Type[] {
  return species.pastTypes.find((p) => p.throughGeneration >= generation)?.types ?? species.types;
}

function firstNonNull<T>(values: readonly (T | null)[]): T | undefined {
  return values.find((v): v is T => v !== null);
}

// A null field on a history entry means that entry did not change it, so keep walking.
export function moveStatsIn(move: Move, generation: number): ResolvedMoveStats {
  const qualifying = move.pastValues.filter((p) => p.throughGeneration >= generation);
  return {
    power: firstNonNull(qualifying.map((p) => p.power)) ?? move.power,
    accuracy: firstNonNull(qualifying.map((p) => p.accuracy)) ?? move.accuracy,
    pp: firstNonNull(qualifying.map((p) => p.pp)) ?? move.pp,
    type: firstNonNull(qualifying.map((p) => p.type)) ?? move.type,
  };
}

function toNameForm(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, "-");
}

export function searchIndex(index: readonly IndexEntry[], query: string): IndexEntry[] {
  const q = toNameForm(query);
  return index.filter((entry) => entry.name.startsWith(q));
}

export function findByName(index: readonly IndexEntry[], text: string): IndexEntry | undefined {
  const name = toNameForm(text);
  return index.find((entry) => entry.name === name);
}

function titleCase(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const speciesDisplayName = titleCase;
export const moveDisplayName = titleCase;
