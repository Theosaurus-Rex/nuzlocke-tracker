import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Mon } from "@/domain/types";
import { defaultPokeApiRoutes, stubPokeApi } from "@/test/pokeapi-fetch";
import { makeMon } from "@/test/factories";

import { PartyCard } from "./party-card";

const CHIKORITA = { speciesId: "chikorita", speciesIdCaught: "chikorita" };

function renderCard(
  mon: Mon,
  routeName: string | null = null,
  onEdit: () => void = vi.fn(),
  cap: number | null = null,
) {
  stubPokeApi(defaultPokeApiRoutes);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ul>
        <PartyCard mon={mon} routeName={routeName} generation={4} cap={cap} onEdit={onEdit} />
      </ul>
    </QueryClientProvider>,
  );
}

describe("PartyCard", () => {
  it("shows the mon's sprite", async () => {
    const { container } = renderCard(makeMon(CHIKORITA));
    await waitFor(() =>
      expect(
        container.querySelector('img[src="https://sprites.test/still/152.png"]'),
      ).not.toBeNull(),
    );
  });

  it("shows no sprite placeholder when the species has no sprite", async () => {
    const { container } = renderCard(makeMon({ speciesId: "geodude", speciesIdCaught: "geodude" }));
    await screen.findByText("rock");
    expect(container.querySelector('[data-sprite="placeholder"]')).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("shows the shiny sprite for a shiny mon", async () => {
    const { container } = renderCard(makeMon({ ...CHIKORITA, shiny: true }));
    await waitFor(() =>
      expect(
        container.querySelector('img[src="https://sprites.test/still/shiny/152.png"]'),
      ).not.toBeNull(),
    );
  });

  it("shows every detail of a fully filled-in mon", () => {
    renderCard(
      makeMon({
        ...CHIKORITA,
        nickname: "Leafy",
        gender: "female",
        level: 22,
        nature: "Adamant",
        ability: "overgrow",
        heldItem: "miracle-seed",
        moves: ["vine-whip", "tackle"],
      }),
      "Route 29",
    );
    expect(screen.getByRole("heading", { name: "“Leafy”" })).toBeInTheDocument();
    expect(screen.getByText("Chikorita · ♀ · L22 · Adamant")).toBeInTheDocument();
    expect(screen.getByText("Vine Whip")).toBeInTheDocument();
    expect(screen.getByText("Tackle")).toBeInTheDocument();
    expect(screen.getByText("Miracle Seed").closest("p")?.textContent).toBe(
      "Miracle Seed · Overgrow · Route 29",
    );
  });

  it("falls back to the species name, unquoted, with no nickname", () => {
    renderCard(makeMon(CHIKORITA));
    expect(screen.getByRole("heading", { name: "Chikorita" })).toBeInTheDocument();
  });

  it("leaves out missing details without stray separators", () => {
    renderCard(makeMon({ ...CHIKORITA, level: 5 }));
    expect(screen.getByText("Chikorita · L5")).toBeInTheDocument();
    expect(screen.getByText("no item")).toBeInTheDocument();
    expect(screen.queryByText(/·\s*·|·\s*$|^\s*·/)).not.toBeInTheDocument();
  });

  it("shows the caught route even when item and ability are missing", () => {
    renderCard(makeMon(CHIKORITA), "Route 46");
    expect(screen.getByText("no item").closest("p")?.textContent).toBe("no item · Route 46");
  });

  it("is one button named for the nickname that calls onEdit", async () => {
    const onEdit = vi.fn();
    renderCard(makeMon({ ...CHIKORITA, nickname: "Sprig" }), null, onEdit);

    await userEvent.click(screen.getByRole("button", { name: "Edit “Sprig”" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("names the button for the species when there is no nickname", () => {
    renderCard(makeMon({ ...CHIKORITA, nickname: null, speciesId: "chikorita" }));

    expect(screen.getByRole("button", { name: "Edit Chikorita" })).toBeInTheDocument();
  });

  it("shows the held item sprite before the item name, and none for no item", () => {
    const { container, unmount } = renderCard(makeMon({ ...CHIKORITA, heldItem: "miracle-seed" }));
    expect(
      container.querySelector(
        'img[src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/miracle-seed.png"]',
      ),
    ).not.toBeNull();
    unmount();

    const empty = renderCard(makeMon(CHIKORITA));
    expect(empty.container.querySelector('img[src*="/items/"]')).toBeNull();
  });

  it("tags a mon above the cap", () => {
    renderCard(makeMon({ ...CHIKORITA, level: 31 }), null, vi.fn(), 30);

    expect(screen.getByText("Over cap L30")).toBeInTheDocument();
  });

  it("does not tag a mon at the cap, below it, or with no cap", () => {
    const { unmount } = renderCard(makeMon({ ...CHIKORITA, level: 30 }), null, vi.fn(), 30);
    expect(screen.queryByText(/over cap/i)).toBeNull();
    unmount();

    const below = renderCard(makeMon({ ...CHIKORITA, level: 12 }), null, vi.fn(), 30);
    expect(screen.queryByText(/over cap/i)).toBeNull();
    below.unmount();

    renderCard(makeMon({ ...CHIKORITA, level: 99 }));
    expect(screen.queryByText(/over cap/i)).toBeNull();
  });
});
