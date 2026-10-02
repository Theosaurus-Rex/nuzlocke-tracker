import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type Row,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo } from "react";

import { ItemSprite } from "@/components/item-sprite";
import { SpeciesSprite } from "@/components/species-sprite";
import { Typography } from "@/components/typography";
import type { Mon } from "@/domain/types";
import { monTitle } from "../encounters/mon-title";
import { genderSymbol } from "@/lib/gender";
import { boxSortValue, compareBoxSortValues, type BoxSortField, type BoxSorting } from "./box-sort";

const FEATURES = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});
const columnHelper = createColumnHelper<typeof FEATURES, Mon>();

function orDash(value: string | number | undefined): string {
  return value === undefined ? "—" : String(value);
}

function sortable(field: BoxSortField, header: string) {
  return {
    id: field,
    header,
    sortUndefined: "last" as const,
    sortFn: (a: Row<typeof FEATURES, Mon>, b: Row<typeof FEATURES, Mon>, id: string) =>
      compareBoxSortValues(a.getValue<string | number>(id), b.getValue<string | number>(id)),
  };
}

const SORT_LABELS = { asc: "ascending", desc: "descending", none: "none" } as const;

function sortedDirection(column: { getIsSorted: () => false | "asc" | "desc" }) {
  return column.getIsSorted() || "none";
}

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") return <ArrowUp aria-hidden="true" className="size-3.5" />;
  if (direction === "desc") return <ArrowDown aria-hidden="true" className="size-3.5" />;
  return (
    <ArrowUpDown
      aria-hidden="true"
      data-testid="sort-icon-unsorted"
      className="size-3.5 opacity-40"
    />
  );
}

function toTableSorting(sorting: BoxSorting | null): SortingState {
  return sorting === null ? [] : [{ id: sorting.field, desc: sorting.desc }];
}

function fromTableSorting(state: SortingState): BoxSorting | null {
  const first = state[0];
  return first === undefined ? null : { field: first.id as BoxSortField, desc: first.desc };
}

export interface BoxTableProps {
  mons: Mon[];
  sorting: BoxSorting | null;
  onSortingChange: (sorting: BoxSorting | null) => void;
  routeNames: ReadonlyMap<string, string>;
  onEdit: (monId: string) => void;
}

export function BoxTable({ mons, sorting, onSortingChange, routeNames, onEdit }: BoxTableProps) {
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.display({
          id: "sprite",
          enableSorting: false,
          header: () => <span className="sr-only">Sprite</span>,
          cell: ({ row }) => (
            <SpeciesSprite
              speciesId={row.original.speciesId}
              shiny={row.original.shiny}
              size={40}
              variant="icon"
            />
          ),
        }),
        columnHelper.accessor((mon) => boxSortValue(mon, "name"), {
          ...sortable("name", "Name"),
          cell: ({ row }) => (
            <button
              type="button"
              aria-label={`Edit ${monTitle(row.original)}`}
              onClick={(event) => {
                event.stopPropagation();
                onEdit(row.original.id);
              }}
              className="cursor-pointer bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Typography as="span" variant="strong">
                {monTitle(row.original)}
              </Typography>
            </button>
          ),
        }),
        columnHelper.accessor((mon) => boxSortValue(mon, "species"), {
          ...sortable("species", "Species"),
          cell: ({ getValue }) => orDash(getValue()),
        }),
        columnHelper.accessor((mon) => boxSortValue(mon, "level"), {
          ...sortable("level", "Lvl"),
          cell: ({ row }) => (
            <Typography as="span" variant="number" className="text-base">
              {row.original.level}
            </Typography>
          ),
        }),
        columnHelper.accessor((mon) => boxSortValue(mon, "gender"), {
          ...sortable("gender", "Gender"),
          cell: ({ row }) => genderSymbol(row.original.gender) ?? "—",
        }),
        columnHelper.accessor((mon) => boxSortValue(mon, "nature"), {
          ...sortable("nature", "Nature"),
          cell: ({ getValue }) => orDash(getValue()),
        }),
        columnHelper.accessor((mon) => boxSortValue(mon, "ability"), {
          ...sortable("ability", "Ability"),
          cell: ({ getValue }) => orDash(getValue()),
        }),
        columnHelper.accessor((mon) => boxSortValue(mon, "item"), {
          ...sortable("item", "Item"),
          cell: ({ row, getValue }) => (
            <span className="inline-flex items-center gap-1.5">
              {row.original.heldItem !== null && <ItemSprite item={row.original.heldItem} />}
              {getValue() ?? "no item"}
            </span>
          ),
        }),
        columnHelper.accessor(
          (mon) => (mon.caughtRouteId === null ? "—" : (routeNames.get(mon.caughtRouteId) ?? "—")),
          { id: "caughtOn", header: "Caught on", enableSorting: false },
        ),
      ]),
    [routeNames, onEdit],
  );

  const table = useTable({
    features: FEATURES,
    columns,
    data: mons,
    getRowId: (mon) => mon.id,
    sortDescFirst: false,
    state: { sorting: toTableSorting(sorting) },
    onSortingChange: (updater) =>
      onSortingChange(
        fromTableSorting(
          typeof updater === "function" ? updater(toTableSorting(sorting)) : updater,
        ),
      ),
  });

  return (
    <table className="w-full border-collapse bg-background text-left text-sm">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id} className="border-y-[1.5px] border-border bg-muted">
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                className="px-3 py-2"
                aria-sort={
                  header.column.getCanSort()
                    ? SORT_LABELS[sortedDirection(header.column)]
                    : undefined
                }
              >
                {header.isPlaceholder ? null : (
                  <Typography as="span" variant="eyebrow" tone="ink">
                    {header.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex cursor-pointer items-center gap-1 bg-transparent p-0 uppercase hover:bg-background focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <table.FlexRender header={header} />
                        <SortIcon direction={header.column.getIsSorted()} />
                      </button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </Typography>
                )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr
            key={row.id}
            onClick={() => onEdit(row.original.id)}
            className="cursor-pointer border-b border-muted last:border-b-0"
          >
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
