import type { Type } from "@/game/types";
import { CHIP_SHAPE } from "./chip";
import { cn } from "@/lib/utils";

/**
 * `Type` also carries "unknown", PokeAPI's typeless placeholder for pre-Gen-5 Curse. No species
 * has it and the token set has no colour for it, so it is excluded here rather than given one.
 */
export type TypeBadgeType = Exclude<Type, "unknown">;

const TYPE_CLASSES: Record<TypeBadgeType, string> = {
  normal: "bg-type-normal",
  fire: "bg-type-fire",
  water: "bg-type-water",
  electric: "bg-type-electric",
  grass: "bg-type-grass",
  ice: "bg-type-ice",
  fighting: "bg-type-fighting",
  poison: "bg-type-poison",
  ground: "bg-type-ground",
  flying: "bg-type-flying",
  psychic: "bg-type-psychic",
  bug: "bg-type-bug",
  rock: "bg-type-rock",
  ghost: "bg-type-ghost",
  dragon: "bg-type-dragon",
  dark: "bg-type-dark",
  steel: "bg-type-steel",
  fairy: "bg-type-fairy",
};

export interface TypeBadgeProps {
  type: TypeBadgeType;
  className?: string;
}

export function TypeBadge({ type, className }: TypeBadgeProps) {
  return (
    <span className={cn(CHIP_SHAPE, "text-foreground", TYPE_CLASSES[type], className)}>{type}</span>
  );
}
