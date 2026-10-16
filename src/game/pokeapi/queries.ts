import { useQueries, useQuery, type QueryClient } from "@tanstack/react-query";

import { fetchJson, PokeApiError } from "./client";
import { baseSpeciesId, expandNextStages } from "./forms";
import {
  evolutionLine,
  idFromUrl,
  nextStages,
  toAbilityIndex,
  toItemIndex,
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
import type { IndexEntry, Species } from "./model";
import { findByName, speciesDisplayName } from "./resolve";

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

function speciesQueryOptions(name: string | null) {
  return {
    queryKey: ["pokeapi", "species", name],
    queryFn: async () =>
      toSpecies(await fetchJson<RawPokemon>(`/pokemon/${encodeURIComponent(name ?? "")}`)),
    enabled: name !== null && name !== "",
  };
}

export function useSpecies(name: string | null) {
  return useQuery(speciesQueryOptions(name));
}

export function useSpeciesMany(names: readonly string[]): Map<string, Species> {
  const unique = [...new Set(names)];
  return useQueries({
    queries: unique.map((name) => speciesQueryOptions(name)),
    combine: (results) =>
      new Map(
        results.flatMap((result, i) => {
          const name = unique[i];
          return name !== undefined && result.data !== undefined
            ? [[name, result.data] as const]
            : [];
        }),
      ),
  });
}

export function useMoveIndex() {
  return useQuery({
    queryKey: ["pokeapi", "move-index"],
    queryFn: async () => toMoveIndex(await fetchJson<RawIndex>("/move?limit=100000")),
  });
}

export function useAbilityIndex() {
  return useQuery({
    queryKey: ["pokeapi", "ability-index"],
    queryFn: async () => toAbilityIndex(await fetchJson<RawIndex>("/ability?limit=100000")),
  });
}

export function useItemIndex() {
  return useQuery({
    queryKey: ["pokeapi", "item-index"],
    queryFn: async () => toItemIndex(await fetchJson<RawIndex>("/item?limit=100000")),
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

export function useEvolutionLine(speciesName: string | null): string[] | undefined {
  const index = useSpeciesIndex();
  const entries = index.data;
  const entry =
    entries === undefined || speciesName === null
      ? undefined
      : findByName(entries, speciesName, speciesDisplayName);
  const baseId =
    entries === undefined || entry === undefined ? null : (baseSpeciesId(entries, entry) ?? null);

  const line = useQuery({
    queryKey: ["pokeapi", "evolution-line", baseId],
    queryFn: async () => {
      const species = await fetchJson<RawPokemonSpecies>(`/pokemon-species/${String(baseId)}`);
      if (species.evolution_chain === null) return [species.id];
      const chainId = idFromUrl(species.evolution_chain.url);
      return evolutionLine(
        await fetchJson<RawEvolutionChain>(`/evolution-chain/${String(chainId)}`),
      );
    },
    enabled: baseId !== null,
  });

  if (entries === undefined || line.data === undefined) return undefined;
  const ids = new Set(line.data);
  return entries.flatMap((e) => {
    const id = baseSpeciesId(entries, e);
    return id !== undefined && ids.has(id) ? [e.name] : [];
  });
}

export function useNextEvolutions(speciesName: string | null): NextEvolutions {
  const index = useSpeciesIndex();
  const entries = index.data;
  const current =
    entries === undefined || speciesName === null
      ? undefined
      : findByName(entries, speciesName, speciesDisplayName);
  const id =
    entries === undefined || current === undefined
      ? null
      : (baseSpeciesId(entries, current) ?? null);

  const chain = useQuery({
    queryKey: ["pokeapi", "evolutions", id],
    queryFn: async () => {
      const species = await fetchJson<RawPokemonSpecies>(`/pokemon-species/${String(id)}`);
      if (species.evolution_chain === null) return [];
      const chainId = idFromUrl(species.evolution_chain.url);
      const raw = await fetchJson<RawEvolutionChain>(`/evolution-chain/${String(chainId)}`);
      return nextStages(raw, id ?? species.id);
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
  if (id === null || current === undefined) {
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

  return {
    data: expandNextStages(entries, current, chain.data),
    isPending: false,
    isFetching: chain.isFetching,
    isError: false,
    refetch: () => chain.refetch(),
  };
}
