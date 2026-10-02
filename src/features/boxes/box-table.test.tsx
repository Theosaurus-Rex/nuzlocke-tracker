import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Mon } from "@/domain/types";
import { defaultPokeApiRoutes, stubPokeApi } from "@/test/pokeapi-fetch";

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

function renderTable(
  mons: Mon[],
  routeNames = new Map<string, string>(),
  onEdit: (monId: string) => void = vi.fn(),
) {
  stubPokeApi(defaultPokeApiRoutes);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BoxTable mons={mons} routeNames={routeNames} onEdit={onEdit} />
    </QueryClientProvider>,
  );
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

  it("shows a dash for missing values and no item for a missing item", () => {
    renderTable([makeMon()]);

    expect(cellsOf(1).slice(4)).toEqual(["—", "—", "—", "no item", "—"]);
  });

  it("shows a dash when the caught route is not in the name map", () => {
    renderTable([makeMon({ caughtRouteId: "gone" })]);

    expect(cellsOf(1)[8]).toBe("—");
  });
});
