import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Mon } from "@/domain/types";
import { defaultPokeApiRoutes, stubPokeApi } from "@/test/pokeapi-fetch";

import { PartyCard } from "./party-card";

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
    status: "party",
    partySlot: 0,
    boxOrder: null,
    caughtRouteId: null,
    shiny: false,
    ...overrides,
  };
}

function renderCard(mon: Mon, routeName: string | null = null) {
  stubPokeApi(defaultPokeApiRoutes);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ul>
        <PartyCard mon={mon} routeName={routeName} generation={4} />
      </ul>
    </QueryClientProvider>,
  );
}

describe("PartyCard", () => {
  it("shows every detail of a fully filled-in mon", () => {
    renderCard(
      makeMon({
        nickname: "Leafy",
        gender: "female",
        level: 22,
        nature: "Adamant",
        ability: "Overgrow",
        heldItem: "Miracle Seed",
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
    renderCard(makeMon());
    expect(screen.getByRole("heading", { name: "Chikorita" })).toBeInTheDocument();
  });

  it("leaves out missing details without stray separators", () => {
    renderCard(makeMon());
    expect(screen.getByText("Chikorita · L5")).toBeInTheDocument();
    expect(screen.getByText("no item")).toBeInTheDocument();
    expect(screen.queryByText(/·\s*·|·\s*$|^\s*·/)).not.toBeInTheDocument();
  });

  it("shows the caught route even when item and ability are missing", () => {
    renderCard(makeMon(), "Route 46");
    expect(screen.getByText("no item").closest("p")?.textContent).toBe("no item · Route 46");
  });
});
