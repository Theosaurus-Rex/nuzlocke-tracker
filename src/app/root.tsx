/**
 * Waits for the storage adapter to open before rendering the router. Split out of `main.tsx` so
 * that file stays pure bootstrap code with no component for Fast Refresh to reload.
 */

import { useEffect, useState, type ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { RouterProvider } from "react-router";

import { Typography } from "@/components/typography";
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
    return (
      <Typography variant="body" className="p-4">
        Loading…
      </Typography>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StorageProvider adapter={adapter}>
        <RouterProvider router={router} />
      </StorageProvider>
    </QueryClientProvider>
  );
}
