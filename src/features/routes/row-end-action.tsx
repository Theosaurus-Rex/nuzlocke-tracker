import type { ReactNode } from "react";

import { RotateCcwIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RouteRow } from "@/domain/route-rows";
import type { Route } from "@/domain/types";
import { cn } from "@/lib/utils";

export interface RowEndActionProps {
  row: RouteRow;
  removable: boolean;
  deletePending: boolean;
  onReset: (row: RouteRow) => void;
  onDelete: (route: Route) => void;
  className?: string;
}

const ICON_BUTTON_CLASSNAME =
  "bg-foreground text-background hover:bg-foreground/85 hover:text-background";

export function RowEndAction({
  row,
  removable,
  deletePending,
  onReset,
  onDelete,
  className,
}: RowEndActionProps): ReactNode {
  const canReset =
    row.status === "caught" ||
    row.status === "dead" ||
    row.status === "missed" ||
    row.status === "skipped";

  if (canReset) {
    return (
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={`Reset ${row.route.name}`}
        onClick={(event) => {
          event.stopPropagation();
          onReset(row);
        }}
        className={cn(ICON_BUTTON_CLASSNAME, className)}
      >
        <RotateCcwIcon />
      </Button>
    );
  }

  if (removable) {
    return (
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={`Delete ${row.route.name}`}
        disabled={deletePending}
        onClick={(event) => {
          event.stopPropagation();
          onDelete(row.route);
        }}
        className={cn(ICON_BUTTON_CLASSNAME, className)}
      >
        <Trash2Icon />
      </Button>
    );
  }

  return null;
}
