/**
 * Covers `run-list-screen.tsx`: the empty state, one card per run with its own derived counts,
 * and the per-card action link. Each card's counts come from its own `useEncounters`/`useMons`/
 * `useDeaths` queries against the in-memory adapter (spec §10) — this is what actually proves no
 * new aggregate query key crept in, since a bug there would show up as every card sharing one
 * run's numbers.
 *
 * jsdom does not evaluate CSS media queries, so there is no test here asserting how the grid
 * looks at a given viewport width — see CLAUDE.md's Testing section.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
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

  it("renders one card per run, each with its own routes/party/boxed/dead counts", async () => {
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

    const silverCard = screen.getByRole("heading", { name: "Silver Nuzlocke" }).closest("li");
    const goldCard = screen.getByRole("heading", { name: "Gold Nuzlocke" }).closest("li");
    if (!silverCard || !goldCard) {
      throw new Error("Expected both run cards to render as list items.");
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
});
