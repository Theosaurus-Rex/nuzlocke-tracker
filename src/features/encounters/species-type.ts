import type { TypeBadgeType } from "@/components/type-badge";
import { getSpeciesByName, pokedexFor } from "@/game/pokedex";

/**
 * Resolves a species' primary type against `generation`, never its present-day types. Clefairy
 * is Normal in a HeartGold (gen 4) run and Fairy from gen 6 on; reading its current types would
 * show the latter regardless of the game being tracked.
 */
export function resolveSpeciesType(speciesId: string, generation: number): TypeBadgeType | null {
  const species = getSpeciesByName(speciesId);
  if (species === undefined) return null;

  const types = pokedexFor(generation).typesOf(species.id);
  const primary = types?.[0];
  if (primary === undefined || primary === "unknown") return null;

  return primary;
}
