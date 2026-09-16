/**
 * React context carrying the `StorageAdapter`. See
 * docs/superpowers/specs/2026-09-17-nuzlocke-scaffold-design.md section 3.
 *
 * A context rather than a module singleton: `queries.ts` and `mutations.ts` must depend only on
 * the `StorageAdapter` interface, never on how it was constructed, and tests need to inject the
 * in-memory adapter without one test's adapter leaking into another's. Choosing an implementation
 * (Dexie in the shipped app) happens once at app startup, which is commit 10's job, not this
 * file's.
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

/** Throws when used outside a `StorageProvider` rather than silently returning `null`. */
export function useStorage(): StorageAdapter {
  const adapter = useContext(StorageContext);

  if (adapter === null) {
    throw new Error("useStorage must be used within a StorageProvider.");
  }

  return adapter;
}
