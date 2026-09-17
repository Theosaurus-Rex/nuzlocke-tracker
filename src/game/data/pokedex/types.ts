/**
 * Shared types for the Gen 4 pokedex data modules (species, moves, abilities).
 *
 * `learnsets.ts` deliberately does NOT import from here (see its own header): it is kept
 * free of any import so it can be code-split or lazily loaded on its own later.
 */

/**
 * The 17 types that exist in Generation 4. Fairy does not exist yet (added Gen 6) — see
 * CLAUDE.md and scripts/extract-pokedex.ts for why this matters and how it is enforced.
 *
 * "unknown" is not an 18th elemental type — it is PokeAPI's "???" placeholder, and in this
 * dataset it is used for exactly one move: Curse, which was genuinely typeless in Gen 2-4
 * (Bulbapedia: "Curse is now a Ghost-type move" as of Generation V, implying it was not one
 * before). Do not use it for type-effectiveness math; it exists only so Curse's Gen 4 data is
 * accurate rather than silently coerced to "ghost" (its modern type).
 */
export type Gen4Type =
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
