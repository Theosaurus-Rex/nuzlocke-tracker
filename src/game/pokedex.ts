/**
 * Lookup adapter over the Gen 4 pokedex data (src/game/data/pokedex/). The app imports THIS
 * module, never the data modules directly — mirrors the registry pattern in src/game/registry.ts
 * (one seam between "where the data came from" and "how the app reads it").
 *
 * `getLearnset` is the one function that touches src/game/data/pokedex/learnsets.ts, kept
 * separate here too so a future lazy-import of that module only has to change this file.
 */

import { abilities, type AbilityDef } from "@/game/data/pokedex/abilities";
import { items, type ItemDef } from "@/game/data/pokedex/items";
import { learnsets, type LearnsetEntry } from "@/game/data/pokedex/learnsets";
import { moves, type MoveDef } from "@/game/data/pokedex/moves";
import { natures, type NatureDef } from "@/game/data/pokedex/natures";
import { species, type SpeciesDef } from "@/game/data/pokedex/species";

const speciesById = new Map<number, SpeciesDef>(species.map((s) => [s.id, s]));
const moveById = new Map<number, MoveDef>(moves.map((m) => [m.id, m]));
const abilityById = new Map<number, AbilityDef>(abilities.map((a) => [a.id, a]));
const abilityByName = new Map<string, AbilityDef>(abilities.map((a) => [a.name, a]));
const itemByName = new Map<string, ItemDef>(items.map((i) => [i.name, i]));

export function getSpecies(id: number): SpeciesDef | undefined {
  return speciesById.get(id);
}

/** Case-insensitive prefix match on species name, in national dex order. */
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

export function getLearnset(id: number): LearnsetEntry[] {
  return learnsets[id] ?? [];
}

export function getAllNatures(): NatureDef[] {
  return natures;
}

export function getNature(name: string): NatureDef | undefined {
  return natures.find((n) => n.name === name);
}
