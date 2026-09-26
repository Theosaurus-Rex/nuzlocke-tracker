/**
 * Row-level proof that delete removes every table's rows lives in `src/storage/queries.test.tsx`.
 * jsdom does not evaluate CSS media queries, so there is no test here for the grid's breakpoint.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  createMemoryRouter,
  MemoryRouter,
  RouterProvider,
  Route as RouterRoute,
  Routes,
} from "react-router";

import { summariseRun } from "@/domain/derive";
import type { Death, Encounter, Mon, Route, Run, Rules } from "@/domain/types";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";
import type { StorageAdapter } from "@/storage/adapter";

import { RunListScreen } from "./run-list-screen";

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
  overrides: Partial<Route> = {},
): Omit<Route, "id" | "createdAt" | "updatedAt"> {
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
  overrides: Partial<Mon> = {},
): Omit<Mon, "id" | "createdAt" | "updatedAt"> {
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
    ...overrides,
  };
}

function makeDeathDraft(
  runId: string,
  monId: string,
  overrides: Partial<Death> = {},
): Omit<Death, "id" | "createdAt" | "updatedAt"> {
  return {
    runId,
    monId,
    level: 10,
    routeId: null,
    cause: { type: "wild", species: "geodude", level: 10, move: "Rock Throw" },
    diedAt: "2026-01-01T00:00:00.000Z",
    notes: null,
    ...overrides,
  };
}

/** Maps each stat's label to its value, read out of the card's `<dl>` so assertions don't have
 * to guess which `getByText("1")` match is which stat. */
function statsIn(card: HTMLElement): Record<string, string> {
  const dl = card.querySelector("dl");
  if (!dl) {
    throw new Error("Expected the card to contain a <dl> of stats.");
  }
  const stats: Record<string, string> = {};
  for (const entry of dl.querySelectorAll(":scope > div")) {
    const label = entry.querySelector("dt")?.textContent;
    const value = entry.querySelector("dd")?.textContent;
    if (label && value !== undefined && value !== null) {
      stats[label] = value;
    }
  }
  return stats;
}

function renderScreen(adapter: StorageAdapter) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <StorageProvider adapter={adapter}>
        <MemoryRouter initialEntries={["/"]}>
          <RunListScreen />
        </MemoryRouter>
      </StorageProvider>
    </QueryClientProvider>,
  );
}

function renderRouted(adapter: StorageAdapter, initialEntries: string[] = ["/"]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: "/", element: <RunListScreen /> },
      { path: "/runs/new", element: <p>New run screen</p> },
    ],
    { initialEntries },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <StorageProvider adapter={adapter}>
        <RouterProvider router={router} />
      </StorageProvider>
    </QueryClientProvider>,
  );
  return { router };
}

describe("RunListScreen", () => {
  it("replaces / with /runs/new when the runs query comes back empty", async () => {
    const adapter = createMemoryAdapter();
    const { router } = renderRouted(adapter);

    await screen.findByText("New run screen");
    expect(router.state.location.pathname).toBe("/runs/new");

    // Replaced, not pushed: there is nothing before it to go back to, so Back cannot bounce
    // to the empty home page.
    await router.navigate(-1);
    expect(router.state.location.pathname).toBe("/runs/new");
  });

  it("does not redirect while the runs query is still loading", async () => {
    const adapter = createMemoryAdapter();
    const pending: { resolve: (runs: Run[]) => void } = { resolve: () => undefined };
    vi.spyOn(adapter.runs, "getAll").mockReturnValueOnce(
      new Promise<Run[]>((resolve) => {
        pending.resolve = resolve;
      }),
    );

    const { router } = renderRouted(adapter);

    expect(await screen.findByText(/loading runs/i)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");

    pending.resolve([]);

    await screen.findByText("New run screen");
    expect(router.state.location.pathname).toBe("/runs/new");
  });

  it("stays on the home page and shows the error when the runs query fails, without redirecting", async () => {
    const adapter = createMemoryAdapter();
    vi.spyOn(adapter.runs, "getAll").mockRejectedValueOnce(new Error("indexeddb unavailable"));

    const { router } = renderRouted(adapter);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load runs: indexeddb unavailable.",
    );
    expect(router.state.location.pathname).toBe("/");
    expect(screen.queryByText("New run screen")).not.toBeInTheDocument();
  });

  it("shows the run list with no flash of new-run setup when runs already exist", async () => {
    const adapter = createMemoryAdapter();
    await adapter.runs.put(makeRunDraft({ name: "Blaze Nuzlocke", status: "active" }));

    const { router } = renderRouted(adapter);

    await screen.findByRole("heading", { name: "Runs" });
    expect(screen.queryByText("New run screen")).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });

  it("shows a New run control in the header, pointing at /runs/new, even when runs already exist", async () => {
    const adapter = createMemoryAdapter();
    await adapter.runs.put(makeRunDraft({ name: "Blaze Nuzlocke", status: "active" }));

    renderScreen(adapter);

    await screen.findByRole("heading", { name: "Runs" });
    const link = screen.getByRole("link", { name: "New run" });
    expect(link).toHaveAttribute("href", "/runs/new");
  });

  it("navigates to the new-run screen when the header New run control is clicked", async () => {
    const adapter = createMemoryAdapter();
    await adapter.runs.put(makeRunDraft({ name: "Blaze Nuzlocke", status: "active" }));

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <StorageProvider adapter={adapter}>
          <MemoryRouter initialEntries={["/"]}>
            <Routes>
              <RouterRoute path="/" element={<RunListScreen />} />
              <RouterRoute path="/runs/new" element={<p>New run screen</p>} />
            </Routes>
          </MemoryRouter>
        </StorageProvider>
      </QueryClientProvider>,
    );

    await screen.findByRole("heading", { name: "Runs" });
    await userEvent.click(screen.getByRole("link", { name: "New run" }));

    expect(await screen.findByText("New run screen")).toBeInTheDocument();
  });

  it("renders one card per run on its matching tab, each with its own routes/party/boxed/dead counts", async () => {
    const adapter = createMemoryAdapter();

    const runA = await adapter.runs.put(
      makeRunDraft({ name: "Silver Nuzlocke", status: "active" }),
    );
    const routeA = await adapter.routes.put(makeRouteDraft(runA.id));
    await adapter.encounters.put(makeEncounterDraft(runA.id, routeA.id, { status: "caught" }));
    await adapter.mons.put(makeMonDraft(runA.id, { status: "party" }));

    const runB = await adapter.runs.put(
      makeRunDraft({
        name: "Gold Nuzlocke",
        status: "finished",
        finishedAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    const routeB1 = await adapter.routes.put(
      makeRouteDraft(runB.id, { name: "Route 1", order: 1 }),
    );
    const routeB2 = await adapter.routes.put(
      makeRouteDraft(runB.id, { name: "Route 2", order: 2 }),
    );
    await adapter.encounters.put(makeEncounterDraft(runB.id, routeB1.id, { status: "caught" }));
    await adapter.encounters.put(makeEncounterDraft(runB.id, routeB2.id, { status: "missed" }));
    const boxedMon = await adapter.mons.put(
      makeMonDraft(runB.id, { status: "box", partySlot: null }),
    );
    const deadMon = await adapter.mons.put(
      makeMonDraft(runB.id, { status: "dead", partySlot: null }),
    );
    await adapter.deaths.put(makeDeathDraft(runB.id, deadMon.id));

    renderScreen(adapter);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Silver Nuzlocke" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("heading", { name: "Gold Nuzlocke" })).not.toBeInTheDocument();

    const silverCard = screen.getByRole("heading", { name: "Silver Nuzlocke" }).closest("li");
    if (!silverCard) {
      throw new Error("Expected the Silver run card to render as a list item.");
    }

    await waitFor(() => {
      expect(statsIn(silverCard)).toEqual({
        routes: "1/1",
        Party: "1",
        Boxed: "0",
        Dead: "0",
      });
    });
    expect(within(silverCard).getByRole("link", { name: "Resume" })).toHaveAttribute(
      "href",
      `/runs/${runA.id}/routes`,
    );
    expect(within(silverCard).getByText("active")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /Finished/ }));
    const goldCard = (await screen.findByRole("heading", { name: "Gold Nuzlocke" })).closest("li");
    if (!goldCard) {
      throw new Error("Expected the Gold run card to render as a list item.");
    }
    expect(screen.queryByRole("heading", { name: "Silver Nuzlocke" })).not.toBeInTheDocument();

    // Distinct counts from Silver's card, proving each card computed its own numbers rather
    // than sharing state.
    await waitFor(() => {
      expect(statsIn(goldCard)).toEqual({
        routes: "2/2",
        Party: "0",
        Boxed: "1",
        Dead: "1",
      });
    });
    expect(within(goldCard).getByRole("link", { name: "View" })).toHaveAttribute(
      "href",
      `/runs/${runB.id}/routes`,
    );
    expect(within(goldCard).getByText("complete")).toBeInTheDocument();

    expect(boxedMon.status).toBe("box");
  });

  it("shows a count on each tab, and filters within the selected tab by name (case-insensitive)", async () => {
    const adapter = createMemoryAdapter();
    await adapter.runs.put(makeRunDraft({ name: "Blaze Nuzlocke", status: "active" }));
    await adapter.runs.put(makeRunDraft({ name: "Ember Nuzlocke", status: "active" }));
    await adapter.runs.put(makeRunDraft({ name: "Crystal Nuzlocke", status: "finished" }));

    renderScreen(adapter);

    expect(await screen.findByRole("tab", { name: "Active (2)" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Finished (1)" })).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Blaze Nuzlocke" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ember Nuzlocke" })).toBeInTheDocument();

    await userEvent.type(screen.getByRole("searchbox", { name: /search runs/i }), "BLAZE");

    expect(screen.getByRole("heading", { name: "Blaze Nuzlocke" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ember Nuzlocke" })).not.toBeInTheDocument();

    // Search is scoped to the current tab: it doesn't surface Crystal (finished).
    expect(screen.queryByRole("heading", { name: "Crystal Nuzlocke" })).not.toBeInTheDocument();
  });

  it("requires an explicit confirmation naming the run and the numbers lost before deleting", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft({ name: "Blaze Nuzlocke", status: "active" }));
    const route = await adapter.routes.put(makeRouteDraft(run.id));
    await adapter.encounters.put(makeEncounterDraft(run.id, route.id, { status: "caught" }));
    await adapter.encounters.put(makeEncounterDraft(run.id, route.id, { status: "missed" }));
    await adapter.mons.put(makeMonDraft(run.id, { status: "party" }));
    const deadMon = await adapter.mons.put(
      makeMonDraft(run.id, { status: "dead", partySlot: null }),
    );
    await adapter.deaths.put(makeDeathDraft(run.id, deadMon.id));

    renderScreen(adapter);

    await screen.findByRole("heading", { name: "Blaze Nuzlocke" });

    // Clicking "Delete" alone only opens the confirmation. It must not delete anything by itself.
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(await adapter.runs.get(run.id)).toBeDefined();

    expect(
      screen.getByText(
        "Permanently delete Blaze Nuzlocke? This removes 2 encounters, 2 Pokémon and 1 death. This cannot be undone.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /export a backup/i })).toHaveAttribute(
      "href",
      "/settings",
    );

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText(/permanently delete/i)).not.toBeInTheDocument();
    expect(await adapter.runs.get(run.id)).toBeDefined();
    expect(screen.getByRole("heading", { name: "Blaze Nuzlocke" })).toBeInTheDocument();
  });

  it("shows a death count in the delete confirmation that matches summariseRun for the same fixture", async () => {
    // Distinct from the test above on purpose: asserts the death count against a real
    // `summariseRun` call on the same rows, not a hand-written literal, so a counting
    // implementation that drifts from `summariseRun`'s dead count would fail here.
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(
      makeRunDraft({ name: "Crystal Nuzlocke", status: "active" }),
    );
    const mons = [
      await adapter.mons.put(makeMonDraft(run.id, { status: "party" })),
      await adapter.mons.put(makeMonDraft(run.id, { status: "dead", partySlot: null })),
      await adapter.mons.put(makeMonDraft(run.id, { status: "dead", partySlot: null })),
    ];
    const encounters: Encounter[] = [];
    const expected = summariseRun({ encounters, mons });

    renderScreen(adapter);
    await screen.findByRole("heading", { name: "Crystal Nuzlocke" });

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(
      screen.getByText(
        `Permanently delete Crystal Nuzlocke? This removes 0 encounters, 3 Pokémon and ${expected.dead} deaths. This cannot be undone.`,
      ),
    ).toBeInTheDocument();
  });

  it("deletes a run on confirmation and removes it from the list without a manual refetch, leaving the other run intact", async () => {
    const adapter = createMemoryAdapter();
    const doomed = await adapter.runs.put(
      makeRunDraft({ name: "Blaze Nuzlocke", status: "active" }),
    );
    const survivor = await adapter.runs.put(
      makeRunDraft({ name: "Ember Nuzlocke", status: "active" }),
    );

    renderScreen(adapter);

    await screen.findByRole("heading", { name: "Blaze Nuzlocke" });
    const doomedCard = screen.getByRole("heading", { name: "Blaze Nuzlocke" }).closest("li");
    if (!doomedCard) {
      throw new Error("Expected the Blaze run card to render as a list item.");
    }

    await userEvent.click(within(doomedCard).getByRole("button", { name: "Delete" }));
    await userEvent.click(within(doomedCard).getByRole("button", { name: "Delete permanently" }));

    // Gone without a manual refetch, and the tab count drops.
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Blaze Nuzlocke" })).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Active (1)" })).toBeInTheDocument();
    });

    expect(await adapter.runs.get(doomed.id)).toBeUndefined();

    expect(screen.getByRole("heading", { name: "Ember Nuzlocke" })).toBeInTheDocument();
    expect(await adapter.runs.get(survivor.id)).toEqual(survivor);
  });
});
