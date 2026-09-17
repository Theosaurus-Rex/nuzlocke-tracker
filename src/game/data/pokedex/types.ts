/**
 * Shared types for the pokedex data modules (species, moves, abilities): the type union, damage
 * class, base stats shape, and the two "history" shapes used for per-generation resolution.
 *
 * PokeAPI serves present-day values by default. Two fields need historical resolution against
 * the generation a run is tracking — see `pokedexFor` in src/game/pokedex.ts for the resolver:
 *
 * - A species' `types` can retcon (Clefairy: Normal through Gen 5, Fairy from Gen 6 — Fairy did
 *   not exist before then). `pastTypes` entries are generation-tagged and mean "these types
 *   applied through this generation, inclusive". Resolve by taking the first entry (sorted
 *   ascending by `throughGeneration`) whose `throughGeneration >= target`, falling back to the
 *   current (present-day) `types` field if none qualifies.
 * - A move's `power`/`accuracy`/`pp`/`type` can change between generations too (Vine Whip: 35
 *   power / 15 pp in Gen 4-5, 45/25 from Gen 6 on). `pastValues` entries use the same
 *   "throughGeneration, resolve ascending, fall back to current" rule, but per FIELD: a null
 *   field on a qualifying entry means "not specified here", so resolution keeps walking forward
 *   through later (still-qualifying) entries for that one field before falling back to the
 *   move's current top-level value. See scripts/extract-pokedex.ts for how these are derived
 *   from PokeAPI's `past_types` (generation-tagged) and `past_values` (version-group-tagged, the
 *   OPPOSITE direction, and collapsed to whole-generation granularity at extraction time).
 *
 * A species or move introduced AFTER the generation being resolved (e.g. a Gen 9 species turning
 * up in a Gen 4 run — normal for a randomiser/romhack, not an error) has no earlier history to
 * find, so resolution naturally falls through to its current (only ever known) values. Nothing
 * throws for this case.
 *
 * Damage class (physical/special/status) was a per-TYPE rule before Gen 4 and became a per-MOVE
 * property from Gen 4 onward. We store the modern per-move value only and do not attempt to
 * model the Gen 1-3 rule.
 */

/**
 * The 18 elemental types. Fairy (added Gen 6) is included — this dataset spans every
 * generation, so a caller resolving at Gen 4 or earlier must go through `pokedexFor` to avoid
 * seeing it (see the module comment above and src/game/pokedex.test.ts).
 *
 * "unknown" is not a 19th elemental type — it is PokeAPI's "???" placeholder, used in this
 * dataset for exactly one move: Curse, which was genuinely typeless in Gen 2-4 and only became
 * Ghost-type as of Gen 5. No species ever legitimately has this type.
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
 * field means "not specified by this entry" — resolution keeps walking to the next qualifying
 * entry for that field, then falls back to the move's current top-level value. See the module
 * comment above.
 */
export interface PastMoveValue {
  throughGeneration: number;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  type: Type | null;
}
