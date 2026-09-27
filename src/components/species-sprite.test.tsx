import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { defaultPokeApiRoutes, stubPokeApi, STUB_NETWORK_ERROR } from "@/test/pokeapi-fetch";

import { SpeciesSprite } from "./species-sprite";

function renderSprite(speciesId: string | null, shiny = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <SpeciesSprite speciesId={speciesId} shiny={shiny} size={40} />
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

function reducedMotionSource(container: HTMLElement): Element | null {
  return container.querySelector('source[media="(prefers-reduced-motion: reduce)"]');
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
  it("shows the animated sprite with the still one for reduced motion", async () => {
    const { container } = renderSprite("chikorita");
    const img = await findImg(container);
    expect(img).toHaveAttribute("src", "https://sprites.test/showdown/152.gif");
    expect(img).toHaveAttribute("alt", "");
    expect(reducedMotionSource(container)).toHaveAttribute(
      "srcset",
      "https://sprites.test/still/152.png",
    );
  });

  it("uses the shiny pair for a shiny mon", async () => {
    const { container } = renderSprite("chikorita", true);
    const img = await findImg(container);
    expect(img).toHaveAttribute("src", "https://sprites.test/showdown/shiny/152.gif");
    expect(reducedMotionSource(container)).toHaveAttribute(
      "srcset",
      "https://sprites.test/still/shiny/152.png",
    );
  });

  it("falls back to the still sprite when there is no animated one", async () => {
    const { container } = renderSprite("clefairy");
    const img = await findImg(container);
    expect(img).toHaveAttribute("src", "https://sprites.test/still/35.png");
  });

  it("has no reduced-motion source when there is no still sprite", async () => {
    const { container } = renderSprite("pidgey");
    const img = await findImg(container);
    expect(img).toHaveAttribute("src", "https://sprites.test/showdown/16.gif");
    expect(reducedMotionSource(container)).toBeNull();
  });

  it("falls back to the normal sprite for a shiny mon with no shiny sprites", async () => {
    const { container } = renderSprite("pidgey", true);
    const img = await findImg(container);
    expect(img).toHaveAttribute("src", "https://sprites.test/showdown/16.gif");
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

  it("falls back to the still sprite when the animated one fails to load", async () => {
    const { container } = renderSprite("chikorita");
    fireEvent.error(await findImg(container));
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://sprites.test/still/152.png",
    );
  });

  it("swaps to the placeholder when every sprite fails to load", async () => {
    const { container } = renderSprite("chikorita");
    fireEvent.error(await findImg(container));
    fireEvent.error(await findImg(container));
    expect(placeholder(container)).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("swaps to the placeholder when a still-only sprite fails to load", async () => {
    const { container } = renderSprite("clefairy");
    fireEvent.error(await findImg(container));
    expect(placeholder(container)).not.toBeNull();
  });

  it("shows the placeholder with no species", () => {
    const { container } = renderSprite(null);
    expect(placeholder(container)).not.toBeNull();
  });
});
