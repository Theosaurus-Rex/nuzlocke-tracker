import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import { DEFAULT_RULES } from "@/domain/rules";
import type { Rules } from "@/domain/types";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";
import { POKEAPI_BASE } from "@/game/pokeapi/client";
import type { RawIndex } from "@/game/pokeapi/map";
import { defaultPokeApiRoutes, stubPokeApi } from "@/test/pokeapi-fetch";
import { evolutionSpeciesIndexRefs, speciesIndexFixture } from "@/test/pokeapi-fixtures";

import { RoutesScreen } from "./routes-screen";

const SPECIES_INDEX: RawIndex = {
  results: [
    ...speciesIndexFixture.results,
    { name: "chikorita", url: `${POKEAPI_BASE}/pokemon/152/` },
    ...evolutionSpeciesIndexRefs,
  ],
};

beforeEach(() => {
  stubPokeApi({ ...defaultPokeApiRoutes, "/pokemon?limit=100000": SPECIES_INDEX });
});

const ROUTES = [
  { name: "Starter", gameRouteId: "starter" },
  { name: "Route 29", gameRouteId: "route-29" },
  { name: "New Bark Town", gameRouteId: "new-bark-town" },
];

export async function seedGiftRun(rules: Partial<Rules>) {
  const adapter = createMemoryAdapter();
  await adapter.init();
  const run = await adapter.runs.put({
    name: "Run",
    game: "heartgold",
    status: "active",
    rules: { ...DEFAULT_RULES, ...rules },
    finishedAt: null,
  });
  const routes = [];
  for (const [index, route] of ROUTES.entries()) {
    routes.push(
      await adapter.routes.put({
        runId: run.id,
        name: route.name,
        order: index + 1,
        isCustom: false,
        gameRouteId: route.gameRouteId,
      }),
    );
  }
  return { adapter, run, routes };
}

export function renderRoutes(adapter: ReturnType<typeof createMemoryAdapter>, runId: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <StorageProvider adapter={adapter}>
        <MemoryRouter initialEntries={[`/runs/${runId}/routes`]}>
          <Routes>
            <Route path="/runs/:runId/routes" element={<RoutesScreen />} />
          </Routes>
        </MemoryRouter>
      </StorageProvider>
    </QueryClientProvider>,
  );
}

async function card(name: string): Promise<HTMLElement> {
  const list = await screen.findByRole("list");
  return within(list).getByText(name).closest("li") as HTMLElement;
}

describe("No gifts", () => {
  it("greys a gift-only route, labels it and cannot log it", async () => {
    const { adapter, run } = await seedGiftRun({ noGifts: true });
    renderRoutes(adapter, run.id);

    const starter = await card("Starter");
    expect(within(starter).getByText("No gifts")).toBeInTheDocument();
    expect(starter).toHaveClass("opacity-50");
    expect(within(starter).queryByRole("button", { name: "Log encounter" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Log Starter" })).toBeNull();
  });

  it("leaves a mixed route loggable", async () => {
    const { adapter, run } = await seedGiftRun({ noGifts: true });
    renderRoutes(adapter, run.id);

    const mixed = await card("Route 29");
    expect(within(mixed).queryByText("No gifts")).toBeNull();
    expect(mixed).not.toHaveClass("opacity-50");
    expect(within(mixed).getByRole("button", { name: "Log encounter" })).toBeInTheDocument();
  });

  it("leaves gift-only routes out of the totals", async () => {
    const { adapter, run } = await seedGiftRun({ noGifts: true });
    renderRoutes(adapter, run.id);

    await card("Starter");
    expect(screen.getByText("0 / 2")).toBeInTheDocument();
  });

  it("does nothing when the rule is off", async () => {
    const { adapter, run } = await seedGiftRun({});
    renderRoutes(adapter, run.id);

    const starter = await card("Starter");
    expect(within(starter).queryByText("No gifts")).toBeNull();
    expect(within(starter).getByRole("button", { name: "Log encounter" })).toBeInTheDocument();
    expect(screen.getByText("0 / 3")).toBeInTheDocument();
  });
});

async function addGift(user: ReturnType<typeof userEvent.setup>, routeName: string) {
  await user.click(await screen.findByRole("button", { name: "Add gift" }));
  await user.click(await screen.findByRole("combobox", { name: "Route" }));
  await user.click(await screen.findByRole("option", { name: routeName }));
  await user.type(await screen.findByLabelText("Species"), "Chikorita");
  await user.type(screen.getByLabelText("Level caught"), "5");
  await user.click(screen.getByRole("button", { name: "Add gift" }));
}

describe("Gift clause", () => {
  it("offers Add gift only while the clause is on", async () => {
    const off = await seedGiftRun({});
    const view = renderRoutes(off.adapter, off.run.id);
    await card("Starter");
    expect(screen.queryByRole("button", { name: "Add gift" })).toBeNull();
    view.unmount();

    const on = await seedGiftRun({ giftClause: true });
    renderRoutes(on.adapter, on.run.id);
    expect(await screen.findByRole("button", { name: "Add gift" })).toBeInTheDocument();
  });

  it("logs a gift on a mixed route and leaves its encounter open for a wild catch", async () => {
    const user = userEvent.setup();
    const { adapter, run, routes } = await seedGiftRun({ giftClause: true });
    renderRoutes(adapter, run.id);

    await addGift(user, "Route 29");

    await waitFor(async () => {
      expect(await adapter.mons.getAll()).toHaveLength(1);
    });
    const [mon] = await adapter.mons.getAll();
    expect(mon).toMatchObject({ encounterId: null, caughtRouteId: routes[1]!.id, shiny: false });
    expect(await adapter.encounters.getAll()).toEqual([]);

    const mixed = await card("Route 29");
    expect(within(mixed).getByRole("button", { name: "Log encounter" })).toBeInTheDocument();
    await user.click(within(mixed).getByRole("button", { name: "Log Route 29" }));
    await user.type(await screen.findByLabelText("Species"), "Chikorita");
    await user.type(screen.getByLabelText("Level caught"), "5");
    await user.click(screen.getByRole("button", { name: "Save encounter" }));

    await waitFor(async () => {
      expect(await adapter.encounters.getAll()).toHaveLength(1);
    });
  });

  it("leaves a gift-only route with just a gift out of the totals", async () => {
    const user = userEvent.setup();
    const { adapter, run } = await seedGiftRun({ giftClause: true });
    renderRoutes(adapter, run.id);

    await card("Starter");
    expect(screen.getByText("0 / 2")).toBeInTheDocument();

    await addGift(user, "Starter");

    await waitFor(async () => {
      expect(await adapter.mons.getAll()).toHaveLength(1);
    });
    expect(screen.getByText("0 / 2")).toBeInTheDocument();
    const starter = await card("Starter");
    expect(within(starter).getByRole("button", { name: "Log encounter" })).toBeInTheDocument();
  });

  it("counts a gift-only route again once it has an encounter", async () => {
    const { adapter, run, routes } = await seedGiftRun({ giftClause: true });
    await adapter.encounters.put({
      runId: run.id,
      routeId: routes[0]!.id,
      status: "missed",
      speciesId: null,
      level: null,
      monId: null,
      notes: null,
    });
    renderRoutes(adapter, run.id);

    await card("Starter");
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("counts a logged gift for the dupes clause on a later catch", async () => {
    const user = userEvent.setup();
    const { adapter, run } = await seedGiftRun({ giftClause: true, dupesClause: true });
    renderRoutes(adapter, run.id);

    await addGift(user, "Starter");
    await waitFor(async () => {
      expect(await adapter.mons.getAll()).toHaveLength(1);
    });

    const mixed = await card("Route 29");
    await user.click(within(mixed).getByRole("button", { name: "Log Route 29" }));
    await user.type(await screen.findByLabelText("Species"), "Chikorita");
    await user.tab();

    expect(await screen.findByText(/Dupes clause: you already have/)).toBeInTheDocument();
  });
});
