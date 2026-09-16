import type { ReactNode } from "react";

import { usePersistenceStatus } from "@/storage/persistence";

/**
 * Placeholder. M4/PER-10 fill this in with export/import. The storage persistence diagnostic
 * below is the one piece of real behaviour this commit adds here — CLAUDE.md hard rule 5 asks for
 * the `navigator.storage.persist()` result to be surfaced as plain text, as a diagnostic only.
 * `null` means the startup call (`main.tsx`) has not resolved yet.
 */
export function SettingsScreen(): ReactNode {
  const status = usePersistenceStatus();

  return (
    <div className="p-4">
      <h1 className="text-xl">Settings</h1>
      <p className="mt-4 text-sm">Storage persistence: {status ?? "checking…"}</p>
    </div>
  );
}
