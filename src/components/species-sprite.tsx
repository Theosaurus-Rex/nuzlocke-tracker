import { useState, type ReactNode } from "react";

import type { SpeciesSprites } from "@/game/pokeapi/model";
import { useSpecies } from "@/game/pokeapi/queries";
import { cn } from "@/lib/utils";

export type SpeciesSpriteVariant = "sprite" | "icon";

export interface SpeciesSpriteProps {
  speciesId: string | null;
  shiny: boolean;
  size: number;
  variant?: SpeciesSpriteVariant;
  className?: string;
}

function candidates(
  sprites: SpeciesSprites,
  shiny: boolean,
  variant: SpeciesSpriteVariant,
): string[] {
  const still = (shiny ? sprites.stillShiny : null) ?? sprites.still;
  const ordered = variant === "icon" ? [sprites.icon, still] : [still];
  return ordered.filter((address): address is string => address !== null);
}

export function SpeciesSprite({
  speciesId,
  shiny,
  size,
  variant = "sprite",
  className,
}: SpeciesSpriteProps): ReactNode {
  const species = useSpecies(speciesId);
  const [failed, setFailed] = useState<readonly string[]>([]);
  const src = species.data
    ? (candidates(species.data.sprites, shiny, variant).find((a) => !failed.includes(a)) ?? null)
    : null;
  const box = { width: size, height: size };

  if (src === null) {
    return (
      <span
        aria-hidden="true"
        data-sprite="placeholder"
        style={box}
        className={cn("block shrink-0 border-[1.5px] border-dashed border-placeholder", className)}
      />
    );
  }

  // Icons are drawn at 1x from the bottom, not scaled. Gen 8 ones sit low on a padded canvas.
  const fit = src === species.data?.sprites.icon ? "object-none object-bottom" : "object-contain";
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      style={box}
      onError={() => setFailed((current) => [...current, src])}
      className={cn("block shrink-0 [image-rendering:pixelated]", fit, className)}
    />
  );
}
