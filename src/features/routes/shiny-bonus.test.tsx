import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import { DEFAULT_RULES } from "@/domain/rules";
import type { Encounter, Rules } from "@/domain/types";
import { POKEAPI_BASE } from "@/game/pokeapi/client";
import type { RawIndex } from "@/game/pokeapi/map";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";
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

type EncounterStatus = Encounter["status"];

async function seed(rules: Partial<Rules>, statuses: EncounterStatus[]) {
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
  for (const [index, status] of statuses.entries()) {
    const route = await adapter.routes.put({
      runId: run.id,
      name: `Route ${String(index + 1)}`,
      order: index + 1,
      isCustom: false,
      gameRouteId: null,
    });
    await adapter.encounters.put({
      runId: run.id,
      routeId: route.id,
      status,
      speciesId: status === "missed" ? "pidgey" : null,
      level: null,
      monId: null,
      notes: null,
    });
    routes.push(route);
  }
  return { adapter, run, routes };
}

function renderScreen(adapter: Awaited<ReturnType<typeof seed>>["adapter"], runId: string) {
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

async function listItem(name: string): Promise<HTMLElement> {
  const list = await screen.findByRole("list");
  return within(list).getByText(name).closest("li") as HTMLElement;
}

async function openShinyDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Add bonus shiny" }));
}

async function chooseRoute(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await screen.findByRole("combobox", { name: "Route" }));
  await user.click(await screen.findByRole("option", { name }));
}

async function fillCatch(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText("Species"), "Chikorita");
  await user.type(screen.getByLabelText("Level caught"), "6");
}

describe("Add bonus shiny header button", () => {
  it("shows when the shiny clause is on", async () => {
    const { adapter, run } = await seed({ shinyClause: true }, ["missed"]);
    renderScreen(adapter, run.id);

    expect(await screen.findByRole("button", { name: "Add bonus shiny" })).toBeInTheDocument();
  });

  it("is hidden when the shiny clause is off", async () => {
    const { adapter, run } = await seed({ shinyClause: false }, ["missed"]);
    renderScreen(adapter, run.id);

    await listItem("Route 1");

    expect(screen.queryByRole("button", { name: "Add bonus shiny" })).not.toBeInTheDocument();
  });

  it("leaves no bonus shiny button on any route row", async () => {
    const { adapter, run } = await seed({ shinyClause: true }, ["open", "missed", "skipped"]);
    renderScreen(adapter, run.id);

    await listItem("Route 1");

    expect(screen.queryByRole("button", { name: /Add a bonus shiny on/ })).not.toBeInTheDocument();
  });
});

describe("Bonus shiny dialog", () => {
  it("opens with its own title, a locked Shiny box and no outcome control", async () => {
    const user = userEvent.setup();
    const { adapter, run } = await seed({ shinyClause: true }, ["missed"]);
    renderScreen(adapter, run.id);

    await openShinyDialog(user);

    expect(await screen.findByRole("heading", { name: "Add bonus shiny" })).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "Outcome" })).not.toBeInTheDocument();
    const shiny = screen.getByRole("button", { name: "Shiny" });
    expect(shiny).toBeDisabled();
    expect(shiny).toHaveAttribute("aria-pressed", "true");
  });

  it("asks for a route and saves nothing without one", async () => {
    const user = userEvent.setup();
    const { adapter, run } = await seed({ shinyClause: true }, ["missed"]);
    renderScreen(adapter, run.id);

    await openShinyDialog(user);
    await fillCatch(user);
    await user.click(screen.getByRole("button", { name: "Add shiny" }));

    expect(await screen.findByText("Choose the route it was caught on.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(await adapter.mons.getAll()).toEqual([]);
  });

  it("saves a shiny tied to the chosen route and leaves that route's encounter as it was", async () => {
    const user = userEvent.setup();
    const { adapter, run, routes } = await seed({ shinyClause: true }, ["missed", "caught"]);
    renderScreen(adapter, run.id);

    await openShinyDialog(user);
    await chooseRoute(user, "Route 1");
    await fillCatch(user);
    await user.type(screen.getByLabelText(/^Nickname/), "Glint");
    await user.click(screen.getByRole("button", { name: "Add shiny" }));

    await waitFor(async () => {
      expect(await adapter.mons.getAll()).toHaveLength(1);
    });
    const [mon] = await adapter.mons.getAll();
    expect(mon).toMatchObject({
      encounterId: null,
      caughtRouteId: routes[0]!.id,
      shiny: true,
      status: "party",
      nickname: "Glint",
    });
    const encounter = (await adapter.encounters.where("routeId", routes[0]!.id))[0];
    expect(encounter).toMatchObject({ status: "missed", speciesId: "pidgey", monId: null });
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Add bonus shiny" })).not.toBeInTheDocument();
    });
    expect(within(await listItem("Route 1")).getByText(/pidgey/i)).toBeInTheDocument();
  });

  it("lets a route with no encounter yet be chosen", async () => {
    const user = userEvent.setup();
    const { adapter, run, routes } = await seed({ shinyClause: true }, ["open"]);
    renderScreen(adapter, run.id);

    await openShinyDialog(user);
    await chooseRoute(user, "Route 1");
    await fillCatch(user);
    await user.click(screen.getByRole("button", { name: "Add shiny" }));

    await waitFor(async () => {
      expect(await adapter.mons.getAll()).toHaveLength(1);
    });
    expect((await adapter.mons.getAll())[0]).toMatchObject({ caughtRouteId: routes[0]!.id });
  });

  it("shows no dupes notice for a line already owned", async () => {
    const user = userEvent.setup();
    const { adapter, run } = await seed({ shinyClause: true, dupesClause: true }, ["missed"]);
    await adapter.mons.put({
      runId: run.id,
      encounterId: null,
      speciesId: "geodude",
      speciesIdCaught: "geodude",
      nickname: null,
      gender: null,
      level: 10,
      levelCaught: 10,
      nature: null,
      ability: null,
      heldItem: null,
      moves: [],
      status: "party",
      partySlot: 0,
      boxOrder: null,
      caughtRouteId: null,
      shiny: false,
    });
    renderScreen(adapter, run.id);

    await openShinyDialog(user);
    await user.type(await screen.findByLabelText("Species"), "Geodude");
    await screen.findByRole("combobox", { name: "Species" });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("requires a nickname when the rule is on and saves nothing without one", async () => {
    const user = userEvent.setup();
    const { adapter, run } = await seed({ shinyClause: true, nicknamesRequired: true }, ["missed"]);
    renderScreen(adapter, run.id);

    await openShinyDialog(user);
    await chooseRoute(user, "Route 1");
    await fillCatch(user);
    await user.click(screen.getByRole("button", { name: "Add shiny" }));

    expect(await screen.findByText(/requires a nickname/i)).toBeInTheDocument();
    expect(await adapter.mons.getAll()).toEqual([]);
  });
});
