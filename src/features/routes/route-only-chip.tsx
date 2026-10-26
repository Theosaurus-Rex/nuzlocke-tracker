import type { ReactNode } from "react";

import { CHIP_SHAPE } from "@/components/chip";
import type { Route } from "@/domain/types";
import { routeOnly } from "@/game/route-only";
import type { GameData } from "@/game/types";
import { cn } from "@/lib/utils";

const LABEL = { gift: "Gift", static: "Static" } as const;

export function RouteOnlyChip({
  game,
  route,
  className,
}: {
  game: GameData | undefined;
  route: Route;
  className?: string;
}): ReactNode {
  const only = routeOnly(game, route);
  if (only === undefined) return null;
  return <span className={cn(CHIP_SHAPE, "text-muted-foreground", className)}>{LABEL[only]}</span>;
}
