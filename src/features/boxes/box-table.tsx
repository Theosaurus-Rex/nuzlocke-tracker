import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { useMemo } from "react";

import { ItemSprite } from "@/components/item-sprite";
import { SpeciesSprite } from "@/components/species-sprite";
import { Typography } from "@/components/typography";
import type { Mon } from "@/domain/types";
import { abilityDisplayName, itemDisplayName, speciesDisplayName } from "@/game/pokeapi/resolve";
import { monTitle } from "../encounters/mon-title";
import { genderSymbol } from "@/lib/gender";

const FEATURES = tableFeatures({});
const columnHelper = createColumnHelper<typeof FEATURES, Mon>();

function orDash(value: string | null): string {
  return value === null || value === "" ? "—" : value;
}

export interface BoxTableProps {
  mons: Mon[];
  routeNames: ReadonlyMap<string, string>;
  onEdit: (monId: string) => void;
}

export function BoxTable({ mons, routeNames, onEdit }: BoxTableProps) {
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.display({
          id: "sprite",
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
        columnHelper.accessor((mon) => monTitle(mon), {
          id: "name",
          header: "Name",
          cell: ({ row, getValue }) => (
            <button
              type="button"
              aria-label={`Edit ${getValue()}`}
              onClick={(event) => {
                event.stopPropagation();
                onEdit(row.original.id);
              }}
              className="cursor-pointer bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Typography as="span" variant="strong">
                {getValue()}
              </Typography>
            </button>
          ),
        }),
        columnHelper.accessor((mon) => speciesDisplayName(mon.speciesId), {
          id: "species",
          header: "Species",
        }),
        columnHelper.accessor("level", {
          header: "Lvl",
          cell: ({ row }) => (
            <Typography as="span" variant="number" className="text-base">
              {row.original.level}
            </Typography>
          ),
        }),
        columnHelper.accessor((mon) => genderSymbol(mon.gender) ?? "—", {
          id: "gender",
          header: "Gender",
        }),
        columnHelper.accessor((mon) => orDash(mon.nature), { id: "nature", header: "Nature" }),
        columnHelper.accessor(
          (mon) => orDash(mon.ability === null ? null : abilityDisplayName(mon.ability)),
          { id: "ability", header: "Ability" },
        ),
        columnHelper.accessor(
          (mon) => (mon.heldItem === null ? "no item" : itemDisplayName(mon.heldItem)),
          {
            id: "item",
            header: "Item",
            cell: ({ row, getValue }) => (
              <span className="inline-flex items-center gap-1.5">
                {row.original.heldItem !== null && <ItemSprite item={row.original.heldItem} />}
                {getValue()}
              </span>
            ),
          },
        ),
        columnHelper.accessor(
          (mon) => (mon.caughtRouteId === null ? "—" : (routeNames.get(mon.caughtRouteId) ?? "—")),
          { id: "caughtOn", header: "Caught on" },
        ),
      ]),
    [routeNames, onEdit],
  );

  const table = useTable({
    features: FEATURES,
    columns,
    data: mons,
    getRowId: (mon) => mon.id,
  });

  return (
    <table className="w-full border-collapse bg-background text-left text-sm">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id} className="border-y-[1.5px] border-border bg-muted">
            {headerGroup.headers.map((header) => (
              <th key={header.id} className="px-3 py-2">
                {header.isPlaceholder ? null : (
                  <Typography as="span" variant="eyebrow" tone="ink">
                    <table.FlexRender header={header} />
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
