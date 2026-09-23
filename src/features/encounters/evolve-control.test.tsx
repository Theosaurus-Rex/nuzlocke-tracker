import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { configurePokeApiQueries } from "@/game/pokeapi/queries";
import type { RawIndex } from "@/game/pokeapi/map";
import {
  defaultPokeApiRoutes,
  STUB_NETWORK_ERROR,
  STUB_PENDING,
  stubPokeApi,
  stubStatus,
} from "@/test/pokeapi-fetch";
import { evolutionSpeciesIndexRefs, speciesIndexFixture } from "@/test/pokeapi-fixtures";

import { EvolveControl } from "./evolve-control";

const extendedSpeciesIndex: RawIndex = {
  results: [...speciesIndexFixture.results, ...evolutionSpeciesIndexRefs],
};

function stubWithEvolutions(overrides: Record<string, unknown> = {}) {
  return stubPokeApi({
    ...defaultPokeApiRoutes,
    "/pokemon?limit=100000": extendedSpeciesIndex,
    ...overrides,
  });
}

function testClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

async function findMenuTrigger() {
  return waitFor(() => {
    const button = screen.getByRole("button", { name: "Evolve" });
    expect(button).toHaveAttribute("aria-haspopup", "menu");
    return button;
  });
}

function renderControl(
  props: Partial<Parameters<typeof EvolveControl>[0]> = {},
  client: QueryClient = testClient(),
) {
  const onEvolve = vi.fn();
  const onPickAny = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <EvolveControl
        id="evolve"
        speciesId="bellsprout"
        randomised={false}
        onEvolve={onEvolve}
        onPickAny={onPickAny}
        {...props}
      />
    </QueryClientProvider>,
  );
  return { onEvolve, onPickAny };
}

describe("EvolveControl", () => {
  it("offers the single next stage for a linear chain", async () => {
    stubWithEvolutions();
    const { onEvolve } = renderControl({ speciesId: "bellsprout" });
    const user = userEvent.setup();

    await user.click(await findMenuTrigger());
    const item = await screen.findByRole("menuitem", { name: "Weepinbell" });

    await user.click(item);
    expect(onEvolve).toHaveBeenCalledWith("weepinbell");
  });

  it("offers every branch of a fork", async () => {
    stubWithEvolutions();
    renderControl({ speciesId: "gloom" });
    const user = userEvent.setup();

    await user.click(await findMenuTrigger());
    expect(await screen.findByRole("menuitem", { name: "Vileplume" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Bellossom" })).toBeInTheDocument();
  });

  it("renders no Evolve button for a final stage, once loading has settled", async () => {
    stubWithEvolutions();
    renderControl({ speciesId: "victreebel" });

    expect(screen.getByRole("button", { name: "Evolve" })).toBeDisabled();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Evolve" })).not.toBeInTheDocument(),
    );
  });

  it("renders no Evolve button for a species with no evolution chain, once loading has settled", async () => {
    stubWithEvolutions({
      "/pokemon-species/35": { id: 35, name: "clefairy", evolution_chain: null },
    });
    renderControl({ speciesId: "clefairy" });

    expect(screen.getByRole("button", { name: "Evolve" })).toBeDisabled();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Evolve" })).not.toBeInTheDocument(),
    );
  });

  it("calls onPickAny and fetches no species chain when randomised", async () => {
    const fetchMock = stubWithEvolutions();
    const { onPickAny } = renderControl({ speciesId: "bellsprout", randomised: true });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Evolve" }));
    expect(onPickAny).toHaveBeenCalled();

    const urls = fetchMock.mock.calls.map(([input]) =>
      input instanceof Request ? input.url : String(input),
    );
    expect(urls.some((url) => url.includes("/pokemon-species"))).toBe(false);
  });

  it("shows the Evolve button disabled while loading", async () => {
    stubWithEvolutions({ "/pokemon-species/69": STUB_PENDING });
    renderControl({ speciesId: "bellsprout" });

    const button = await screen.findByRole("button", { name: "Evolve" });
    expect(button).toBeDisabled();
  });

  it("shows the failure notice on a PokéAPI error", async () => {
    stubWithEvolutions({ "/pokemon-species/69": stubStatus(500) });
    renderControl({ speciesId: "bellsprout" });

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't reach PokéAPI.");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows the failure notice when the browser is offline", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    onlineManager.setOnline(false);
    try {
      stubWithEvolutions({ "/pokemon?limit=100000": STUB_NETWORK_ERROR });
      const client = new QueryClient();
      configurePokeApiQueries(client);
      renderControl({ speciesId: "bellsprout" }, client);

      await vi.advanceTimersByTimeAsync(4000);

      expect(screen.getByRole("alert")).toHaveTextContent("Couldn't reach PokéAPI.");
    } finally {
      onlineManager.setOnline(true);
      vi.useRealTimers();
    }
  });
});
