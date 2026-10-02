import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Mon } from "@/domain/types";
import { defaultPokeApiRoutes, stubPokeApi } from "@/test/pokeapi-fetch";

import { BoxRowList } from "./box-row-list";

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

function renderList(mons: Mon[], onEdit: (monId: string) => void = vi.fn()) {
  stubPokeApi(defaultPokeApiRoutes);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BoxRowList mons={mons} onEdit={onEdit} />
    </QueryClientProvider>,
  );
}

describe("BoxRowList", () => {
  it("has a button per row named for the mon that reports its id", async () => {
    const onEdit = vi.fn();
    renderList(
      [makeMon({ id: "a", nickname: "Sprig" }), makeMon({ id: "b", nickname: null })],
      onEdit,
    );

    await userEvent.click(screen.getByRole("button", { name: "Edit Chikorita" }));

    expect(onEdit).toHaveBeenCalledWith("b");
  });

  it("renders one row per mon", () => {
    renderList([makeMon({ id: "a" }), makeMon({ id: "b" })]);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("shows the nickname in quotes, then species, gender and level, then item and ability", () => {
    renderList([
      makeMon({
        nickname: "Sprig",
        gender: "male",
        level: 12,
        heldItem: "Oran Berry",
        ability: "Overgrow",
      }),
    ]);

    const row = screen.getByRole("listitem");
    expect(within(row).getByText("“Sprig”")).toBeInTheDocument();
    expect(within(row).getByText("Chikorita · ♂ · L12")).toBeInTheDocument();
    expect(within(row).getByText("Oran Berry · Overgrow")).toBeInTheDocument();
  });

  it("shows an old typed ability and a PokéAPI name the same way", () => {
    renderList([
      makeMon({ id: "a", ability: "Water Absorb" }),
      makeMon({ id: "b", ability: "water-absorb" }),
    ]);

    expect(screen.getAllByText("no item · Water Absorb")).toHaveLength(2);
  });

  it("shows an old typed item and a PokéAPI name the same way", () => {
    renderList([
      makeMon({ id: "a", heldItem: "Miracle Seed" }),
      makeMon({ id: "b", heldItem: "miracle-seed" }),
    ]);

    expect(screen.getAllByText("Miracle Seed")).toHaveLength(2);
  });

  it("falls back to the species name and drops missing parts", () => {
    renderList([makeMon()]);

    const row = screen.getByRole("listitem");
    expect(within(row).getAllByText("Chikorita")).toHaveLength(1);
    expect(within(row).getByText("Chikorita · L5")).toBeInTheDocument();
    expect(within(row).getByText("no item")).toBeInTheDocument();
  });
});
