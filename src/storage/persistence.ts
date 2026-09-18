/**
 * `navigator.storage.persist()` wiring. This is hygiene only (CLAUDE.md hard rule 5): `persist()`
 * is a heuristic grant, and nothing here or downstream may treat `"granted"` as a reason to skip
 * JSON export or assume data survives.
 *
 * `navigator.storage` does not exist in jsdom and is absent on older Safari, so every path here
 * is feature-detected before touching it.
 */

import { useSyncExternalStore } from "react";

export type PersistenceStatus = "granted" | "denied" | "unsupported";

type Listener = () => void;

let lastStatus: PersistenceStatus | null = null;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Feature-detects the Storage API and, when present, requests persistent storage. Never throws. */
export async function requestPersistentStorage(): Promise<PersistenceStatus> {
  const status = await detect();
  lastStatus = status;
  notify();
  return status;
}

async function detect(): Promise<PersistenceStatus> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) {
    return "unsupported";
  }

  try {
    const granted = await navigator.storage.persist();
    return granted ? "granted" : "denied";
  } catch {
    // Some browsers throw in restricted contexts, e.g. private browsing. Treat it as no API.
    return "unsupported";
  }
}

/** `null` until `requestPersistentStorage()` has resolved once. */
export function getPersistenceStatus(): PersistenceStatus | null {
  return lastStatus;
}

export function subscribePersistenceStatus(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test-only: clears cached status and listeners between test cases. */
export function resetPersistenceStatusForTests(): void {
  lastStatus = null;
  listeners.clear();
}

/** Reactive read of the latest status. Does not call `persist()` itself, only observes it. */
export function usePersistenceStatus(): PersistenceStatus | null {
  return useSyncExternalStore(subscribePersistenceStatus, getPersistenceStatus);
}
