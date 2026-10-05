import type { ReactElement, ReactNode } from "react";

import { QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";

import { createQueryClient } from "@/lib/query-client";
import type { StorageAdapter } from "@/storage/adapter";
import { StorageProvider } from "@/storage/storage-context";

export function createWrapper(
  adapter: StorageAdapter,
): ({ children }: { children: ReactNode }) => ReactNode {
  const queryClient = createQueryClient({
    queries: { retry: false },
    mutations: { retry: false },
  });

  return function Wrapper({ children }: { children: ReactNode }): ReactNode {
    return (
      <QueryClientProvider client={queryClient}>
        <StorageProvider adapter={adapter}>{children}</StorageProvider>
      </QueryClientProvider>
    );
  };
}

export function renderWithProviders(
  ui: ReactElement,
  { adapter }: { adapter: StorageAdapter },
): RenderResult {
  return render(ui, { wrapper: createWrapper(adapter) });
}
