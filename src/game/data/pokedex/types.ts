/**
 * Shared types for the pokedex data modules: the type union, damage class, base stats, and the
 * two "history" shapes used for per-generation resolution (see `pokedexFor` in
 * src/game/pokedex.ts). How resolution works is in docs/notes/game-data.md.
 */

/**
 * The 18 elemental types, plus "unknown" (PokeAPI's "???" placeholder, used only for Curse).
 * Fairy was added in Gen 6, so resolve through `pokedexFor`, not directly, to respect an
 * earlier generation.
 */
export type Type =
  | "normal"
  | "fire"
  | "water"
  | "electric"
  | "grass"
  | "ice"
  | "fighting"
  | "poison"
  | "ground"
  | "flying"
  | "psychic"
  | "bug"
  | "rock"
  | "ghost"
  | "dragon"
  | "dark"
  | "steel"
  | "fairy"
  | "unknown";

/** Gen 4 introduced a per-move physical/special/status split, replacing Gen 1-3's per-type rule. */
export type DamageClass = "physical" | "special" | "status";

export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

/** One historical typing, valid through (and including) `throughGeneration`. */
export interface PastTypes {
  throughGeneration: number;
  types: Type[];
}

/**
 * One historical move-stat snapshot, valid through `throughGeneration`. A null field means
 * not specified by this entry, so resolution keeps walking. See docs/notes/game-data.md.
 */
export interface PastMoveValue {
  throughGeneration: number;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  type: Type | null;
}
