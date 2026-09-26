import { QueryClient, type QueryClientConfig } from "@tanstack/react-query";

/**
 * TanStack Query defaults networkMode to "online", pausing every query and mutation while
 * offline. Nothing here needs a connection: storage goes through IndexedDB, and PokéAPI queries
 * already opt in to "always" themselves. Shared so main.tsx and tests exercise the same config.
 */
export function createQueryClient(
  defaultOptions?: QueryClientConfig["defaultOptions"],
): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { networkMode: "always", ...defaultOptions?.queries },
      mutations: { networkMode: "always", ...defaultOptions?.mutations },
    },
  });
}
