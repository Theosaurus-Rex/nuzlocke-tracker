import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { defaultPokeApiRoutes, STUB_NETWORK_ERROR, stubPokeApi } from "@/test/pokeapi-fetch";

import { PokeApiError } from "./client";
import {
  configurePokeApiQueries,
  shouldRetry,
  useMove,
  useMoveIndex,
  useSpecies,
  useSpeciesIndex,
} from "./queries";

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
});
