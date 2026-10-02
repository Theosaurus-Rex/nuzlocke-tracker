import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { Mon } from "@/domain/types";
import { defaultPokeApiRoutes, stubPokeApi } from "@/test/pokeapi-fetch";

import type { BoxSorting } from "./box-sort";
import { BoxTable } from "./box-table";

function makeMon(overrides: Partial<Mon> = {}): Mon {
  return {
    id: "mon-1",
    createdAt: "2026-09-27T00:00:00.000Z",
    updatedAt: "2026-09-27T00:00:00.000Z",
    runId: "run-1",
    encounterId: null,
    speciesId: "chikorita",
    speciesIdCaught: "chikorita",
    nickname: null,
    gender: null,
    level: 5,
    levelCaught: 5,
    nature: null,
    ability: null,
    heldItem: null,
    moves: [],
    status: "box",
    partySlot: null,
    boxOrder: 0,
    caughtRouteId: null,
    shiny: false,
    ...overrides,
  };
}

function Harness({
  mons,
  routeNames,
  onEdit,
}: {
  mons: Mon[];
  routeNames: ReadonlyMap<string, string>;
  onEdit: (monId: string) => void;
}) {
  const [sorting, setSorting] = useState<BoxSorting | null>(null);
  return (
    <BoxTable
      mons={mons}
      sorting={sorting}
      onSortingChange={setSorting}
      routeNames={routeNames}
      onEdit={onEdit}
    />
  );
}

function renderTable(
  mons: Mon[],
  routeNames = new Map<string, string>(),
  onEdit: (monId: string) => void = vi.fn(),
) {
  stubPokeApi(defaultPokeApiRoutes);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Harness mons={mons} routeNames={routeNames} onEdit={onEdit} />
    </QueryClientProvider>,
  );
}

function header(name: string): HTMLElement {
  return screen.getByRole("columnheader", { name });
}

function clickHeader(name: string) {
  return userEvent.click(within(header(name)).getByRole("button"));
}

function nameColumn(): string[] {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[1]?.textContent ?? "");
}

function cellsOf(rowIndex: number): string[] {
  const row = screen.getAllByRole("row").at(rowIndex);
  if (!row) throw new Error(`no row ${rowIndex}`);
  return within(row)
    .getAllByRole("cell")
    .map((cell) => cell.textContent ?? "");
}

describe("BoxTable", () => {
  it("opens a mon from its name button or from a click anywhere on the row, once each", async () => {
    const onEdit = vi.fn();
    renderTable([makeMon({ id: "a", nickname: "Sprig", nature: "Jolly" })], new Map(), onEdit);

    await userEvent.click(screen.getByRole("button", { name: "Edit “Sprig”" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByText("Lvl"));
    expect(onEdit).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByText("Jolly"));

    expect(onEdit).toHaveBeenCalledTimes(2);
    expect(onEdit).toHaveBeenLastCalledWith("a");
  });

  it("renders a header for every column", () => {
    renderTable([makeMon()]);

    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual([
      "Sprite",
      "Name",
      "Species",
      "Lvl",
      "Gender",
      "Nature",
      "Ability",
      "Item",
      "Caught on",
    ]);
  });

  it("renders one row per mon", () => {
    renderTable([makeMon({ id: "a" }), makeMon({ id: "b" }), makeMon({ id: "c" })]);

    expect(screen.getAllByRole("row")).toHaveLength(4);
  });

  it("shows a nickname in quotes, and the species name when there is none", () => {
    renderTable([makeMon({ id: "a", nickname: "Sprig" }), makeMon({ id: "b", nickname: null })]);

    expect(cellsOf(1)[1]).toBe("“Sprig”");
    expect(cellsOf(2)[1]).toBe("Chikorita");
  });

  it("shows every filled field", () => {
    renderTable(
      [
        makeMon({
          gender: "female",
          level: 17,
          nature: "Modest",
          ability: "Overgrow",
          heldItem: "Oran Berry",
          caughtRouteId: "route-29",
        }),
      ],
      new Map([["route-29", "Route 29"]]),
    );

    expect(cellsOf(1).slice(2)).toEqual([
      "Chikorita",
      "17",
      "♀",
      "Modest",
      "Overgrow",
      "Oran Berry",
      "Route 29",
    ]);
  });

  it("shows an old typed ability and a PokéAPI name the same way", () => {
    renderTable([
      makeMon({ id: "a", ability: "Water Absorb" }),
      makeMon({ id: "b", ability: "water-absorb" }),
    ]);

    expect(cellsOf(1)[6]).toBe("Water Absorb");
    expect(cellsOf(2)[6]).toBe("Water Absorb");
  });

  it("shows an old typed item and a PokéAPI name the same way", () => {
    renderTable([
      makeMon({ id: "a", heldItem: "Miracle Seed" }),
      makeMon({ id: "b", heldItem: "miracle-seed" }),
    ]);

    expect(cellsOf(1)[7]).toBe("Miracle Seed");
    expect(cellsOf(2)[7]).toBe("Miracle Seed");
  });

  it("shows a dash for missing values and no item for a missing item", () => {
    renderTable([makeMon()]);

    expect(cellsOf(1).slice(4)).toEqual(["—", "—", "—", "no item", "—"]);
  });

  it("shows a dash when the caught route is not in the name map", () => {
    renderTable([makeMon({ caughtRouteId: "gone" })]);

    expect(cellsOf(1)[8]).toBe("—");
  });

  it("shows the held item sprite, and none for no item", () => {
    renderTable([makeMon({ id: "a", heldItem: "miracle-seed" }), makeMon({ id: "b" })]);

    const [, withItem, without] = screen.getAllByRole("row");
    expect(
      withItem!.querySelector(
        'img[src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/miracle-seed.png"]',
      ),
    ).not.toBeNull();
    expect(without!.querySelector('img[src*="/items/"]')).toBeNull();
  });

  describe("sorting", () => {
    const slots = [
      makeMon({ id: "b", nickname: "beta", level: 10, nature: "Jolly", heldItem: "oran-berry" }),
      makeMon({ id: "e", nickname: null, level: 9 }),
      makeMon({
        id: "a",
        nickname: "alpha",
        level: 100,
        nature: "Adamant",
        heldItem: "apicot-berry",
      }),
    ];

    it("cycles ascending, descending, then back to slot order", async () => {
      renderTable(slots);
      expect(header("Lvl")).toHaveAttribute("aria-sort", "none");

      await clickHeader("Lvl");
      expect(nameColumn()).toEqual(["Chikorita", "“beta”", "“alpha”"]);
      expect(header("Lvl")).toHaveAttribute("aria-sort", "ascending");

      await clickHeader("Lvl");
      expect(nameColumn()).toEqual(["“alpha”", "“beta”", "Chikorita"]);
      expect(header("Lvl")).toHaveAttribute("aria-sort", "descending");

      await clickHeader("Lvl");
      expect(nameColumn()).toEqual(["“beta”", "Chikorita", "“alpha”"]);
      expect(header("Lvl")).toHaveAttribute("aria-sort", "none");
    });

    it("sorts names ignoring case, nickname and species together", async () => {
      renderTable(slots);

      await clickHeader("Name");

      expect(nameColumn()).toEqual(["“alpha”", "“beta”", "Chikorita"]);
    });

    it("moves the sort to the newly clicked column", async () => {
      renderTable(slots);
      await clickHeader("Lvl");

      await clickHeader("Name");

      expect(header("Lvl")).toHaveAttribute("aria-sort", "none");
      expect(header("Name")).toHaveAttribute("aria-sort", "ascending");
    });

    it.each(["Nature", "Item"])("keeps empty %s last in both directions", async (name) => {
      const input = [
        makeMon({ id: "empty", nickname: "empty" }),
        makeMon({ id: "x", nickname: "x", nature: "Jolly", heldItem: "oran-berry" }),
        makeMon({ id: "y", nickname: "y", nature: "Adamant", heldItem: "apicot-berry" }),
      ];
      renderTable(input);

      await clickHeader(name);
      expect(nameColumn().at(-1)).toBe("“empty”");

      await clickHeader(name);
      expect(header(name)).toHaveAttribute("aria-sort", "descending");
      expect(nameColumn().at(-1)).toBe("“empty”");
    });

    it("keeps slot order between ties", async () => {
      renderTable([
        makeMon({ id: "1", nickname: "one", level: 5 }),
        makeMon({ id: "2", nickname: "two", level: 5 }),
        makeMon({ id: "3", nickname: "three", level: 1 }),
      ]);

      await clickHeader("Lvl");

      expect(nameColumn()).toEqual(["“three”", "“one”", "“two”"]);
    });

    it("does not make the sprite or caught on headers sortable", () => {
      renderTable(slots);

      for (const name of ["Sprite", "Caught on"]) {
        expect(within(header(name)).queryByRole("button")).toBeNull();
        expect(header(name)).not.toHaveAttribute("aria-sort");
      }
    });

    it("shows an unsorted icon on all sortable headers when none are sorted, then hides it on the sorted column", async () => {
      renderTable(slots);

      const sortableHeaders = ["Name", "Species", "Lvl", "Gender", "Nature", "Ability", "Item"];
      const unsortableHeaders = ["Sprite", "Caught on"];

      for (const name of sortableHeaders) {
        const btn = within(header(name)).getByRole("button");
        expect(btn.querySelector('[data-testid="sort-icon-unsorted"]')).not.toBeNull();
      }

      for (const name of unsortableHeaders) {
        expect(header(name).querySelector('[data-testid="sort-icon-unsorted"]')).toBeNull();
      }

      await clickHeader("Lvl");

      expect(header("Lvl").querySelector('[data-testid="sort-icon-unsorted"]')).toBeNull();
      expect(header("Name").querySelector('[data-testid="sort-icon-unsorted"]')).not.toBeNull();
    });
  });
});
