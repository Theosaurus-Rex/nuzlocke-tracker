import type { ReactNode } from "react";

import { TYPE_FILL } from "@/components/type-badge";
import { Typography } from "@/components/typography";
import { useMove } from "@/game/pokeapi/queries";
import { moveDisplayName, moveStatsIn } from "@/game/pokeapi/resolve";
import { cn } from "@/lib/utils";

export interface MoveChipProps {
  name: string;
  generation: number;
}

export function MoveChip({ name, generation }: MoveChipProps): ReactNode {
  const move = useMove(name);
  const type = move.data ? moveStatsIn(move.data, generation).type : null;
  const fill = type !== null && type !== "unknown" ? TYPE_FILL[type] : "bg-background";

  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn("size-5 shrink-0 rounded-full border-[1.5px] border-border", fill)}
      />
      <Typography as="span" variant="body">
        {moveDisplayName(name)}
      </Typography>
    </span>
  );
}
