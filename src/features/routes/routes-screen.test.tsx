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

import type { Encounter, Mon, Route as RouteRow, Run, Rules } from "@/domain/types";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";
import type { StorageAdapter } from "@/storage/adapter";
import { stubPokeApi } from "@/test/pokeapi-fetch";

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

function makeMonDraft(
  runId: string,
  encounterId: string,
  overrides: Partial<Mon> = {},
): Omit<Mon, "id" | "createdAt" | "updatedAt"> {
  return {
    runId,
    encounterId,
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

/**
 * The screen renders the same rows in both the desktop table and the mobile list, so a plain
 * `getByText` on a route name matches twice. These tests exercise the list, which is what they
 * were written against; `route-table.test.tsx` covers the table.
 */
async function findRouteInList(name: string): Promise<HTMLElement> {
  const list = await screen.findByRole("list");
  return within(list).findByText(name);
}

function routeItem(name: string): HTMLElement {
  return within(screen.getByRole("list")).getByText(name).closest("li") as HTMLElement;
}

describe("RoutesScreen", () => {
  it("renders a run's routes in traversal order, not the order the rows were written", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    await adapter.routes.put(makeRouteDraft(run.id, { name: "Route 30", order: 600 }));
    await adapter.routes.put(makeRouteDraft(run.id, { name: "New Bark Town", order: 200 }));
    await adapter.routes.put(makeRouteDraft(run.id, { name: "Route 29", order: 300 }));

    renderScreen(adapter, run.id);

    await findRouteInList("New Bark Town");

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

    await findRouteInList("Route 29");

    await userEvent.click(screen.getByRole("button", { name: "+ Add route" }));
    await userEvent.type(screen.getByLabelText(/route name/i), "Secret Cave");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    await findRouteInList("Secret Cave");

    const items = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(items[items.length - 1]).toContain("Secret Cave");

    expect(screen.getByLabelText(/route name/i)).toHaveValue("");
  });

  it("keeps the add-route field hidden until the control asks for it", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    await adapter.routes.put(makeRouteDraft(run.id, { name: "New Bark Town", order: 100 }));

    renderScreen(adapter, run.id);
    await findRouteInList("New Bark Town");

    expect(screen.queryByLabelText(/route name/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "+ Add route" }));

    expect(screen.getByLabelText(/route name/i)).toBeInTheDocument();
  });

  it("shows a remove control on a custom route with no encounters, and removes it on use", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    await adapter.routes.put(
      makeRouteDraft(run.id, { name: "Player's Yard", order: 100, isCustom: true }),
    );

    renderScreen(adapter, run.id);

    await findRouteInList("Player's Yard");

    const item = routeItem("Player's Yard");
    const deleteButton = await within(item).findByRole("button", {
      name: "Delete Player's Yard",
    });
    await userEvent.click(deleteButton);

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

    await findRouteInList("Route 29");
    const item = routeItem("Route 29");
    expect(within(item).queryByRole("button", { name: "Delete Route 29" })).not.toBeInTheDocument();
  });

  it("shows no remove control on a custom route with an encounter logged against it", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    const route = await adapter.routes.put(
      makeRouteDraft(run.id, { name: "Whirl Islands", order: 100, isCustom: true }),
    );
    await adapter.encounters.put(makeEncounterDraft(run.id, route.id, { status: "caught" }));

    renderScreen(adapter, run.id);

    await findRouteInList("Whirl Islands");
    const item = routeItem("Whirl Islands");
    expect(
      within(item).queryByRole("button", { name: "Delete Whirl Islands" }),
    ).not.toBeInTheDocument();
  });

  it("does not add a route on a blank name and shows a validation message", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    await adapter.routes.put(makeRouteDraft(run.id, { name: "New Bark Town", order: 100 }));

    renderScreen(adapter, run.id);

    await findRouteInList("New Bark Town");

    expect(screen.queryByText(/route name is required/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "+ Add route" }));
    await userEvent.type(screen.getByLabelText(/route name/i), "   ");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText(/route name is required/i)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("shows a counter chip per bucket and the covered/total figure", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    const caughtRoute = await adapter.routes.put(
      makeRouteDraft(run.id, { name: "New Bark Town", order: 100 }),
    );
    const caughtEncounter = await adapter.encounters.put(
      makeEncounterDraft(run.id, caughtRoute.id, { status: "caught" }),
    );
    await adapter.mons.put(makeMonDraft(run.id, caughtEncounter.id));
    const missedRoute = await adapter.routes.put(
      makeRouteDraft(run.id, { name: "Route 46", order: 200 }),
    );
    await adapter.encounters.put(makeEncounterDraft(run.id, missedRoute.id, { status: "missed" }));
    await adapter.routes.put(makeRouteDraft(run.id, { name: "Route 29", order: 300 }));

    renderScreen(adapter, run.id);

    await findRouteInList("New Bark Town");

    const counters = screen.getByRole("group", { name: "Route counters" });
    expect(within(counters).getByText("caught")).toBeInTheDocument();
    expect(within(counters).getByText("missed")).toBeInTheDocument();
    expect(within(counters).getByText("pending")).toBeInTheDocument();
    expect(within(counters).getByText("2 / 3")).toBeInTheDocument();
  });

  it("filters routes to a clicked counter chip, and shows them again on a second click", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    const caughtRoute = await adapter.routes.put(
      makeRouteDraft(run.id, { name: "New Bark Town", order: 100 }),
    );
    const caughtEncounter = await adapter.encounters.put(
      makeEncounterDraft(run.id, caughtRoute.id, { status: "caught" }),
    );
    await adapter.mons.put(makeMonDraft(run.id, caughtEncounter.id));
    const missedRoute = await adapter.routes.put(
      makeRouteDraft(run.id, { name: "Route 46", order: 200 }),
    );
    await adapter.encounters.put(makeEncounterDraft(run.id, missedRoute.id, { status: "missed" }));

    renderScreen(adapter, run.id);

    await findRouteInList("New Bark Town");
    await findRouteInList("Route 46");

    const counters = screen.getByRole("group", { name: "Route counters" });
    const caughtChip = within(counters).getByRole("button", { name: /caught/i });

    expect(caughtChip).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(caughtChip);
    expect(caughtChip).toHaveAttribute("aria-pressed", "true");

    const list = screen.getByRole("list");
    expect(within(list).queryByText("Route 46")).not.toBeInTheDocument();
    expect(within(list).getByText("New Bark Town")).toBeInTheDocument();

    await userEvent.click(caughtChip);
    expect(caughtChip).toHaveAttribute("aria-pressed", "false");

    expect(await findRouteInList("Route 46")).toBeInTheDocument();
  });

  it("combines two active chips as an OR, and keeps the counts fixed while filtering", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    const caughtRoute = await adapter.routes.put(
      makeRouteDraft(run.id, { name: "New Bark Town", order: 100 }),
    );
    const caughtEncounter = await adapter.encounters.put(
      makeEncounterDraft(run.id, caughtRoute.id, { status: "caught" }),
    );
    await adapter.mons.put(makeMonDraft(run.id, caughtEncounter.id));
    const missedRoute = await adapter.routes.put(
      makeRouteDraft(run.id, { name: "Route 46", order: 200 }),
    );
    await adapter.encounters.put(makeEncounterDraft(run.id, missedRoute.id, { status: "missed" }));
    await adapter.routes.put(makeRouteDraft(run.id, { name: "Route 29", order: 300 }));

    renderScreen(adapter, run.id);

    await findRouteInList("New Bark Town");

    const counters = screen.getByRole("group", { name: "Route counters" });
    await userEvent.click(within(counters).getByRole("button", { name: /caught/i }));
    await userEvent.click(within(counters).getByRole("button", { name: /missed/i }));

    const list = screen.getByRole("list");
    expect(within(list).getByText("New Bark Town")).toBeInTheDocument();
    expect(within(list).getByText("Route 46")).toBeInTheDocument();
    expect(within(list).queryByText("Route 29")).not.toBeInTheDocument();

    function chipText(text: string): HTMLElement {
      return within(counters).getByText(
        (_, element) => element?.tagName === "SPAN" && element.textContent === text,
      );
    }

    expect(chipText("1 caught")).toBeInTheDocument();
    expect(chipText("1 missed")).toBeInTheDocument();
    expect(chipText("0 fainted")).toBeInTheDocument();
    expect(chipText("1 pending")).toBeInTheDocument();
  });

  it("shows a message instead of a blank table when a filter matches nothing", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    await adapter.routes.put(makeRouteDraft(run.id, { name: "New Bark Town", order: 100 }));

    renderScreen(adapter, run.id);

    await findRouteInList("New Bark Town");

    const counters = screen.getByRole("group", { name: "Route counters" });
    await userEvent.click(within(counters).getByRole("button", { name: /caught/i }));

    expect(await screen.findByText("No routes match the selected filters.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("has no Filter button or checkbox panel", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    await adapter.routes.put(makeRouteDraft(run.id, { name: "New Bark Town", order: 100 }));

    renderScreen(adapter, run.id);

    await findRouteInList("New Bark Town");

    expect(screen.queryByRole("button", { name: "Filter" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("narrows the list to routes whose name matches, case-insensitively and anywhere in the name", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    await adapter.routes.put(makeRouteDraft(run.id, { name: "Route 29", order: 100 }));
    await adapter.routes.put(makeRouteDraft(run.id, { name: "Union Cave", order: 200 }));
    await adapter.routes.put(makeRouteDraft(run.id, { name: "Route 30", order: 300 }));

    renderScreen(adapter, run.id);

    await findRouteInList("Route 29");

    await userEvent.type(screen.getByLabelText("Search routes"), "CAVE");

    const list = screen.getByRole("list");
    expect(within(list).getByText("Union Cave")).toBeInTheDocument();
    expect(within(list).queryByText("Route 29")).not.toBeInTheDocument();
    expect(within(list).queryByText("Route 30")).not.toBeInTheDocument();
  });

  it("finds a custom route by name too", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    await adapter.routes.put(makeRouteDraft(run.id, { name: "Route 29", order: 100 }));
    await adapter.routes.put(
      makeRouteDraft(run.id, { name: "Secret Cave", order: 200, isCustom: true }),
    );

    renderScreen(adapter, run.id);

    await findRouteInList("Route 29");

    await userEvent.type(screen.getByLabelText("Search routes"), "secret");

    const list = screen.getByRole("list");
    expect(within(list).getByText("Secret Cave")).toBeInTheDocument();
    expect(within(list).queryByText("Route 29")).not.toBeInTheDocument();
  });

  it("clears the search with the × button, restoring the full list", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    await adapter.routes.put(makeRouteDraft(run.id, { name: "Route 29", order: 100 }));
    await adapter.routes.put(makeRouteDraft(run.id, { name: "Union Cave", order: 200 }));

    renderScreen(adapter, run.id);

    await findRouteInList("Route 29");

    const searchBox = screen.getByLabelText("Search routes");
    await userEvent.type(searchBox, "cave");
    expect(within(screen.getByRole("list")).queryByText("Route 29")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(searchBox).toHaveValue("");
    const list = screen.getByRole("list");
    expect(within(list).getByText("Route 29")).toBeInTheDocument();
    expect(within(list).getByText("Union Cave")).toBeInTheDocument();
  });

  it("clears the search with Escape while the box has focus", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    await adapter.routes.put(makeRouteDraft(run.id, { name: "Route 29", order: 100 }));
    await adapter.routes.put(makeRouteDraft(run.id, { name: "Union Cave", order: 200 }));

    renderScreen(adapter, run.id);

    await findRouteInList("Route 29");

    const searchBox = screen.getByLabelText("Search routes");
    await userEvent.type(searchBox, "cave");
    expect(within(screen.getByRole("list")).queryByText("Route 29")).not.toBeInTheDocument();

    await userEvent.keyboard("{Escape}");

    expect(searchBox).toHaveValue("");
    expect(within(screen.getByRole("list")).getByText("Route 29")).toBeInTheDocument();
  });

  it("combines the search with an active chip filter as an AND, without moving the counts", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    const caughtCave = await adapter.routes.put(
      makeRouteDraft(run.id, { name: "Union Cave", order: 100 }),
    );
    const caughtEncounter = await adapter.encounters.put(
      makeEncounterDraft(run.id, caughtCave.id, { status: "caught" }),
    );
    await adapter.mons.put(makeMonDraft(run.id, caughtEncounter.id));
    const missedCave = await adapter.routes.put(
      makeRouteDraft(run.id, { name: "Dark Cave", order: 200 }),
    );
    await adapter.encounters.put(makeEncounterDraft(run.id, missedCave.id, { status: "missed" }));
    await adapter.routes.put(makeRouteDraft(run.id, { name: "Route 29", order: 300 }));

    renderScreen(adapter, run.id);

    await findRouteInList("Union Cave");

    const counters = screen.getByRole("group", { name: "Route counters" });
    await userEvent.click(within(counters).getByRole("button", { name: /caught/i }));
    await userEvent.type(screen.getByLabelText("Search routes"), "cave");

    const list = screen.getByRole("list");
    expect(within(list).getByText("Union Cave")).toBeInTheDocument();
    expect(within(list).queryByText("Dark Cave")).not.toBeInTheDocument();
    expect(within(list).queryByText("Route 29")).not.toBeInTheDocument();

    function chipText(text: string): HTMLElement {
      return within(counters).getByText(
        (_, element) => element?.tagName === "SPAN" && element.textContent === text,
      );
    }

    expect(chipText("1 caught")).toBeInTheDocument();
    expect(chipText("1 missed")).toBeInTheDocument();
    expect(chipText("1 pending")).toBeInTheDocument();
  });

  it("shows a message naming the search when nothing matches", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    await adapter.routes.put(makeRouteDraft(run.id, { name: "New Bark Town", order: 100 }));

    renderScreen(adapter, run.id);

    await findRouteInList("New Bark Town");

    await userEvent.type(screen.getByLabelText("Search routes"), "xyz");

    expect(await screen.findByText('No routes match "xyz".')).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("does not remember the search after leaving and returning to the screen", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    await adapter.routes.put(makeRouteDraft(run.id, { name: "Route 29", order: 100 }));
    await adapter.routes.put(makeRouteDraft(run.id, { name: "Union Cave", order: 200 }));

    const { unmount } = renderScreen(adapter, run.id);

    await findRouteInList("Route 29");
    await userEvent.type(screen.getByLabelText("Search routes"), "cave");
    expect(within(screen.getByRole("list")).queryByText("Route 29")).not.toBeInTheDocument();

    unmount();
    renderScreen(adapter, run.id);

    await findRouteInList("Route 29");
    expect(within(screen.getByRole("list")).getByText("Union Cave")).toBeInTheDocument();
    expect(await screen.findByLabelText("Search routes")).toHaveValue("");
  });

  it("still shows route and species names when PokéAPI is down, with no type badge", async () => {
    stubPokeApi({});
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    const route = await adapter.routes.put(
      makeRouteDraft(run.id, { name: "New Bark Town", order: 100 }),
    );
    const encounter = await adapter.encounters.put(
      makeEncounterDraft(run.id, route.id, { status: "caught" }),
    );
    const mon = await adapter.mons.put(makeMonDraft(run.id, encounter.id));
    await adapter.encounters.put({ ...encounter, monId: mon.id });

    renderScreen(adapter, run.id);

    await findRouteInList("New Bark Town");
    expect(await findRouteInList("Chikorita")).toBeInTheDocument();
    expect(screen.queryByText("grass")).not.toBeInTheDocument();
  });

  it("resets a caught route back to not encountered and removes its mon", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft());
    const route = await adapter.routes.put(
      makeRouteDraft(run.id, { name: "New Bark Town", order: 100 }),
    );
    const encounter = await adapter.encounters.put(
      makeEncounterDraft(run.id, route.id, { status: "caught" }),
    );
    const mon = await adapter.mons.put(makeMonDraft(run.id, encounter.id));
    await adapter.encounters.put({ ...encounter, monId: mon.id });

    renderScreen(adapter, run.id);

    await findRouteInList("New Bark Town");
    const item = routeItem("New Bark Town");
    const resetTrigger = await within(item).findByRole("button", {
      name: "Reset New Bark Town",
    });
    await userEvent.click(resetTrigger);

    const resetButton = await screen.findByRole("button", { name: "Reset encounter" });
    await waitFor(() => {
      expect(resetButton).toBeEnabled();
    });
    await userEvent.click(resetButton);

    await waitFor(async () => {
      expect(await adapter.mons.get(mon.id)).toBeUndefined();
    });
    expect(await adapter.encounters.get(encounter.id)).toBeUndefined();

    const resetItem = routeItem("New Bark Town");
    expect(within(resetItem).getByRole("button", { name: "Log encounter" })).toBeInTheDocument();
  });
});
