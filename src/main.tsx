/**
 * Startup composition. Outermost to innermost: `QueryClientProvider` -> `StorageProvider` (holding
 * the Dexie adapter) -> `RouterProvider`. The provider tree itself lives in `./app/root.tsx`;
 * this file only builds the singletons and mounts.
 *
 * This is the ONLY module in the app that names the Dexie implementation. `queries.ts`,
 * `mutations.ts` and the app shell see only the `StorageAdapter` interface, which is what keeps
 * the M6 SQLite swap confined to this one file.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient } from "@tanstack/react-query";

import "./index.css";

import { createDexieAdapter } from "@/storage/dexie-adapter";
import { requestPersistentStorage } from "@/storage/persistence";

import { Root } from "./app/root";

// Created once, at module scope: a QueryClient created inline in a component's render would be
// torn down and rebuilt (losing all cached data) on every re-render of whatever owned it.
const queryClient = new QueryClient();

// The one place the Dexie implementation is named.
const adapter = createDexieAdapter();

// Hygiene only (CLAUDE.md hard rule 5). Fired once here, fire-and-forget: it must not gate
// rendering or block startup, and a `"denied"` result must not change any app behaviour. The
// resolved status is only ever surfaced as a diagnostic, on the settings screen.
void requestPersistentStorage();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root adapter={adapter} queryClient={queryClient} />
  </StrictMode>,
);
