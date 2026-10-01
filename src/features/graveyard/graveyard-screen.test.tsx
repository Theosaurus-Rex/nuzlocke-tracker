import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import { DEFAULT_RULES } from "@/domain/rules";
import type { Cause, Route as RunRoute } from "@/domain/types";
import type { StorageAdapter } from "@/storage/adapter";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";
import { defaultPokeApiRoutes, stubPokeApi } from "@/test/pokeapi-fetch";

import { GRAVEYARD_VIEW_STORAGE_KEY, GraveyardScreen } from "./graveyard-screen";

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
  beforeEach(() => {
    localStorage.setItem(GRAVEYARD_VIEW_STORAGE_KEY, "list");
  });

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

  it("shows the empty state when nobody has died", async () => {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);

    renderScreen(adapter, run.id);

    expect(await screen.findByText("No one has fallen yet")).toBeInTheDocument();
    expect(screen.queryByText(/placed on the route/)).not.toBeInTheDocument();
    expect(screen.getByText("0 lost this run")).toBeInTheDocument();
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

describe("GraveyardScreen timeline", () => {
  async function seedRoutes(adapter: StorageAdapter, runId: string, names: string[]) {
    const routes: RunRoute[] = [];
    for (const [index, name] of names.entries()) {
      routes.push(
        await adapter.routes.put({
          runId,
          name,
          order: (index + 1) * 100,
          isCustom: false,
          gameRouteId: null,
        }),
      );
    }
    return routes;
  }

  async function buryOn(
    adapter: StorageAdapter,
    runId: string,
    nickname: string,
    routeId: string | null,
    diedAt: string,
  ) {
    const mon = await adapter.mons.put({
      runId,
      encounterId: null,
      speciesId: "chikorita",
      speciesIdCaught: "chikorita",
      nickname,
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
      routeId,
      cause: { type: "other", detail: "fell" },
      diedAt,
      notes: null,
    });
  }

  async function setup() {
    const adapter = createMemoryAdapter();
    const run = await seedRun(adapter);
    const [r1, r2, r3, r4] = (await seedRoutes(adapter, run.id, [
      "Route 29",
      "Violet City",
      "Azalea Town",
      "Goldenrod City",
    ])) as [RunRoute, RunRoute, RunRoute, RunRoute];
    return { adapter, runId: run.id, r1, r2, r3, r4 };
  }

  it("is the default view, with route headers and position over all routes", async () => {
    const { adapter, runId, r2, r4 } = await setup();
    await buryOn(adapter, runId, "Late", r4.id, "2020-01-02T00:00:00.000Z");
    await buryOn(adapter, runId, "Early", r2.id, "2020-01-03T00:00:00.000Z");

    renderScreen(adapter, runId);

    const sections = within(await screen.findByRole("list", { name: "Deaths by route" }))
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent)
      .filter((text) => text === "Violet City" || text === "Goldenrod City");
    expect(sections).toEqual(["Violet City", "Goldenrod City"]);
    expect(screen.getByText("2/4")).toBeInTheDocument();
    expect(screen.getByText("4/4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Timeline" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows the lost chip only on a route with more than one death", async () => {
    const { adapter, runId, r2, r4 } = await setup();
    await buryOn(adapter, runId, "A", r2.id, "2020-01-01T00:00:00.000Z");
    await buryOn(adapter, runId, "B", r4.id, "2020-01-02T00:00:00.000Z");
    await buryOn(adapter, runId, "C", r4.id, "2020-01-03T00:00:00.000Z");

    renderScreen(adapter, runId);

    expect(await screen.findByText("2 LOST")).toBeInTheDocument();
    expect(screen.getAllByText(/LOST$/)).toHaveLength(1);
  });

  it("shows the unrecorded section only when a death has no known route", async () => {
    const { adapter, runId, r2 } = await setup();
    await buryOn(adapter, runId, "A", r2.id, "2020-01-01T00:00:00.000Z");

    const first = renderScreen(adapter, runId);
    await screen.findByText("Violet City");
    expect(screen.queryByText("Route not recorded")).not.toBeInTheDocument();
    first.unmount();

    await buryOn(adapter, runId, "Lost", null, "2020-01-02T00:00:00.000Z");
    await buryOn(adapter, runId, "Ghost", "deleted-route", "2020-01-03T00:00:00.000Z");
    renderScreen(adapter, runId);

    expect(await screen.findByText("Route not recorded")).toBeInTheDocument();
    expect(screen.getByText("“Lost” Chikorita")).toBeInTheDocument();
    expect(screen.getByText("“Ghost” Chikorita")).toBeInTheDocument();
    const byRoute = screen.getByRole("list", { name: "Deaths by route" });
    expect(within(byRoute).queryByText("“Lost” Chikorita")).not.toBeInTheDocument();
    expect(within(byRoute).queryByText("“Ghost” Chikorita")).not.toBeInTheDocument();
  });

  it("switches to the list, and remembers the choice across a remount", async () => {
    const { adapter, runId, r2 } = await setup();
    await buryOn(adapter, runId, "A", r2.id, "2020-01-01T00:00:00.000Z");

    const first = renderScreen(adapter, runId);
    fireEvent.click(await screen.findByRole("button", { name: "List" }));

    expect(screen.queryByRole("list", { name: "Deaths by route" })).not.toBeInTheDocument();
    expect(screen.getByText("“A” Chikorita")).toBeInTheDocument();
    first.unmount();

    renderScreen(adapter, runId);
    expect(await screen.findByRole("button", { name: "List" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByRole("list", { name: "Deaths by route" })).not.toBeInTheDocument();
  });

  it("falls back to the timeline for an unknown stored view", async () => {
    localStorage.setItem(GRAVEYARD_VIEW_STORAGE_KEY, "banana");
    const { adapter, runId, r2 } = await setup();
    await buryOn(adapter, runId, "A", r2.id, "2020-01-01T00:00:00.000Z");

    renderScreen(adapter, runId);

    expect(await screen.findByRole("list", { name: "Deaths by route" })).toBeInTheDocument();
  });

  it("explains the empty timeline", async () => {
    const { adapter, runId } = await setup();

    renderScreen(adapter, runId);

    expect(await screen.findByText("No one has fallen yet")).toBeInTheDocument();
    expect(
      screen.getByText("Deaths you log are placed on the route where they happened."),
    ).toBeInTheDocument();
  });
});
