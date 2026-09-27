import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { defaultPokeApiRoutes, stubPokeApi, STUB_NETWORK_ERROR } from "@/test/pokeapi-fetch";

import { SpeciesSprite, type SpeciesSpriteVariant } from "./species-sprite";

function renderSprite(
  speciesId: string | null,
  options: { shiny?: boolean; variant?: SpeciesSpriteVariant } = {},
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <SpeciesSprite
        speciesId={speciesId}
        shiny={options.shiny ?? false}
        size={40}
        variant={options.variant}
      />
    </QueryClientProvider>,
  );
  return { ...view, client };
}

async function findImg(container: HTMLElement): Promise<HTMLImageElement> {
  return waitFor(() => {
    const img = container.querySelector("img");
    if (img === null) throw new Error("no sprite image yet");
    return img;
  });
}

function placeholder(container: HTMLElement): Element | null {
  return container.querySelector('[data-sprite="placeholder"]');
}

async function settled(client: QueryClient, name: string, status: "success" | "error") {
  await waitFor(() =>
    expect(client.getQueryState(["pokeapi", "species", name])?.status).toBe(status),
  );
}

describe("SpeciesSprite", () => {
  it("shows the still sprite", async () => {
    const { container } = renderSprite("chikorita");
    const img = await findImg(container);
    expect(img).toHaveAttribute("src", "https://sprites.test/still/152.png");
    expect(img).toHaveAttribute("alt", "");
  });

  it("shows the shiny sprite for a shiny mon", async () => {
    const { container } = renderSprite("chikorita", { shiny: true });
    expect(await findImg(container)).toHaveAttribute(
      "src",
      "https://sprites.test/still/shiny/152.png",
    );
  });

  it("falls back to the normal sprite for a shiny mon with no shiny sprite", async () => {
    const { container } = renderSprite("pidgey", { shiny: true });
    expect(await findImg(container)).toHaveAttribute("src", "https://sprites.test/still/16.png");
  });

  it("shows the placeholder when the species has no sprites", async () => {
    const { container, client } = renderSprite("geodude");
    await settled(client, "geodude", "success");
    expect(placeholder(container)).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("shows the placeholder when the species fetch fails", async () => {
    stubPokeApi({ ...defaultPokeApiRoutes, "/pokemon/chikorita": STUB_NETWORK_ERROR });
    const { container, client } = renderSprite("chikorita");
    await settled(client, "chikorita", "error");
    expect(placeholder(container)).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("swaps to the placeholder when the sprite fails to load", async () => {
    const { container } = renderSprite("chikorita");
    fireEvent.error(await findImg(container));
    expect(placeholder(container)).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("shows the placeholder with no species", () => {
    const { container } = renderSprite(null);
    expect(placeholder(container)).not.toBeNull();
  });

  describe("as an icon", () => {
    it("shows the box icon", async () => {
      const { container } = renderSprite("chikorita", { variant: "icon" });
      expect(await findImg(container)).toHaveAttribute("src", "https://sprites.test/icon/152.png");
    });

    it("shows the same icon for a shiny mon", async () => {
      const { container } = renderSprite("chikorita", { shiny: true, variant: "icon" });
      expect(await findImg(container)).toHaveAttribute("src", "https://sprites.test/icon/152.png");
    });

    it("falls back to the still sprite when there is no icon", async () => {
      const { container } = renderSprite("clefairy", { variant: "icon" });
      expect(await findImg(container)).toHaveAttribute("src", "https://sprites.test/still/35.png");
    });

    it("falls back to the still sprite when the icon fails to load", async () => {
      const { container } = renderSprite("chikorita", { variant: "icon" });
      fireEvent.error(await findImg(container));
      expect(container.querySelector("img")).toHaveAttribute(
        "src",
        "https://sprites.test/still/152.png",
      );
    });

    it("swaps to the placeholder when the icon and the sprite both fail", async () => {
      const { container } = renderSprite("chikorita", { variant: "icon" });
      fireEvent.error(await findImg(container));
      fireEvent.error(await findImg(container));
      expect(placeholder(container)).not.toBeNull();
    });
  });
});
