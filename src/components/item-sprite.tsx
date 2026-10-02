import { useState, type ReactNode } from "react";

import { itemSpriteUrl } from "@/game/pokeapi/map";
import { cn } from "@/lib/utils";

export interface ItemSpriteProps {
  item: string;
  className?: string;
}

export function ItemSprite({ item, className }: ItemSpriteProps): ReactNode {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  // Drawn at its own 30px so the pixels stay sharp. The negative margin keeps line height.
  return (
    <img
      src={itemSpriteUrl(item)}
      alt=""
      aria-hidden="true"
      loading="lazy"
      width={30}
      height={30}
      onError={() => setFailed(true)}
      className={cn(
        "-my-1.5 block size-[30px] shrink-0 object-contain [image-rendering:pixelated]",
        className,
      )}
    />
  );
}
