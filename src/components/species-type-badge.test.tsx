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

// The loading placeholder's stand-in text is "normal", same as a real Normal-type badge.
async function waitForBadgeToSettle(container: HTMLElement): Promise<void> {
  await waitFor(() => expect(container.querySelector("[aria-hidden='true']")).toBeNull());
}

describe("SpeciesTypeBadge", () => {
  it("shows Clefairy as Normal in a gen 4 run", async () => {
    const { container } = renderBadge("clefairy", 4);
    await waitForBadgeToSettle(container);
    expect(screen.getByText("normal")).toBeInTheDocument();
  });

  it("shows Clefairy as Fairy in a gen 6 run", async () => {
    const { container } = renderBadge("clefairy", 6);
    await waitForBadgeToSettle(container);
    expect(screen.getByText("fairy")).toBeInTheDocument();
  });

  it("shows both types of a dual-type species, in slot order", async () => {
    const { container } = renderBadge("victreebel", 4);
    await waitForBadgeToSettle(container);
    const badges = screen.getAllByText(/grass|poison/);
    expect(badges.map((badge) => badge.textContent)).toEqual(["grass", "poison"]);
  });

  it("shows a single-type species as one badge", async () => {
    const { container } = renderBadge("chikorita", 4);
    await waitForBadgeToSettle(container);
    expect(screen.getByText("grass")).toBeInTheDocument();
  });

  it("drops a type the species did not yet have in an earlier generation", async () => {
    const { container } = renderBadge("jigglypuff", 4);
    await waitForBadgeToSettle(container);
    expect(screen.getByText("normal")).toBeInTheDocument();
    expect(screen.queryByText("fairy")).not.toBeInTheDocument();
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
