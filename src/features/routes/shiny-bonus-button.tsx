import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { RouteRow } from "@/domain/route-rows";
import type { Route } from "@/domain/types";
import { cn } from "@/lib/utils";

export interface ShinyBonusButtonProps {
  row: RouteRow;
  onShinyBonus?: (route: Route) => void;
  className?: string;
}

export function ShinyBonusButton({
  row,
  onShinyBonus,
  className,
}: ShinyBonusButtonProps): ReactNode {
  const used = row.status !== "not-encountered" && row.status !== "open";

  if (onShinyBonus === undefined || !used) {
    return null;
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className={cn(className)}
      aria-label={`Add a bonus shiny on ${row.route.name}`}
      onClick={(event) => {
        event.stopPropagation();
        onShinyBonus(row.route);
      }}
    >
      ✦ Add bonus shiny
    </Button>
  );
}
