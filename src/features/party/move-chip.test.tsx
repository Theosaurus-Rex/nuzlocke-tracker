import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { defaultPokeApiRoutes, stubPokeApi, STUB_NETWORK_ERROR } from "@/test/pokeapi-fetch";

import { MoveChip } from "./move-chip";

function renderChip(name: string, generation: number) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MoveChip name={name} generation={generation} />
    </QueryClientProvider>,
  );
}

function circle(container: HTMLElement): Element {
  const found = container.querySelector("[aria-hidden='true']");
  if (found === null) throw new Error("no type circle rendered");
  return found;
}

describe("MoveChip", () => {
  it("colours Charm as Normal in a gen 4 run", async () => {
    stubPokeApi(defaultPokeApiRoutes);
    const { container } = renderChip("charm", 4);
    await waitFor(() => expect(circle(container)).toHaveClass("bg-type-normal"));
    expect(circle(container)).not.toHaveClass("bg-type-fairy");
  });

  it("colours Charm as Fairy in a gen 6 run", async () => {
    stubPokeApi(defaultPokeApiRoutes);
    const { container } = renderChip("charm", 6);
    await waitFor(() => expect(circle(container)).toHaveClass("bg-type-fairy"));
  });

  it("shows the move's display name", () => {
    stubPokeApi(defaultPokeApiRoutes);
    renderChip("vine-whip", 4);
    expect(screen.getByText("Vine Whip")).toBeInTheDocument();
  });

  it("keeps the name and a neutral circle when the fetch fails", async () => {
    const fetchMock = stubPokeApi({
      ...defaultPokeApiRoutes,
      "/move/vine-whip": STUB_NETWORK_ERROR,
    });
    const { container } = renderChip("vine-whip", 4);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(circle(container)).toHaveClass("bg-background"));
    expect(circle(container).className).not.toMatch(/bg-type-/);
    expect(screen.getByText("Vine Whip")).toBeInTheDocument();
  });
});
