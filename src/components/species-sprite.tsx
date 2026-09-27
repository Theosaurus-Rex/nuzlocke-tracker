import { useState, type ReactNode } from "react";

import type { SpeciesSprites } from "@/game/pokeapi/model";
import { useSpecies } from "@/game/pokeapi/queries";
import { cn } from "@/lib/utils";

export interface SpeciesSpriteProps {
  speciesId: string | null;
  shiny: boolean;
  size: number;
  className?: string;
}

interface SpritePair {
  animated: string | null;
  still: string | null;
}

function pickPair(sprites: SpeciesSprites, shiny: boolean): SpritePair {
  const hasShiny = sprites.animatedShiny !== null || sprites.stillShiny !== null;
  return shiny && hasShiny
    ? { animated: sprites.animatedShiny, still: sprites.stillShiny }
    : { animated: sprites.animated, still: sprites.still };
}

export function SpeciesSprite({
  speciesId,
  shiny,
  size,
  className,
}: SpeciesSpriteProps): ReactNode {
  const species = useSpecies(speciesId);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const pair: SpritePair = species.data
    ? pickPair(species.data.sprites, shiny)
    : { animated: null, still: null };
  const src = pair.animated ?? pair.still;
  const box = { width: size, height: size };

  if (src === null || src === failedSrc) {
    return (
      <span
        aria-hidden="true"
        data-sprite="placeholder"
        style={box}
        className={cn("block shrink-0 border-[1.5px] border-dashed border-placeholder", className)}
      />
    );
  }

  return (
    <picture aria-hidden="true" style={box} className={cn("block shrink-0", className)}>
      {pair.still !== null && (
        <source media="(prefers-reduced-motion: reduce)" srcSet={pair.still} />
      )}
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailedSrc(src)}
        className="size-full object-contain [image-rendering:pixelated]"
      />
    </picture>
  );
}
