/**
 * Covers `routes-screen.tsx`'s own wiring: the list, the add-route form, and remove controls.
 * The traversal-order sort itself is covered against shuffled input at the query layer, in
 * `src/storage/queries.test.tsx`.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import type { Encounter, Route as RouteRow, Run, Rules } from "@/domain/types";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";
import type { StorageAdapter } from "@/storage/adapter";

import { RoutesScreen } from "./routes-screen";

const RULES_FIXTURE: Rules = {
  dupesClause: false,
  speciesClause: false,
  shinyClause: false,
  nicknamesRequired: false,
  levelCaps: false,
  setMode: false,
  hardcore: false,
  randomiser: {
    enabled: false,
    wildEncounters: false,
    trainers: false,
    starters: false,
    abilities: false,
    items: false,
    moves: false,
    evolutions: false,
  },
  customClause: null,
};

function makeRunDraft(overrides: Partial<Run> = {}): Omit<Run, "id" | "createdAt" | "updatedAt"> {
  return {
    name: "Test Run",
    game: "heartgold",
    status: "active",
    rules: RULES_FIXTURE,
    finishedAt: null,
    ...overrides,
  };
}

function makeRouteDraft(
  runId: string,
  overrides: Partial<RouteRow> = {},
): Omit<RouteRow, "id" | "createdAt" | "updatedAt"> {
  return {
    runId,
    name: "Route 29",
    order: 1,
    isCustom: false,
    gameRouteId: null,
    ...overrides,
  };
}

function makeEncounterDraft(
  runId: string,
  routeId: string,
  overrides: Partial<Encounter> = {},
): Omit<Encounter, "id" | "createdAt" | "updatedAt"> {
  return {
    runId,
    routeId,
    status: "open",
    speciesId: null,
    level: null,
    monId: null,
    notes: null,
    ...overrides,
  };
}

function renderScreen(adapter: StorageAdapter, runId: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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

function routeItem(name: string): HTMLElement {
  return screen.getByText(name).closest("li") as HTMLElement;
}

describe("RoutesScreen", () => {
  it("renders a run's routes in traversal order, not the order the rows were written", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    await adapter.routes.put(makeRouteDraft(run.id, { name: "Route 30", order: 600 }));
    await adapter.routes.put(makeRouteDraft(run.id, { name: "New Bark Town", order: 200 }));
    await adapter.routes.put(makeRouteDraft(run.id, { name: "Route 29", order: 300 }));

    renderScreen(adapter, run.id);

    await screen.findByText("New Bark Town");

    const items = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(items).toEqual([
      expect.stringContaining("New Bark Town"),
      expect.stringContaining("Route 29"),
      expect.stringContaining("Route 30"),
    ]);
  });

  it("adds a custom route which appears last, after the existing seeded routes", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    await adapter.routes.put(makeRouteDraft(run.id, { name: "New Bark Town", order: 100 }));
    await adapter.routes.put(makeRouteDraft(run.id, { name: "Route 29", order: 200 }));

    renderScreen(adapter, run.id);

    await screen.findByText("Route 29");

    await userEvent.type(screen.getByLabelText(/route name/i), "Secret Cave");
    await userEvent.click(screen.getByRole("button", { name: "Add route" }));

    await screen.findByText("Secret Cave");

    const items = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(items[items.length - 1]).toContain("Secret Cave");

    expect(screen.getByLabelText(/route name/i)).toHaveValue("");
  });

  it("shows a remove control on a custom route with no encounters, and removes it on use", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    await adapter.routes.put(
      makeRouteDraft(run.id, { name: "Player's Yard", order: 100, isCustom: true }),
    );

    renderScreen(adapter, run.id);

    await screen.findByText("Player's Yard");

    const item = routeItem("Player's Yard");
    const removeButton = await within(item).findByRole("button", { name: "Remove" });
    await userEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText("Player's Yard")).not.toBeInTheDocument();
    });
  });

  it("shows no remove control on a seeded route", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    await adapter.routes.put(
      makeRouteDraft(run.id, { name: "Route 29", order: 100, isCustom: false }),
    );

    renderScreen(adapter, run.id);

    await screen.findByText("Route 29");
    const item = routeItem("Route 29");
    expect(within(item).queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });

  it("shows no remove control on a custom route with an encounter logged against it", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    const route = await adapter.routes.put(
      makeRouteDraft(run.id, { name: "Whirl Islands", order: 100, isCustom: true }),
    );
    await adapter.encounters.put(makeEncounterDraft(run.id, route.id, { status: "caught" }));

    renderScreen(adapter, run.id);

    await screen.findByText("Whirl Islands");
    const item = routeItem("Whirl Islands");
    expect(within(item).queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });

  it("does not add a route on a blank name and shows a validation message", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    await adapter.routes.put(makeRouteDraft(run.id, { name: "New Bark Town", order: 100 }));

    renderScreen(adapter, run.id);

    await screen.findByText("New Bark Town");

    expect(screen.queryByText(/route name is required/i)).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/route name/i), "   ");
    await userEvent.click(screen.getByRole("button", { name: "Add route" }));

    expect(await screen.findByText(/route name is required/i)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });
});
