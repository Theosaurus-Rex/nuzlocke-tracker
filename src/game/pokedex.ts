/**
 * Lookup adapter over the pokedex data (src/game/data/pokedex/). The app imports this module,
 * never the data modules directly.
 *
 * Lookup and search are not scoped to a generation, per CLAUDE.md "Game data". `pokedexFor` is
 * the one part that is generation-aware, resolving a species' types and a move's stats against
 * a specific generation. See ./data/pokedex/types.ts for the resolution rule.
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

/**
 * A stored species id turned into something renderable: hyphens become spaces and each word is
 * capitalised. Works on a name absent from the pokedex, since a romhack or randomiser species is
 * a supported case, not an error.
 */
export function speciesDisplayName(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Case-insensitive prefix match on species name, in national dex order, across every
 * generation.
 *
 * PokéAPI names the canonical entry of some multi-form species with a form suffix, so id 778
 * is `"mimikyu-disguised"` and id 386 is `"deoxys-normal"`, for around 24 species. Prefix
 * search and ids are unaffected, but rendering `name` raw will show those suffixes.
 */
/**
 * Names are hyphenated, so "Bug Bite" is stored as "bug-bite". A typed space has to become a
 * hyphen or a search stops matching the moment a name runs to a second word.
 */
function toNameForm(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, "-");
}

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

/**
 * A stored move id turned into something renderable: hyphens become spaces and each word is
 * capitalised. Works on a name absent from the pokedex, since a romhack or randomiser move is a
 * supported case, not an error.
 */
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
  /**
   * Resolves a species' types as they were in `generation`. A species introduced after
   * `generation` has no earlier history, so this falls back to its current types instead of
   * throwing. That is normal for a randomiser or romhack, not an error.
   */
  typesOf(id: number): Type[] | undefined;
  /** Resolves a move's stats as they were in `generation`. Same fallback rule as `typesOf`. */
  statsOf(id: number): ResolvedMoveStats | undefined;
}

/** Builds a generation-scoped resolver. Only the resolved values here depend on the
 * generation; search and lookup above stay unfiltered. */
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
