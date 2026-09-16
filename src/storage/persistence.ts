/**
 * `navigator.storage.persist()` wiring. See CLAUDE.md hard rule 5.
 *
 * This is HYGIENE ONLY. iOS Safari evicts script-writable storage (IndexedDB included) after 7
 * days without interaction, and `persist()` is a heuristic grant even where it exists — there is
 * no browser that guarantees it. Nothing here, or anywhere downstream, may treat `"granted"` as a
 * reason to skip JSON export/import (PER-10) or to assume data survives. The result is
 * diagnostics, surfaced on the settings screen, and nothing else.
 *
 * `navigator.storage` does not exist in jsdom and is absent on older Safari. Accessing it
 * unguarded throws and takes the whole app down at startup, so every path here is feature-detected
 * before touching it.
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

/**
 * Feature-detects the Storage API and, when present, requests persistent storage exactly once
 * per call. The caller (`main.tsx`) is responsible for calling this only once at startup per hard
 * rule 5 — this function does not gate rendering and never throws.
 */
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
    // A rejected promise here (some browsers throw in restricted contexts, e.g. private
    // browsing) is diagnostics-worthy, not fatal. Treat it the same as "no API".
    return "unsupported";
  }
}

/** Current status, or `null` if `requestPersistentStorage()` has not resolved yet. */
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

/**
 * Reactive read of the latest status for display (the settings screen). Returns `null` until
 * `requestPersistentStorage()` — called once at startup by `main.tsx` — resolves. Does not itself
 * call `persist()`; it only observes the result of the startup call.
 */
export function usePersistenceStatus(): PersistenceStatus | null {
  return useSyncExternalStore(subscribePersistenceStatus, getPersistenceStatus);
}
