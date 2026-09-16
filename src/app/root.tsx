/**
 * Top-level component: waits for the storage adapter to open before rendering the router.
 * Split out of `main.tsx` so that file stays pure bootstrapping code with no component of its
 * own to fast-refresh.
 */

import { useEffect, useState, type ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { RouterProvider } from "react-router";

import type { StorageAdapter } from "@/storage/adapter";
import { StorageProvider } from "@/storage/storage-context";

import { router } from "./router";

export function Root({
  adapter,
  queryClient,
}: {
  adapter: StorageAdapter;
  queryClient: QueryClient;
}): ReactNode {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void adapter.init().then(() => {
      if (!cancelled) {
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [adapter]);

  if (!ready) {
    // Minimal loading state while IndexedDB opens. No visual design here — see CLAUDE.md's "still
    // open" section on visual direction.
    return <p className="p-4">Loading…</p>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StorageProvider adapter={adapter}>
        <RouterProvider router={router} />
      </StorageProvider>
    </QueryClientProvider>
  );
}
