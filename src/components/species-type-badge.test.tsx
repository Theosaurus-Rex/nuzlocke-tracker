import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { STUB_PENDING, stubPokeApi, stubStatus } from "@/test/pokeapi-fetch";

import { SpeciesTypeBadge } from "./species-type-badge";

function renderBadge(speciesId: string | null, generation: number) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SpeciesTypeBadge speciesId={speciesId} generation={generation} />
    </QueryClientProvider>,
  );
}

describe("SpeciesTypeBadge", () => {
  it("shows Clefairy as Normal in a gen 4 run", async () => {
    renderBadge("clefairy", 4);
    expect(await screen.findByText("normal")).toBeInTheDocument();
  });

  it("shows Clefairy as Fairy in a gen 6 run", async () => {
    renderBadge("clefairy", 6);
    expect(await screen.findByText("fairy")).toBeInTheDocument();
  });

  it("shows only the primary type", async () => {
    renderBadge("gyarados", 4);
    expect(await screen.findByText("water")).toBeInTheDocument();
    expect(screen.queryByText("flying")).not.toBeInTheDocument();
  });

  it("renders nothing without a species", () => {
    const { container } = renderBadge(null, 4);
    expect(container).toBeEmptyDOMElement();
  });

  it("holds the space with a hidden placeholder while loading", () => {
    stubPokeApi({ "/pokemon/clefairy": STUB_PENDING });
    const { container } = renderBadge("clefairy", 4);
    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull();
  });

  it("renders nothing when PokéAPI fails", async () => {
    stubPokeApi({ "/pokemon/clefairy": stubStatus(500) });
    const { container } = renderBadge("clefairy", 4);
    await waitFor(() => expect(container.querySelector("[aria-hidden='true']")).toBeNull());
    expect(screen.queryByText("normal")).not.toBeInTheDocument();
  });
});
