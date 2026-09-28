import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";

import { SpeciesSprite } from "@/components/species-sprite";
import { Typography } from "@/components/typography";
import type { Mon } from "@/domain/types";
import { speciesDisplayName } from "@/game/pokeapi/resolve";
import { genderSymbol } from "@/lib/gender";

const FEATURES = tableFeatures({});
const columnHelper = createColumnHelper<typeof FEATURES, Mon>();

function orDash(value: string | null): string {
  return value === null || value === "" ? "—" : value;
}

export interface BoxTableProps {
  mons: Mon[];
  routeNames: ReadonlyMap<string, string>;
}

export function BoxTable({ mons, routeNames }: BoxTableProps) {
  const columns = columnHelper.columns([
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
    columnHelper.accessor(
      (mon) => (mon.nickname !== null ? `“${mon.nickname}”` : speciesDisplayName(mon.speciesId)),
      {
        id: "name",
        header: "Name",
        cell: ({ getValue }) => (
          <Typography as="span" variant="strong">
            {getValue()}
          </Typography>
        ),
      },
    ),
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
    columnHelper.accessor((mon) => orDash(mon.ability), { id: "ability", header: "Ability" }),
    columnHelper.accessor((mon) => mon.heldItem ?? "no item", { id: "item", header: "Item" }),
    columnHelper.accessor(
      (mon) => (mon.caughtRouteId === null ? "—" : (routeNames.get(mon.caughtRouteId) ?? "—")),
      { id: "caughtOn", header: "Caught on" },
    ),
  ]);

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
          <tr key={row.id} className="border-b border-muted last:border-b-0">
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
