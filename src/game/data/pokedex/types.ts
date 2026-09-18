/**
 * Shared types for the pokedex data modules: the type union, damage class, base stats, and the
 * two "history" shapes used for per-generation resolution (see `pokedexFor` in
 * src/game/pokedex.ts).
 *
 * `pastTypes` is generation-tagged: an entry means "these types applied through this
 * generation, inclusive". Resolve by taking the first entry, ascending by `throughGeneration`,
 * that is `>= target`, falling back to the current `types` field if none qualifies. Example:
 * Clefairy is Normal through Gen 5 and Fairy from Gen 6, since Fairy did not exist before then.
 *
 * `pastValues` resolves the same way but per field, since PokeAPI's own `past_values` is
 * version-group-tagged and runs the opposite direction to our generation-tagged data; this is
 * collapsed to whole-generation granularity at extraction time (scripts/extract-pokedex.ts). A
 * null field on a qualifying entry means "not specified here", so resolution keeps walking to
 * later qualifying entries for that field before falling back to the move's current top-level
 * value. Example: Vine Whip is 35 power and 15 pp in Gen 4-5, 45/25 from Gen 6 on.
 *
 * A species or move introduced after the resolved generation has no earlier history, so
 * resolution falls through to its current values. That is normal for a randomiser or romhack,
 * not an error.
 *
 * Damage class was a per-type rule before Gen 4 and became a per-move property from Gen 4 on.
 * We store the modern per-move value only.
 */

/**
 * The 18 elemental types. Fairy (added Gen 6) is included, so a caller resolving at Gen 4 or
 * earlier must go through `pokedexFor` to avoid seeing it.
 *
 * "unknown" is PokeAPI's "???" placeholder, not a 19th type. It appears here for exactly one
 * move, Curse, which was typeless in Gen 2-4 and became Ghost-type in Gen 5. No species has it.
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
 * One historical move-stat snapshot, valid through (and including) `throughGeneration`. A null
 * field means "not specified by this entry": resolution keeps walking. See the module comment.
 */
export interface PastMoveValue {
  throughGeneration: number;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  type: Type | null;
}
