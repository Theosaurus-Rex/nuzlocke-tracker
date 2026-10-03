import { useState, type ReactNode } from "react";

import { badgeSpriteUrl } from "@/game/pokeapi/map";
import { cn } from "@/lib/utils";

export interface BadgeSpriteProps {
  sprite: number | null;
  size: number;
  muted?: boolean;
  className?: string;
}

export function BadgeSprite({
  sprite,
  size,
  muted = false,
  className,
}: BadgeSpriteProps): ReactNode {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size };
  if (sprite === null || failed) {
    return (
      <span
        aria-hidden="true"
        data-badge-slot
        className={cn("block shrink-0", className)}
        style={box}
      />
    );
  }
  return (
    <img
      src={badgeSpriteUrl(sprite)}
      alt=""
      aria-hidden="true"
      loading="lazy"
      width={size}
      height={size}
      data-muted={muted}
      onError={() => setFailed(true)}
      className={cn(
        "block shrink-0 object-contain [image-rendering:pixelated]",
        muted && "opacity-40 grayscale",
        className,
      )}
    />
  );
}
