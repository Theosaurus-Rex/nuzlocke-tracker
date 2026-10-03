import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import { DEFAULT_RULES } from "@/domain/rules";
import type { Fight, Rules } from "@/domain/types";
import type { StorageAdapter } from "@/storage/adapter";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";

import { FightsScreen } from "./fights-screen";

type FightDraft = Omit<Fight, "id" | "createdAt" | "updatedAt">;

function fightDraft(runId: string, overrides: Partial<FightDraft>): FightDraft {
  return {
    runId,
    gameFightId: null,
    name: "Fight",
    kind: "gym",
    order: 1,
    grantsBadge: true,
    levelCap: 10,
    status: "pending",
    clearedAt: null,
    ...overrides,
  };
}

async function seed(adapter: StorageAdapter, rules: Rules = { ...DEFAULT_RULES, levelCaps: true }) {
  const run = await adapter.runs.put({
    name: "Test Run",
    game: "heartgold",
    status: "active",
    rules,
    finishedAt: null,
  });
  const falkner = await adapter.fights.put(
    fightDraft(run.id, {
      gameFightId: "gym-falkner",
      name: "Falkner",
      order: 1,
      levelCap: 13,
      status: "cleared",
    }),
  );
  const bugsy = await adapter.fights.put(
    fightDraft(run.id, { gameFightId: "gym-bugsy", name: "Bugsy", order: 2, levelCap: 17 }),
  );
  await adapter.fights.put(
    fightDraft(run.id, {
      gameFightId: "elite-four-will",
      name: "Will",
      kind: "elite_four",
      order: 3,
      grantsBadge: false,
      levelCap: 50,
    }),
  );
  const mon = await adapter.mons.put({
    runId: run.id,
    encounterId: null,
    speciesId: "caterpie",
    speciesIdCaught: "caterpie",
    nickname: "Nibbles",
    gender: null,
    level: 5,
    levelCaught: 5,
    nature: null,
    ability: null,
    heldItem: null,
    moves: [],
    status: "dead",
    partySlot: null,
    boxOrder: null,
    caughtRouteId: null,
    shiny: false,
  });
  await adapter.deaths.put({
    runId: run.id,
    monId: mon.id,
    level: 7,
    routeId: null,
    cause: {
      type: "trainer",
      fightId: falkner.id,
      trainerName: null,
      species: "pidgey",
      level: 9,
      move: null,
    },
    diedAt: "2020-01-01T00:00:00.000Z",
    notes: null,
  });
  return { run, falkner, bugsy };
}

function renderScreen(adapter: StorageAdapter, runId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <StorageProvider adapter={adapter}>
        <MemoryRouter initialEntries={[`/runs/${runId}/fights`]}>
          <Routes>
            <Route path="/runs/:runId/fights" element={<FightsScreen />} />
          </Routes>
        </MemoryRouter>
      </StorageProvider>
    </QueryClientProvider>,
  );
}

async function findTable() {
  const element = await screen.findByRole("table", { name: "Fights" });
  return Object.assign(within(element), { element });
}

function rowFor(table: { element: HTMLElement }, text: string): HTMLElement {
  const row = within(table.element).getByText(text, { exact: false }).closest("tr");
  if (row === null) throw new Error(`no row for ${text}`);
  return row;
}

describe("FightsScreen", () => {
  it("lists the sections in order with their headers", async () => {
    const adapter = createMemoryAdapter();
    const { run } = await seed(adapter);
    renderScreen(adapter, run.id);

    const table = await findTable();
    const headers = table.getAllByRole("columnheader", { name: /^(Johto|Elite Four)$/ });
    expect(headers.map((h) => h.textContent)).toEqual(["Johto", "Elite Four"]);
    expect(table.getByText("Falkner · Zephyr")).toBeInTheDocument();
    expect(table.getByText("Will")).toBeInTheDocument();
  });

  it("marks a cleared fight as cleared and no other", async () => {
    const adapter = createMemoryAdapter();
    const { run } = await seed(adapter);
    renderScreen(adapter, run.id);

    const table = await findTable();
    expect(within(rowFor(table, "Falkner")).getByText("Cleared")).toBeInTheDocument();
    expect(table.getAllByText("Cleared")).toHaveLength(1);
  });

  it("marks only the first uncleared fight as the next one", async () => {
    const adapter = createMemoryAdapter();
    const { run } = await seed(adapter);
    renderScreen(adapter, run.id);

    const table = await findTable();
    expect(rowFor(table, "Bugsy")).toHaveAttribute("aria-current", "step");
    expect(rowFor(table, "Falkner")).not.toHaveAttribute("aria-current");
    expect(rowFor(table, "Will")).not.toHaveAttribute("aria-current");
  });

  it("shows a loss on its own fight's row with the mon's name", async () => {
    const adapter = createMemoryAdapter();
    const { run } = await seed(adapter);
    renderScreen(adapter, run.id);

    const table = await findTable();
    expect(within(rowFor(table, "Falkner")).getByText("“Nibbles” Caterpie")).toBeInTheDocument();
    expect(within(rowFor(table, "Bugsy")).queryByText(/Nibbles/)).not.toBeInTheDocument();
  });

  it("shows the badge count and level cap in the header", async () => {
    const adapter = createMemoryAdapter();
    const { run } = await seed(adapter);
    renderScreen(adapter, run.id);

    await findTable();
    expect(screen.getAllByText("1 of 2 badges").length).toBeGreaterThan(0);
    expect(screen.getByText("Cap L17")).toBeInTheDocument();
  });

  it("hides the level cap when level caps are off", async () => {
    const adapter = createMemoryAdapter();
    const { run } = await seed(adapter, { ...DEFAULT_RULES, levelCaps: false });
    renderScreen(adapter, run.id);

    await findTable();
    expect(screen.queryByText(/Cap L/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/· cap/)).not.toBeInTheDocument();
  });
});
