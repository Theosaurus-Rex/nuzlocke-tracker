import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { canDeleteRoute } from "@/domain/routes";
import type { RouteRow, RouteRowStatus } from "@/domain/route-rows";
import type { Encounter, Route } from "@/domain/types";
import { speciesDisplayName } from "@/game/pokedex";

const STATUS_LABEL: Record<RouteRowStatus, string> = {
  "not-encountered": "not encountered",
  open: "open",
  caught: "caught",
  missed: "missed",
  skipped: "skipped",
  dead: "dead",
};

function StatusPill({ status }: { status: RouteRowStatus }) {
  const className =
    status === "dead"
      ? "rounded-full border border-destructive px-2 py-0.5 text-xs text-destructive"
      : "rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground";

  return <span className={className}>{STATUS_LABEL[status]}</span>;
}

function EncounterCell({ row }: { row: RouteRow }) {
  if (row.encounter === null) {
    return <span className="text-muted-foreground">not encountered</span>;
  }

  if (row.mon !== null) {
    return (
      <span>
        {speciesDisplayName(row.mon.speciesId)}
        {row.mon.nickname !== null && (
          <span className="text-muted-foreground"> &ldquo;{row.mon.nickname}&rdquo;</span>
        )}
      </span>
    );
  }

  // An encounter can be resolved without recording what was met, so a missed or skipped row
  // with no species is ordinary data, not a row that was never encountered.
  if (row.encounter.speciesId === null) {
    return <span className="text-muted-foreground">&mdash;</span>;
  }

  return <span>{speciesDisplayName(row.encounter.speciesId)}</span>;
}

const FEATURES = tableFeatures({});
const columnHelper = createColumnHelper<typeof FEATURES, RouteRow>();

export interface RouteTableProps {
  rows: RouteRow[];
  encounters: readonly Encounter[];
  onDelete: (route: Route) => void;
  deletePending: boolean;
}

export function RouteTable({ rows, encounters, onDelete, deletePending }: RouteTableProps) {
  const columns = [
    columnHelper.display({
      id: "route",
      header: "Route",
      cell: ({ row }) => {
        const routeRow = row.original;
        const removable = canDeleteRoute(routeRow.route, encounters);

        return (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 truncate">
              <span>{routeRow.route.name}</span>
              {routeRow.route.isCustom && (
                <span className="text-muted-foreground ml-2 rounded border border-border px-1.5 py-0.5 text-xs uppercase">
                  Custom
                </span>
              )}
            </div>
            {removable && (
              <Button
                size="sm"
                variant="ghost"
                disabled={deletePending}
                onClick={() => onDelete(routeRow.route)}
              >
                Remove
              </Button>
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
      id: "level",
      header: "Lvl",
      cell: ({ row }) => {
        const routeRow = row.original;
        const level = routeRow.mon?.level ?? routeRow.encounter?.level ?? null;
        return <span>{level ?? "—"}</span>;
      },
    }),
    columnHelper.display({
      id: "status",
      header: "Status",
      cell: ({ row }) => <StatusPill status={row.original.status} />,
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
          <tr key={headerGroup.id} className="border-b border-border">
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                className="text-muted-foreground px-3 py-2 text-xs font-normal uppercase"
              >
                {header.isPlaceholder ? null : <table.FlexRender header={header} />}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id} className="border-b border-border last:border-b-0">
            {row.getAllCells().map((cell) => (
              <td key={cell.id} className="px-3 py-2">
                <table.FlexRender cell={cell} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
