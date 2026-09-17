/**
 * Lookup adapter over the pokedex data (src/game/data/pokedex/). The app imports THIS module,
 * never the data modules directly — mirrors the registry pattern in src/game/registry.ts (one
 * seam between "where the data came from" and "how the app reads it").
 *
 * Species/move/ability/item lookup and search are NOT scoped to a generation — see CLAUDE.md
 * "Game data": pickers are free-text across every generation, because a randomiser or romhack
 * can put any species, ability, move or item anywhere. `searchSpecies("garchomp")` finds it
 * regardless of which generation a run is tracking.
 *
 * `pokedexFor(generation)` is the one part of this module that IS generation-aware: it resolves
 * a species' types and a move's power/accuracy/pp/type against a specific generation, because
 * those genuinely differ by game (Clefairy is Normal in a HeartGold run, Fairy from Gen 6 on;
 * Vine Whip is 35 power / 15 pp in Gen 4-5, 45/25 from Gen 6). See ./data/pokedex/types.ts for
 * the resolution rule this implements, including the "introduced after this generation" fallback
 * (not an error — normal for a randomiser/romhack) and the Gen 1-3 per-type damage class note.
 */

import { abilities, type AbilityDef } from "@/game/data/pokedex/abilities";
import { items, type ItemDef } from "@/game/data/pokedex/items";
import { moves, type MoveDef } from "@/game/data/pokedex/moves";
import { natures, type NatureDef } from "@/game/data/pokedex/natures";
import { species, type SpeciesDef } from "@/game/data/pokedex/species";
import type { Type } from "@/game/data/pokedex/types";

const speciesById = new Map<number, SpeciesDef>(species.map((s) => [s.id, s]));
const moveById = new Map<number, MoveDef>(moves.map((m) => [m.id, m]));
const abilityById = new Map<number, AbilityDef>(abilities.map((a) => [a.id, a]));
const abilityByName = new Map<string, AbilityDef>(abilities.map((a) => [a.name, a]));
const itemByName = new Map<string, ItemDef>(items.map((i) => [i.name, i]));

export function getSpecies(id: number): SpeciesDef | undefined {
  return speciesById.get(id);
}

/** Case-insensitive prefix match on species name, in national dex order. Unfiltered by
 * generation — see the module comment. */
/**
 * Prefix search across EVERY generation, deliberately unfiltered by the run's game: a randomiser
 * or romhack can put anything anywhere, so a picker scoped to the tracked game cannot represent
 * what the player actually caught. Only resolved values (types, move stats) depend on the
 * generation — see `pokedexFor`.
 *
 * KNOWN QUIRK, matters when building the picker UI: PokéAPI names the canonical entry of some
 * multi-form species with a form suffix, so id 778 is `"mimikyu-disguised"` and id 386 is
 * `"deoxys-normal"` — roughly 24 species are affected. Prefix search still matches ("mimikyu"
 * finds it) and ids are unaffected, but rendering `name` raw will show those suffixes to the
 * user. A display-name pass is wanted before these reach a dropdown.
 */
export function searchSpecies(query: string): SpeciesDef[] {
  const q = query.toLowerCase();
  return species.filter((s) => s.name.toLowerCase().startsWith(q));
}

export function getMove(id: number): MoveDef | undefined {
  return moveById.get(id);
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

/** First non-null value among `values`, in order — used to walk a field across ascending,
 * still-qualifying history entries. `undefined` means none of them specified it. */
function firstNonNull<T>(values: readonly (T | null)[]): T | undefined {
  for (const v of values) {
    if (v !== null) return v;
  }
  return undefined;
}

export interface GenerationPokedex {
  generation: number;
  /**
   * Resolves a species' types as they were in `generation`. A species introduced AFTER
   * `generation` (e.g. a Gen 9 species turning up in a Gen 4 run) has no earlier history, so
   * this falls back to its current (only ever known) types rather than throwing — normal for a
   * randomiser/romhack, not an error.
   */
  typesOf(id: number): Type[] | undefined;
  /** Resolves a move's power/accuracy/pp/type as they were in `generation`. Same fallback rule
   * as `typesOf` for a move introduced later. */
  statsOf(id: number): ResolvedMoveStats | undefined;
}

/**
 * Builds a generation-scoped resolver. Search and lookup (above) stay unfiltered on purpose —
 * only the resolved VALUES here depend on the generation being tracked.
 */
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
