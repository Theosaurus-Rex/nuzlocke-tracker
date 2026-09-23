import { useQuery, type QueryClient } from "@tanstack/react-query";

import { fetchJson, PokeApiError } from "./client";
import {
  toMove,
  toMoveIndex,
  toSpecies,
  toSpeciesIndex,
  type RawIndex,
  type RawMove,
  type RawPokemon,
} from "./map";

const MAX_RETRIES = 2;

export function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof PokeApiError && error.status === 404) return false;
  return failureCount < MAX_RETRIES;
}

export function configurePokeApiQueries(client: QueryClient): void {
  client.setQueryDefaults(["pokeapi"], {
    staleTime: Infinity,
    gcTime: Infinity,
    retry: shouldRetry,
    // Offline would otherwise leave these paused with isPending true forever.
    networkMode: "always",
  });
}

export function useSpeciesIndex() {
  return useQuery({
    queryKey: ["pokeapi", "species-index"],
    queryFn: async () => toSpeciesIndex(await fetchJson<RawIndex>("/pokemon?limit=100000")),
  });
}

export function useSpecies(name: string | null) {
  return useQuery({
    queryKey: ["pokeapi", "species", name],
    queryFn: async () =>
      toSpecies(await fetchJson<RawPokemon>(`/pokemon/${encodeURIComponent(name ?? "")}`)),
    enabled: name !== null && name !== "",
  });
}

export function useMoveIndex() {
  return useQuery({
    queryKey: ["pokeapi", "move-index"],
    queryFn: async () => toMoveIndex(await fetchJson<RawIndex>("/move?limit=100000")),
  });
}

export function useMove(name: string | null) {
  return useQuery({
    queryKey: ["pokeapi", "move", name],
    queryFn: async () =>
      toMove(await fetchJson<RawMove>(`/move/${encodeURIComponent(name ?? "")}`)),
    enabled: name !== null && name !== "",
  });
}
