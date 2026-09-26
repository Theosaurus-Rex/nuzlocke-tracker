import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import { DEFAULT_RULES } from "@/domain/rules";
import type { Mon } from "@/domain/types";
import type { StorageAdapter } from "@/storage/adapter";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";
import { defaultPokeApiRoutes, stubPokeApi } from "@/test/pokeapi-fetch";

import { PartyScreen, partyMembers } from "./party-screen";

type MonDraft = Omit<Mon, "id" | "createdAt" | "updatedAt">;

function makeMonDraft(runId: string, overrides: Partial<Mon> = {}): MonDraft {
  return {
    runId,
    encounterId: null,
    speciesId: "chikorita",
    speciesIdCaught: "chikorita",
    nickname: null,
    gender: null,
    level: 5,
    levelCaught: 5,
    nature: null,
    ability: null,
    heldItem: null,
    moves: [],
    status: "party",
    partySlot: 0,
    boxOrder: null,
    caughtRouteId: null,
    shiny: false,
    ...overrides,
  };
}

async function seedRun(adapter: StorageAdapter) {
  return adapter.runs.put({
    name: "Test Run",
    game: "heartgold",
    status: "active",
    rules: DEFAULT_RULES,
    finishedAt: null,
  });
}

function renderScreen(adapter: StorageAdapter, runId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <StorageProvider adapter={adapter}>
        <MemoryRouter initialEntries={[`/runs/${runId}/party`]}>
          <Routes>
            <Route path="/runs/:runId/party" element={<PartyScreen />} />
          </Routes>
        </MemoryRouter>
      </StorageProvider>
    </QueryClientProvider>,
  );
}

async function cardHeadings(): Promise<string[]> {
  const headings = await screen.findAllByRole("heading", { level: 2 });
  return headings.map((heading) => heading.textContent ?? "");
}

beforeEach(() => {
  stubPokeApi(defaultPokeApiRoutes);
});

describe("partyMembers", () => {
  it("keeps only party mons, ordered by slot across gaps", () => {
    const mon = (id: string, overrides: Partial<Mon>): Mon => ({
      ...makeMonDraft("run-1", overrides),
      id,
      createdAt: "2026-09-27T00:00:00.000Z",
      updatedAt: "2026-09-27T00:00:00.000Z",
    });
    const result = partyMembers([
      mon("e", { partySlot: 5 }),
      mon("boxed", { status: "box", partySlot: null, boxOrder: 0 }),
      mon("a", { partySlot: 0 }),
      mon("dead", { status: "dead", partySlot: null }),
      mon("c", { partySlot: 2 }),
    ]);
    expect(result.map((m) => m.id)).toEqual(["a", "c", "e"]);
  });
});

describe("PartyScreen", () => {
  it("shows party mons in slot order, not creation order, and skips box and dead mons", async () => {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "Last", partySlot: 5 }));
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "First", partySlot: 0 }));
    await adapter.mons.put(
      makeMonDraft(run.id, { nickname: "Boxed", status: "box", partySlot: null, boxOrder: 0 }),
    );
    await adapter.mons.put(
      makeMonDraft(run.id, { nickname: "Gone", status: "dead", partySlot: null }),
    );
    await adapter.mons.put(makeMonDraft(run.id, { nickname: "Middle", partySlot: 2 }));

    renderScreen(adapter, run.id);

    expect(await cardHeadings()).toEqual(["“First”", "“Middle”", "“Last”"]);
    expect(screen.getByText("3 of 6")).toBeInTheDocument();
  });

  it("names the route a mon was caught on", async () => {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);
    const route = await adapter.routes.put({
      runId: run.id,
      name: "Route 29",
      order: 1,
      isCustom: false,
      gameRouteId: null,
    });
    await adapter.mons.put(makeMonDraft(run.id, { caughtRouteId: route.id }));

    renderScreen(adapter, run.id);

    expect(await screen.findByText("no item · Route 29")).toBeInTheDocument();
  });

  it("says so when the party is empty", async () => {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);

    renderScreen(adapter, run.id);

    expect(await screen.findByText("No one in your party yet")).toBeInTheDocument();
    expect(screen.getByText("0 of 6")).toBeInTheDocument();
  });
});
