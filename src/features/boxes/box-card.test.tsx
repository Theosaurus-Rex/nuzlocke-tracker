import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Mon } from "@/domain/types";
import { defaultPokeApiRoutes, stubPokeApi } from "@/test/pokeapi-fetch";

import { BoxCard } from "./box-card";

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

function renderCard(mon: Mon, onEdit: () => void = vi.fn()) {
  stubPokeApi(defaultPokeApiRoutes);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ul>
        <BoxCard mon={mon} generation={4} onEdit={onEdit} />
      </ul>
    </QueryClientProvider>,
  );
}

describe("BoxCard", () => {
  it("quotes the nickname as the title", () => {
    renderCard(makeMon({ nickname: "Sprig" }));
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("“Sprig”");
  });

  it("falls back to the species name when there is no nickname", () => {
    renderCard(makeMon({ nickname: null }));
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Chikorita");
  });

  it("shows species, gender, level and nature on the muted line", () => {
    renderCard(makeMon({ gender: "male", level: 18, nature: "Jolly" }));
    expect(screen.getByText(/Chikorita · ♂ · L18/)).toHaveTextContent(
      "Chikorita · ♂ · L18 · Jolly",
    );
  });

  it("omits the nature separator when there is no nature", () => {
    renderCard(makeMon({ level: 9, nature: null }));
    expect(screen.getByText(/L9/)).toHaveTextContent(/^Chikorita · L9$/);
  });

  it("says no item when nothing is held", async () => {
    renderCard(makeMon({ heldItem: null, ability: "Overgrow" }));
    const item = await screen.findByText("no item");
    expect(item.closest("p")?.textContent).toBe("no item · Overgrow");
  });

  it("shows the held item and ability when present", async () => {
    renderCard(makeMon({ heldItem: "Miracle Seed", ability: "Chlorophyll" }));
    const item = await screen.findByText("Miracle Seed");
    expect(item.closest("p")?.textContent).toBe("Miracle Seed · Chlorophyll");
  });

  it("shows only the item when there is no ability", async () => {
    renderCard(makeMon({ heldItem: "Magnet", ability: null }));
    const item = await screen.findByText("Magnet");
    expect(item.closest("p")?.textContent).toBe("Magnet");
  });

  it("is one button named for the nickname that calls onEdit", async () => {
    const onEdit = vi.fn();
    renderCard(makeMon({ nickname: "Sprig" }), onEdit);

    await userEvent.click(screen.getByRole("button", { name: "Edit “Sprig”" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("names the button for the species when there is no nickname", () => {
    renderCard(makeMon({ nickname: null, speciesId: "chikorita" }));

    expect(screen.getByRole("button", { name: "Edit Chikorita" })).toBeInTheDocument();
  });
});
