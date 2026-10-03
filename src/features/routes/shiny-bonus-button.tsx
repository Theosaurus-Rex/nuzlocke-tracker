import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { RouteRow } from "@/domain/route-rows";
import type { Route } from "@/domain/types";

export interface ShinyBonusButtonProps {
  row: RouteRow;
  onShinyBonus?: (route: Route) => void;
}

export function ShinyBonusButton({ row, onShinyBonus }: ShinyBonusButtonProps): ReactNode {
  const used = row.status !== "not-encountered" && row.status !== "open";

  if (onShinyBonus === undefined || !used) {
    return null;
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      aria-label={`Log a shiny on ${row.route.name}`}
      onClick={(event) => {
        event.stopPropagation();
        onShinyBonus(row.route);
      }}
    >
      ✦ Shiny
    </Button>
  );
}
