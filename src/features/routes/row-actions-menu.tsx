import type { ReactNode } from "react";

import { EllipsisIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RouteRow } from "@/domain/route-rows";
import type { Mon, Route } from "@/domain/types";

export interface RowActionsMenuProps {
  row: RouteRow;
  removable: boolean;
  deletePending: boolean;
  onEditMon: (route: Route, mon: Mon) => void;
  onReset: (row: RouteRow) => void;
  onDelete: (route: Route) => void;
}

export function RowActionsMenu({
  row,
  removable,
  deletePending,
  onEditMon,
  onReset,
  onDelete,
}: RowActionsMenuProps): ReactNode {
  const mon = row.mon;
  const canEdit = (row.status === "caught" || row.status === "dead") && mon !== null;
  const canReset =
    row.status === "caught" ||
    row.status === "dead" ||
    row.status === "missed" ||
    row.status === "skipped";

  if (!canEdit && !canReset && !removable) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`Actions for ${row.route.name}`}
          />
        }
      >
        <EllipsisIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canEdit && mon !== null && (
          <DropdownMenuItem onClick={() => onEditMon(row.route, mon)}>Edit mon</DropdownMenuItem>
        )}
        {canReset && (
          <DropdownMenuItem variant="destructive" onClick={() => onReset(row)}>
            Reset encounter
          </DropdownMenuItem>
        )}
        {removable && (
          <DropdownMenuItem
            variant="destructive"
            disabled={deletePending}
            onClick={() => onDelete(row.route)}
          >
            Delete route
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
