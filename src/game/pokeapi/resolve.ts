import { itemDisplayNames, moveDisplayNames, speciesDisplayNames } from "@/game/data/display-names";
import type { Type } from "@/game/types";

import { REGIONS, regionalForm } from "./forms";
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

type DisplayName = (id: string) => string;

export function toNameForm(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/♀/g, "f")
    .replace(/♂/g, "m")
    .replace(/['’.:]/g, "")
    .replace(/[\s-]+/g, "-");
}

const displayForms = new WeakMap<readonly IndexEntry[], WeakMap<DisplayName, string[]>>();

function displayFormsOf(index: readonly IndexEntry[], displayName: DisplayName): string[] {
  let byFn = displayForms.get(index);
  if (byFn === undefined) {
    byFn = new WeakMap();
    displayForms.set(index, byFn);
  }
  let forms = byFn.get(displayName);
  if (forms === undefined) {
    forms = index.map((entry) => toNameForm(displayName(entry.name)));
    byFn.set(displayName, forms);
  }
  return forms;
}

function matchTier(candidate: string, q: string, wordStart: string): number {
  if (candidate === q) return 0;
  if (candidate.startsWith(q)) return 1;
  if (candidate.includes(wordStart)) return 2;
  return candidate.includes(q) ? 3 : 4;
}

// Best tier first: exact, name prefix, word start, substring. Ties keep index order.
export function searchIndex(
  index: readonly IndexEntry[],
  query: string,
  displayName: DisplayName,
): IndexEntry[] {
  const q = toNameForm(query);
  const wordStart = `-${q}`;
  const forms = displayFormsOf(index, displayName);
  const tiers: IndexEntry[][] = [[], [], [], []];
  for (let i = 0; i < index.length; i++) {
    const entry = index[i]!;
    const form = forms[i];
    const tier = Math.min(
      matchTier(entry.name, q, wordStart),
      form === undefined ? 4 : matchTier(form, q, wordStart),
    );
    tiers[tier]?.push(entry);
  }
  return tiers.flat();
}

export function findByName(
  index: readonly IndexEntry[],
  text: string,
  displayName: DisplayName,
): IndexEntry | undefined {
  const name = toNameForm(text);
  const forms = displayFormsOf(index, displayName);
  return index.find((entry, i) => entry.name === name || forms[i] === name);
}

function titleCase(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function speciesDisplayName(id: string): string {
  const explicit = speciesDisplayNames[id];
  if (explicit !== undefined) return explicit;
  const form = regionalForm(id);
  if (form !== null) return `${REGIONS[form.region]} ${speciesDisplayName(form.base)}`;
  return titleCase(id);
}

export function abilityDisplayName(id: string): string {
  return titleCase(id);
}

export function itemDisplayName(id: string): string {
  return itemDisplayNames[id] ?? titleCase(id);
}

export function moveDisplayName(id: string): string {
  return moveDisplayNames[id] ?? titleCase(id);
}
