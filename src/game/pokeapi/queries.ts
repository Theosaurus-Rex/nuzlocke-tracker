import { useQuery, type QueryClient } from "@tanstack/react-query";

import { fetchJson, PokeApiError } from "./client";
import {
  idFromUrl,
  nextStages,
  toMove,
  toMoveIndex,
  toSpecies,
  toSpeciesIndex,
  type RawEvolutionChain,
  type RawIndex,
  type RawMove,
  type RawPokemon,
  type RawPokemonSpecies,
} from "./map";
import type { IndexEntry } from "./model";
import { findByName } from "./resolve";

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

export interface NextEvolutions {
  data: IndexEntry[] | undefined;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => unknown;
}

export function useNextEvolutions(speciesName: string | null): NextEvolutions {
  const index = useSpeciesIndex();
  const entries = index.data;
  const id =
    entries === undefined || speciesName === null
      ? null
      : (findByName(entries, speciesName)?.id ?? null);

  const chain = useQuery({
    queryKey: ["pokeapi", "evolutions", id],
    queryFn: async () => {
      const species = await fetchJson<RawPokemonSpecies>(`/pokemon-species/${String(id)}`);
      if (species.evolution_chain === null) return [];
      const chainId = idFromUrl(species.evolution_chain.url);
      const raw = await fetchJson<RawEvolutionChain>(`/evolution-chain/${String(chainId)}`);
      return nextStages(raw, species.id);
    },
    enabled: id !== null,
  });

  if (index.isError) {
    return {
      data: undefined,
      isPending: false,
      isFetching: index.isFetching,
      isError: true,
      refetch: () => index.refetch(),
    };
  }
  if (entries === undefined) {
    return {
      data: undefined,
      isPending: true,
      isFetching: index.isFetching,
      isError: false,
      refetch: () => index.refetch(),
    };
  }
  if (id === null) {
    return {
      data: [],
      isPending: false,
      isFetching: false,
      isError: false,
      refetch: () => undefined,
    };
  }
  if (chain.isError) {
    return {
      data: undefined,
      isPending: false,
      isFetching: chain.isFetching,
      isError: true,
      refetch: () => chain.refetch(),
    };
  }
  if (chain.data === undefined) {
    return {
      data: undefined,
      isPending: true,
      isFetching: chain.isFetching,
      isError: false,
      refetch: () => chain.refetch(),
    };
  }

  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return {
    data: chain.data.flatMap((stageId) => {
      const entry = byId.get(stageId);
      return entry === undefined ? [] : [entry];
    }),
    isPending: false,
    isFetching: chain.isFetching,
    isError: false,
    refetch: () => chain.refetch(),
  };
}
