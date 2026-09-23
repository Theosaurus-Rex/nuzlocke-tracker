import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  defaultPokeApiRoutes,
  STUB_NETWORK_ERROR,
  stubPokeApi,
  stubStatus,
} from "@/test/pokeapi-fetch";
import { evolutionSpeciesIndexRefs, speciesIndexFixture } from "@/test/pokeapi-fixtures";

import { PokeApiError } from "./client";
import type { RawIndex } from "./map";
import {
  configurePokeApiQueries,
  shouldRetry,
  useMove,
  useMoveIndex,
  useNextEvolutions,
  useSpecies,
  useSpeciesIndex,
} from "./queries";

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

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function testClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

describe("shouldRetry", () => {
  it("never retries a 404", () => {
    expect(shouldRetry(0, new PokeApiError(404, "/pokemon/x"))).toBe(false);
  });

  it("retries other failures twice", () => {
    const error = new PokeApiError("network", "/pokemon/x");
    expect(shouldRetry(0, error)).toBe(true);
    expect(shouldRetry(1, error)).toBe(true);
    expect(shouldRetry(2, error)).toBe(false);
  });
});

describe("configurePokeApiQueries", () => {
  it("caches PokéAPI queries forever and uses shouldRetry", () => {
    const client = new QueryClient();
    configurePokeApiQueries(client);
    expect(client.getQueryDefaults(["pokeapi", "species", "pidgey"])).toMatchObject({
      staleTime: Infinity,
      gcTime: Infinity,
      retry: shouldRetry,
    });
  });

  it("leaves other queries alone", () => {
    const client = new QueryClient();
    configurePokeApiQueries(client);
    expect(client.getQueryDefaults(["runs"]).staleTime).toBeUndefined();
  });
});

describe("hooks", () => {
  it("loads the species index without alternate forms", async () => {
    stubPokeApi(defaultPokeApiRoutes);
    const { result } = renderHook(() => useSpeciesIndex(), { wrapper: wrapper(testClient()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.some((e) => e.name === "venusaur-mega")).toBe(false);
  });

  it("loads the move index sorted by id", async () => {
    stubPokeApi(defaultPokeApiRoutes);
    const { result } = renderHook(() => useMoveIndex(), { wrapper: wrapper(testClient()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((e) => e.id)).toEqual([22, 33, 204, 450]);
    expect(result.current.data?.some((e) => e.name === "vine-whip")).toBe(true);
  });

  it("loads one species by name", async () => {
    stubPokeApi(defaultPokeApiRoutes);
    const { result } = renderHook(() => useSpecies("clefairy"), { wrapper: wrapper(testClient()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pastTypes).toEqual([{ throughGeneration: 5, types: ["normal"] }]);
  });

  it("fetches nothing for an empty name", () => {
    const fetchMock = stubPokeApi(defaultPokeApiRoutes);
    renderHook(() => useSpecies(null), { wrapper: wrapper(testClient()) });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads one move by name", async () => {
    stubPokeApi(defaultPokeApiRoutes);
    const { result } = renderHook(() => useMove("vine-whip"), { wrapper: wrapper(testClient()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.power).toBe(45);
  });

  it("surfaces a 404 as an error", async () => {
    stubPokeApi({});
    const { result } = renderHook(() => useSpecies("missingno"), {
      wrapper: wrapper(testClient()),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as PokeApiError).status).toBe(404);
  });

  it("errors instead of hanging pending when the browser is offline", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    onlineManager.setOnline(false);
    try {
      stubPokeApi({ "/pokemon?limit=100000": STUB_NETWORK_ERROR });
      const client = new QueryClient();
      configurePokeApiQueries(client);
      const { result } = renderHook(() => useSpeciesIndex(), { wrapper: wrapper(client) });

      await vi.advanceTimersByTimeAsync(4000);

      expect(result.current.isError).toBe(true);
      expect((result.current.error as PokeApiError).status).toBe("network");
    } finally {
      onlineManager.setOnline(true);
      vi.useRealTimers();
    }
  });

  it("returns the next stages by name", async () => {
    stubWithEvolutions();
    const { result } = renderHook(() => useNextEvolutions("gloom"), {
      wrapper: wrapper(testClient()),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data).toEqual([
      { id: 45, name: "vileplume" },
      { id: 182, name: "bellossom" },
    ]);
  });

  it("drops a next stage missing from the species index", async () => {
    stubWithEvolutions();
    const { result } = renderHook(() => useNextEvolutions("eevee"), {
      wrapper: wrapper(testClient()),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data).toEqual([
      { id: 134, name: "vaporeon" },
      { id: 135, name: "jolteon" },
      { id: 136, name: "flareon" },
    ]);
  });

  it("is empty for a final stage", async () => {
    stubWithEvolutions();
    const { result } = renderHook(() => useNextEvolutions("victreebel"), {
      wrapper: wrapper(testClient()),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data).toEqual([]);
  });

  it("is empty, not pending, for a name the index does not know", async () => {
    stubWithEvolutions();
    const { result } = renderHook(() => useNextEvolutions("missingno"), {
      wrapper: wrapper(testClient()),
    });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual([]);
    expect(result.current.isPending).toBe(false);
  });

  it("fetches nothing without a species", () => {
    const fetchMock = stubWithEvolutions();
    renderHook(() => useNextEvolutions(null), { wrapper: wrapper(testClient()) });
    const urls = fetchMock.mock.calls.map(([input]) =>
      input instanceof Request ? input.url : String(input),
    );
    expect(urls.some((url) => url.includes("/pokemon-species"))).toBe(false);
  });

  it("reports failure", async () => {
    stubWithEvolutions({ "/pokemon-species/44": stubStatus(500) });
    const { result } = renderHook(() => useNextEvolutions("gloom"), {
      wrapper: wrapper(testClient()),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
