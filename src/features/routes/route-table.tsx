import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";

import { SpeciesTypeBadge } from "@/components/species-type-badge";
import { StatusChip } from "@/components/status-chip";
import { canDeleteRoute } from "@/domain/routes";
import type { RouteRow } from "@/domain/route-rows";
import type { Encounter, Mon, Route } from "@/domain/types";
import { cn } from "@/lib/utils";

import { canLogEncounter, chipForRouteRow, rowSpeciesId, RowSpecies } from "./route-presentation";
import { RowActionsMenu } from "./row-actions-menu";

function StatusCell({ row, onLogEncounter }: { row: RouteRow; onLogEncounter: () => void }) {
  const chip = chipForRouteRow(row);

  if (canLogEncounter(row)) {
    return (
      <button
        type="button"
        aria-label="Log encounter"
        onClick={onLogEncounter}
        className="cursor-pointer"
      >
        <StatusChip status={chip.status}>{chip.label}</StatusChip>
      </button>
    );
  }

  return <StatusChip status={chip.status}>{chip.label}</StatusChip>;
}

function EncounterCell({ row }: { row: RouteRow }) {
  if (row.encounter === null) {
    return <span className="text-muted-foreground">not encountered yet</span>;
  }

  return (
    <RowSpecies row={row} emptyFallback={<span className="text-muted-foreground">&mdash;</span>} />
  );
}

function TypeCell({ row, generation }: { row: RouteRow; generation: number }) {
  return <SpeciesTypeBadge speciesId={rowSpeciesId(row)} generation={generation} />;
}

const FEATURES = tableFeatures({});
const columnHelper = createColumnHelper<typeof FEATURES, RouteRow>();

export interface RouteTableProps {
  rows: RouteRow[];
  encounters: readonly Encounter[];
  generation: number;
  onDelete: (route: Route) => void;
  deletePending: boolean;
  onLogEncounter: (route: Route) => void;
  onEditMon: (route: Route, mon: Mon) => void;
  onResetEncounter: (row: RouteRow) => void;
}

export function RouteTable({
  rows,
  encounters,
  generation,
  onDelete,
  deletePending,
  onLogEncounter,
  onEditMon,
  onResetEncounter,
}: RouteTableProps) {
  const columns = [
    columnHelper.display({
      id: "route",
      header: "Route",
      cell: ({ row }) => {
        const routeRow = row.original;

        return (
          <div className="min-w-0 truncate">
            <span
              className={cn("font-medium", routeRow.status === "missed" && "text-muted-foreground")}
            >
              {routeRow.route.name}
            </span>
            {routeRow.route.isCustom && (
              <span className="text-muted-foreground ml-2 border-[1.5px] border-border px-1.5 py-0.5 text-[11px] font-medium tracking-[0.12em] uppercase">
                Custom
              </span>
            )}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "encounter",
      header: "Encounter",
      cell: ({ row }) => <EncounterCell row={row.original} />,
    }),
    columnHelper.display({
      id: "type",
      header: "Type",
      cell: ({ row }) => <TypeCell row={row.original} generation={generation} />,
    }),
    columnHelper.display({
      id: "level",
      header: "Lvl",
      cell: ({ row }) => {
        const routeRow = row.original;
        const level = routeRow.mon?.level ?? routeRow.encounter?.level ?? null;
        return <span className="font-mono text-lg">{level ?? "—"}</span>;
      },
    }),
    columnHelper.display({
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusCell row={row.original} onLogEncounter={() => onLogEncounter(row.original.route)} />
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const routeRow = row.original;
        const removable = canDeleteRoute(routeRow.route, encounters);

        return (
          <RowActionsMenu
            row={routeRow}
            removable={removable}
            deletePending={deletePending}
            onEditMon={onEditMon}
            onReset={onResetEncounter}
            onDelete={onDelete}
          />
        );
      },
    }),
  ];

  const table = useTable({
    features: FEATURES,
    columns,
    data: rows,
    getRowId: (row) => row.route.id,
  });

  return (
    <table className="w-full border-collapse bg-background text-left text-sm">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id} className="border-y-[1.5px] border-border bg-muted">
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                className={cn(
                  "px-3 py-2 text-[13px] font-medium tracking-[0.12em] text-foreground uppercase",
                  header.column.id === "actions" && "w-px text-right",
                )}
              >
                {header.isPlaceholder ? null : <table.FlexRender header={header} />}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr
            key={row.id}
            className={cn(
              "border-b border-muted last:border-b-0",
              canLogEncounter(row.original) && "bg-flag-tint",
            )}
          >
            {row.getAllCells().map((cell) => (
              <td
                key={cell.id}
                className={cn("px-3 py-2", cell.column.id === "actions" && "w-px text-right")}
              >
                <table.FlexRender cell={cell} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
