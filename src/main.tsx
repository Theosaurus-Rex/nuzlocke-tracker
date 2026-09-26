import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";

import { configurePokeApiQueries } from "@/game/pokeapi/queries";
import { createQueryClient } from "@/lib/query-client";
import { createDexieAdapter } from "@/storage/dexie-adapter";
import { requestPersistentStorage } from "@/storage/persistence";

import { Root } from "./app/root";

// Created once, at module scope: a QueryClient created inline in a component's render would be
// torn down and rebuilt, losing all cached data, on every re-render of whatever owned it.
const queryClient = createQueryClient();
configurePokeApiQueries(queryClient);

// The one place the Dexie implementation is named.
const adapter = createDexieAdapter();

// Fire-and-forget: must not block startup, and a denied result must not change app behaviour.
void requestPersistentStorage();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root adapter={adapter} queryClient={queryClient} />
  </StrictMode>,
);
