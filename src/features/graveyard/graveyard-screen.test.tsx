import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import { DEFAULT_RULES } from "@/domain/rules";
import type { Cause } from "@/domain/types";
import type { StorageAdapter } from "@/storage/adapter";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";
import { defaultPokeApiRoutes, stubPokeApi } from "@/test/pokeapi-fetch";

import { GraveyardScreen } from "./graveyard-screen";

async function seedRun(adapter: StorageAdapter) {
  return adapter.runs.put({
    name: "Test Run",
    game: "heartgold",
    status: "active",
    rules: DEFAULT_RULES,
    finishedAt: null,
  });
}

interface Fallen {
  nickname: string;
  diedAt: string;
  routeName?: string;
  cause?: Cause;
}

async function bury(adapter: StorageAdapter, runId: string, fallen: Fallen) {
  const route =
    fallen.routeName === undefined
      ? null
      : await adapter.routes.put({
          runId,
          name: fallen.routeName,
          order: 1,
          isCustom: false,
          gameRouteId: null,
        });
  const mon = await adapter.mons.put({
    runId,
    encounterId: null,
    speciesId: "chikorita",
    speciesIdCaught: "chikorita",
    nickname: fallen.nickname,
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
  return adapter.deaths.put({
    runId,
    monId: mon.id,
    level: 7,
    routeId: route?.id ?? null,
    cause: fallen.cause ?? { type: "other", detail: "fell" },
    diedAt: fallen.diedAt,
    notes: null,
  });
}

function renderScreen(adapter: StorageAdapter, runId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <StorageProvider adapter={adapter}>
        <MemoryRouter initialEntries={[`/runs/${runId}/graveyard`]}>
          <Routes>
            <Route path="/runs/:runId/graveyard" element={<GraveyardScreen />} />
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

describe("GraveyardScreen", () => {
  it("lists this run's deaths newest first and counts them", async () => {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);
    const other = await seedRun(adapter);
    await bury(adapter, run.id, { nickname: "Old", diedAt: "2020-01-01T00:00:00.000Z" });
    await bury(adapter, run.id, { nickname: "New", diedAt: "2020-03-01T00:00:00.000Z" });
    await bury(adapter, run.id, { nickname: "Mid", diedAt: "2020-02-01T00:00:00.000Z" });
    await bury(adapter, other.id, { nickname: "Elsewhere", diedAt: "2020-04-01T00:00:00.000Z" });

    renderScreen(adapter, run.id);

    expect(await cardHeadings()).toEqual(["“New” Chikorita", "“Mid” Chikorita", "“Old” Chikorita"]);
    expect(screen.getByText("3 lost this run")).toBeInTheDocument();
  });

  it("shows the stats strip with the newest death's route", async () => {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);
    await bury(adapter, run.id, {
      nickname: "Old",
      diedAt: "2020-01-01T00:00:00.000Z",
      routeName: "Route 30",
    });
    await bury(adapter, run.id, {
      nickname: "New",
      diedAt: "2020-02-01T00:00:00.000Z",
      routeName: "Goldenrod City",
    });

    renderScreen(adapter, run.id);

    expect(
      await screen.findByText("2 lost · most recent: Goldenrod City · worst streak: 2 in a row"),
    ).toBeInTheDocument();
  });

  it("leaves out most recent when the newest death has no route", async () => {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);
    await bury(adapter, run.id, { nickname: "Only", diedAt: "2020-01-01T00:00:00.000Z" });

    renderScreen(adapter, run.id);

    expect(await screen.findByText("1 lost · worst streak: 1 in a row")).toBeInTheDocument();
  });

  it("shows the empty state and no strip when nobody has died", async () => {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);

    renderScreen(adapter, run.id);

    expect(await screen.findByText("No one has fallen yet")).toBeInTheDocument();
    expect(screen.getByText("0 lost this run")).toBeInTheDocument();
    expect(screen.queryByText(/worst streak/)).not.toBeInTheDocument();
  });

  it("renders the cause line and chip for a trainer death", async () => {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);
    await bury(adapter, run.id, {
      nickname: "Nibbles",
      diedAt: "2020-01-01T00:00:00.000Z",
      cause: {
        type: "trainer",
        fightId: null,
        trainerName: "Falkner",
        species: "pidgeotto",
        level: 9,
        move: "gust",
      },
    });

    renderScreen(adapter, run.id);

    expect(await screen.findByText("Falkner's Pidgeotto — Gust")).toBeInTheDocument();
    expect(screen.getByText("trainer")).toBeInTheDocument();
  });

  it("skips a death whose mon row is missing and keeps the counts consistent", async () => {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);
    await bury(adapter, run.id, { nickname: "Real", diedAt: "2020-01-01T00:00:00.000Z" });
    await adapter.deaths.put({
      runId: run.id,
      monId: "no-such-mon",
      level: 7,
      routeId: null,
      cause: { type: "other", detail: "fell" },
      diedAt: "2020-02-01T00:00:00.000Z",
      notes: null,
    });

    renderScreen(adapter, run.id);

    expect(await cardHeadings()).toEqual(["“Real” Chikorita"]);
    expect(screen.getByText("1 lost this run")).toBeInTheDocument();
    expect(screen.getByText(/^1 lost/, { selector: "p" })).toBeInTheDocument();
  });
});
