/**
 * Covers `run-list-screen.tsx`: the empty state, one card per run with its own derived counts,
 * the per-card action link, and (PER-14) search, the Active/Finished tabs, and delete. Each
 * card's counts come from its own `useEncounters`/`useMons` queries against the in-memory adapter
 * (spec §10) — this is what actually proves no new aggregate query key crept in, since a bug there
 * would show up as every card sharing one run's numbers.
 *
 * Row-level proof that delete removes every table's rows (and leaves another run's rows alone)
 * lives in `src/storage/queries.test.tsx`, against the adapter directly — this file only covers
 * the screen's own wiring: the confirmation gate, the numbers shown in it, and the card
 * disappearing without a manual refetch.
 *
 * jsdom does not evaluate CSS media queries, so there is no test here asserting how the grid
 * looks at a given viewport width — see CLAUDE.md's Testing section.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";

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

/** Maps each stat's label ("Routes covered", "Party", …) to its value, read out of the card's
 * `<dl>` so assertions don't have to guess which `getByText("1")` match is which stat. */
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

describe("RunListScreen", () => {
  it("shows a functional empty state with a link to /runs/new when there are no runs", async () => {
    const adapter = createMemoryAdapter();
    renderScreen(adapter);

    expect(await screen.findByText(/no runs yet/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /start a new run/i });
    expect(link).toHaveAttribute("href", "/runs/new");
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

    // Active tab is selected by default: only Silver (active) shows.
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Silver Nuzlocke" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("heading", { name: "Gold Nuzlocke" })).not.toBeInTheDocument();

    const silverCard = screen.getByRole("heading", { name: "Silver Nuzlocke" }).closest("li");
    if (!silverCard) {
      throw new Error("Expected the Silver run card to render as a list item.");
    }

    // Silver: 1 route covered, 1 party, 0 boxed, 0 dead.
    await waitFor(() => {
      expect(statsIn(silverCard)).toEqual({
        "Routes covered": "1",
        Party: "1",
        Boxed: "0",
        Dead: "0",
      });
    });
    expect(within(silverCard).getByRole("link", { name: "Resume" })).toHaveAttribute(
      "href",
      `/runs/${runA.id}/routes`,
    );

    // Switch to Finished: Gold (finished) shows, Silver (active) no longer does.
    await userEvent.click(screen.getByRole("tab", { name: /Finished/ }));
    const goldCard = (await screen.findByRole("heading", { name: "Gold Nuzlocke" })).closest("li");
    if (!goldCard) {
      throw new Error("Expected the Gold run card to render as a list item.");
    }
    expect(screen.queryByRole("heading", { name: "Silver Nuzlocke" })).not.toBeInTheDocument();

    // Gold: 2 routes covered, 0 party, 1 boxed, 1 dead — proves each card computed its OWN
    // numbers rather than sharing Silver's.
    await waitFor(() => {
      expect(statsIn(goldCard)).toEqual({
        "Routes covered": "2",
        Party: "0",
        Boxed: "1",
        Dead: "1",
      });
    });
    expect(within(goldCard).getByRole("link", { name: "View" })).toHaveAttribute(
      "href",
      `/runs/${runB.id}/routes`,
    );

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

    // Both active runs show before searching.
    expect(screen.getByRole("heading", { name: "Blaze Nuzlocke" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ember Nuzlocke" })).toBeInTheDocument();

    await userEvent.type(screen.getByRole("searchbox", { name: /search runs/i }), "BLAZE");

    expect(screen.getByRole("heading", { name: "Blaze Nuzlocke" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ember Nuzlocke" })).not.toBeInTheDocument();

    // The search is scoped to the current tab: it does not surface Crystal (finished).
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

    // The run survives until the destructive click is made — clicking "Delete" alone only opens
    // the confirmation, it must not delete anything by itself.
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(await adapter.runs.get(run.id)).toBeDefined();

    // Names the run and the real numbers being lost: 2 encounters, 2 mons, 1 death.
    expect(
      screen.getByText(
        "Permanently delete Blaze Nuzlocke? This removes 2 encounters, 2 Pokémon and 1 death. This cannot be undone.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /export a backup/i })).toHaveAttribute(
      "href",
      "/settings",
    );

    // Cancelling leaves the run untouched.
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText(/permanently delete/i)).not.toBeInTheDocument();
    expect(await adapter.runs.get(run.id)).toBeDefined();
    expect(screen.getByRole("heading", { name: "Blaze Nuzlocke" })).toBeInTheDocument();
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

    // Gone from the screen without a page reload or manual refetch, and the tab count drops.
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Blaze Nuzlocke" })).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Active (1)" })).toBeInTheDocument();
    });

    expect(await adapter.runs.get(doomed.id)).toBeUndefined();

    // The other run is untouched.
    expect(screen.getByRole("heading", { name: "Ember Nuzlocke" })).toBeInTheDocument();
    expect(await adapter.runs.get(survivor.id)).toEqual(survivor);
  });
});
