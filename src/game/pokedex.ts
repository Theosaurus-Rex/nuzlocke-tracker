/**
 * Lookup adapter over the pokedex data. The app imports this, never the data modules
 * directly. Only `pokedexFor` is generation-aware. Search and lookup above it are not,
 * per CLAUDE.md "Game data".
 */

import { abilities, type AbilityDef } from "@/game/data/pokedex/abilities";
import { items, type ItemDef } from "@/game/data/pokedex/items";
import { moves, type MoveDef } from "@/game/data/pokedex/moves";
import { natures, type NatureDef } from "@/game/data/pokedex/natures";
import { species, type SpeciesDef } from "@/game/data/pokedex/species";
import type { Type } from "@/game/data/pokedex/types";

const speciesById = new Map<number, SpeciesDef>(species.map((s) => [s.id, s]));
const speciesByName = new Map<string, SpeciesDef>(species.map((s) => [s.name, s]));
const moveById = new Map<number, MoveDef>(moves.map((m) => [m.id, m]));
const moveByName = new Map<string, MoveDef>(moves.map((m) => [m.name, m]));
const abilityById = new Map<number, AbilityDef>(abilities.map((a) => [a.id, a]));
const abilityByName = new Map<string, AbilityDef>(abilities.map((a) => [a.name, a]));
const itemByName = new Map<string, ItemDef>(items.map((i) => [i.name, i]));

export function getSpecies(id: number): SpeciesDef | undefined {
  return speciesById.get(id);
}

export function getSpeciesByName(name: string): SpeciesDef | undefined {
  return speciesByName.get(name);
}

/** Works on a name absent from the pokedex too: a romhack or randomiser species is a
 * supported case, not an error. */
export function speciesDisplayName(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Query names use spaces, but stored names are hyphenated ("bug-bite"), so this converts
 * before matching. */
function toNameForm(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, "-");
}

/**
 * Case-insensitive prefix match on species name, national dex order, across every generation.
 * PokéAPI names canonical multi-form species with a form suffix (id 778 is
 * "mimikyu-disguised"), so rendering `name` raw can show one even though ids and search are fine.
 */
export function searchSpecies(query: string): SpeciesDef[] {
  const q = toNameForm(query);
  return species.filter((s) => s.name.toLowerCase().startsWith(q));
}

export function getMove(id: number): MoveDef | undefined {
  return moveById.get(id);
}

export function getMoveByName(name: string): MoveDef | undefined {
  return moveByName.get(name);
}

/** Works on a name absent from the pokedex too: a romhack or randomiser move is a supported
 * case, not an error. */
export function moveDisplayName(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Case-insensitive prefix match on move name, across every generation. */
export function searchMoves(query: string): MoveDef[] {
  const q = toNameForm(query);
  return moves.filter((m) => m.name.toLowerCase().startsWith(q));
}

export function getAbility(id: number): AbilityDef | undefined {
  return abilityById.get(id);
}

export function getAbilityByName(name: string): AbilityDef | undefined {
  return abilityByName.get(name);
}

export function getItemByName(name: string): ItemDef | undefined {
  return itemByName.get(name);
}

export interface Evolutions {
  from: SpeciesDef | undefined;
  to: SpeciesDef[];
}

/** The species a given species evolves from and to, resolved from `evolvesFrom`/`evolvesTo`. */
export function getEvolutions(id: number): Evolutions {
  const s = getSpecies(id);
  if (s === undefined) return { from: undefined, to: [] };
  return {
    from: s.evolvesFrom === null ? undefined : getSpecies(s.evolvesFrom),
    to: s.evolvesTo
      .map((toId) => getSpecies(toId))
      .filter((sp): sp is SpeciesDef => sp !== undefined),
  };
}

export function getAllNatures(): NatureDef[] {
  return natures;
}

export function getNature(name: string): NatureDef | undefined {
  return natures.find((n) => n.name === name);
}

export interface ResolvedMoveStats {
  power: number | null;
  accuracy: number | null;
  pp: number;
  type: Type;
}

/** First non-null value among `values`, in order. `undefined` means none of them specified it. */
function firstNonNull<T>(values: readonly (T | null)[]): T | undefined {
  for (const v of values) {
    if (v !== null) return v;
  }
  return undefined;
}

export interface GenerationPokedex {
  generation: number;
  /** Resolves a species' types as they were in `generation`. Falls back to current types if
   * introduced later, which is normal for a randomiser or romhack, not an error. */
  typesOf(id: number): Type[] | undefined;
  /** Resolves a move's stats as they were in `generation`. Same fallback rule as `typesOf`. */
  statsOf(id: number): ResolvedMoveStats | undefined;
}

/** Builds a generation-scoped resolver. Only the values it resolves depend on the generation.
 * Search and lookup above stay unfiltered. */
export function pokedexFor(generation: number): GenerationPokedex {
  return {
    generation,
    typesOf(id) {
      const s = getSpecies(id);
      if (s === undefined) return undefined;
      const match = s.pastTypes.find((p) => p.throughGeneration >= generation);
      return match?.types ?? s.types;
    },
    statsOf(id) {
      const m = getMove(id);
      if (m === undefined) return undefined;
      const qualifying = m.pastValues.filter((p) => p.throughGeneration >= generation);
      return {
        power: firstNonNull(qualifying.map((p) => p.power)) ?? m.power,
        accuracy: firstNonNull(qualifying.map((p) => p.accuracy)) ?? m.accuracy,
        pp: firstNonNull(qualifying.map((p) => p.pp)) ?? m.pp,
        type: firstNonNull(qualifying.map((p) => p.type)) ?? m.type,
      };
    },
  };
}
