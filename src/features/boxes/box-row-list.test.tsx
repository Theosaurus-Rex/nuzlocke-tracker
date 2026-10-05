import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Mon } from "@/domain/types";
import { defaultPokeApiRoutes, stubPokeApi } from "@/test/pokeapi-fetch";
import { makeMon } from "@/test/factories";

import { BoxRowList } from "./box-row-list";

const CHIKORITA = { speciesId: "chikorita", speciesIdCaught: "chikorita" };

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
      [
        makeMon({ ...CHIKORITA, id: "a", nickname: "Sprig" }),
        makeMon({ ...CHIKORITA, id: "b", nickname: null }),
      ],
      onEdit,
    );

    await userEvent.click(screen.getByRole("button", { name: "Edit Chikorita" }));

    expect(onEdit).toHaveBeenCalledWith("b");
  });

  it("renders one row per mon", () => {
    renderList([makeMon({ ...CHIKORITA, id: "a" }), makeMon({ ...CHIKORITA, id: "b" })]);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("shows the nickname in quotes, then species, gender and level, then item and ability", () => {
    renderList([
      makeMon({
        ...CHIKORITA,
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
      makeMon({ ...CHIKORITA, id: "a", ability: "Water Absorb" }),
      makeMon({ ...CHIKORITA, id: "b", ability: "water-absorb" }),
    ]);

    expect(screen.getAllByText("no item · Water Absorb")).toHaveLength(2);
  });

  it("shows an old typed item and a PokéAPI name the same way", () => {
    renderList([
      makeMon({ ...CHIKORITA, id: "a", heldItem: "Miracle Seed" }),
      makeMon({ ...CHIKORITA, id: "b", heldItem: "miracle-seed" }),
    ]);

    expect(screen.getAllByText("Miracle Seed")).toHaveLength(2);
  });

  it("falls back to the species name and drops missing parts", () => {
    renderList([makeMon({ ...CHIKORITA, level: 5 })]);

    const row = screen.getByRole("listitem");
    expect(within(row).getAllByText("Chikorita")).toHaveLength(1);
    expect(within(row).getByText("Chikorita · L5")).toBeInTheDocument();
    expect(within(row).getByText("no item")).toBeInTheDocument();
  });

  it("shows the held item sprite, and none for no item", () => {
    renderList([
      makeMon({ ...CHIKORITA, id: "a", heldItem: "miracle-seed" }),
      makeMon({ ...CHIKORITA, id: "b" }),
    ]);

    const [withItem, without] = screen.getAllByRole("listitem");
    expect(
      withItem!.querySelector(
        'img[src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/miracle-seed.png"]',
      ),
    ).not.toBeNull();
    expect(without!.querySelector('img[src*="/items/"]')).toBeNull();
  });
});
