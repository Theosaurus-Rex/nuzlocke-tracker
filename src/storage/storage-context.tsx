/**
 * React context carrying the StorageAdapter, rather than a module singleton, so tests can
 * inject their own adapter without one test's adapter leaking into another's.
 */

import { createContext, useContext, type ReactNode } from "react";

import type { StorageAdapter } from "./adapter";

const StorageContext = createContext<StorageAdapter | null>(null);

export function StorageProvider({
  adapter,
  children,
}: {
  adapter: StorageAdapter;
  children: ReactNode;
}): ReactNode {
  return <StorageContext.Provider value={adapter}>{children}</StorageContext.Provider>;
}

export function useStorage(): StorageAdapter {
  const adapter = useContext(StorageContext);

  if (adapter === null) {
    throw new Error("useStorage must be used within a StorageProvider.");
  }

  return adapter;
}
