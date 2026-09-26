/**
 * jsdom does not evaluate CSS media queries, so there is no test here asserting which nav variant
 * is visible at a given width. That needs a visual or Playwright check, not a jsdom unit test.
 */

import { createMemoryRouter, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { summariseRun } from "@/domain/derive";
import type { Encounter, Mon, Route, Run, Rules } from "@/domain/types";
import { createMemoryAdapter } from "@/storage/memory-adapter";
import { invalidateRun } from "@/storage/queries";
import type { StorageAdapter } from "@/storage/adapter";
import { StorageProvider } from "@/storage/storage-context";

import { navItemsFor } from "./nav-items";
import { appRoutes } from "./router";
import { CURRENT_RUN_STORAGE_KEY } from "./use-current-run-id";

/**
 * Both providers are required: the settings route reads storage through TanStack Query and
 * would throw without them, even though this suite mostly tests routing. `adapter` and
 * `queryClient` are optional so a test can seed data first, or reuse the client to invalidate.
 */
function renderAt(
  initialPath: string,
  options: { adapter?: StorageAdapter; queryClient?: QueryClient } = {},
) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [initialPath] });
  const queryClient =
    options.queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const adapter = options.adapter ?? createMemoryAdapter();
  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <StorageProvider adapter={adapter}>
        <RouterProvider router={router} />
      </StorageProvider>
    </QueryClientProvider>,
  );
  return { router, unmount: rendered.unmount, queryClient, adapter };
}

/** Excludes the sidebar's pinned "New run" link, which isn't a routed nav item and has its own
 * tests below. Reads the label from its own span, since a nav row's full `textContent` also
 * includes its counter. */
function linksIn(nav: HTMLElement) {
  return within(nav)
    .getAllByRole("link")
    .filter((link) => link.closest('[data-slot="sidebar-actions"]') === null)
    .map((link) => ({
      label: link.querySelector('[data-slot="nav-label"]')?.textContent ?? link.textContent,
      href: link.getAttribute("href"),
    }));
}

function shells() {
  return {
    sidebar: screen.getByRole("navigation", { name: "Sidebar navigation" }),
    tabBar: screen.getByRole("navigation", { name: "Tab bar navigation" }),
  };
}

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

/** Reads a nav's row counters into a label -> value map, scoped to `scope` so the sidebar and
 * the tab bar can be asserted on independently. Counters are `aria-hidden` (the row's accessible
 * name stays just its label), so this reads the DOM directly rather than through a role query. */
function countersIn(scope: HTMLElement): Record<string, string> {
  const counters: Record<string, string> = {};
  for (const row of scope.querySelectorAll("a")) {
    const label = row.querySelector('[data-slot="nav-label"]')?.textContent;
    const value = row.querySelector('[data-slot="nav-counter"]')?.textContent;
    if (label && value !== undefined && value !== null) {
      counters[label] = value;
    }
  }
  return counters;
}

describe("AppShell navigation", () => {
  it("renders the global nav items in both shells when there is no active run", () => {
    renderAt("/");

    const { sidebar, tabBar } = shells();
    const expected = navItemsFor(undefined).map((item) => ({
      label: item.label,
      href: item.to,
    }));

    expect(linksIn(sidebar)).toEqual(expected);
    expect(linksIn(tabBar)).toEqual(expected);
  });

  it("renders the run's screens plus a way back to the run list, in both shells", () => {
    renderAt("/runs/run-123/party");

    const { sidebar, tabBar } = shells();

    // Compare the two renderings against each other, not against a duplicated literal.
    expect(linksIn(sidebar)).toEqual(linksIn(tabBar));

    const hrefs = linksIn(sidebar).map((link) => link.href);
    expect(hrefs).toEqual([
      "/",
      "/runs/run-123/routes",
      "/runs/run-123/party",
      "/runs/run-123/boxes",
      "/runs/run-123/graveyard",
      "/runs/run-123/fights",
    ]);
  });

  it.each([["Sidebar navigation" as const], ["Tab bar navigation" as const]])(
    "lets %s out of a run, so Settings and its JSON export stay reachable",
    async (navLabel) => {
      const adapter = createMemoryAdapter();
      await adapter.runs.put(makeRunDraft({ name: "Johto Hardcore" }));
      const { router } = renderAt("/runs/run-123/party", { adapter });

      const nav = await screen.findByRole("navigation", { name: navLabel });
      await userEvent.click(within(nav).getByRole("link", { name: "Runs" }));

      await waitFor(() => {
        expect(router.state.location.pathname).toBe("/");
      });

      const navAfter = screen.getByRole("navigation", { name: navLabel });
      expect(within(navAfter).getByRole("link", { name: "Settings" })).toHaveAttribute(
        "href",
        "/settings",
      );
    },
  );

  it("links each global nav item to its configured path", () => {
    renderAt("/");

    for (const item of navItemsFor(undefined)) {
      const links = screen.getAllByRole("link", { name: item.label });
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        expect(link.getAttribute("href")).toBe(item.to);
      }
    }
  });

  it("marks the active route in both the sidebar and the tab bar outside a run", () => {
    renderAt("/settings");

    const { sidebar, tabBar } = shells();

    for (const nav of [sidebar, tabBar]) {
      const settingsLink = within(nav).getByRole("link", { name: "Settings" });
      const runsLink = within(nav).getByRole("link", { name: "Runs" });
      expect(settingsLink).toHaveAttribute("aria-current", "page");
      expect(runsLink).not.toHaveAttribute("aria-current");
    }
  });

  it("marks the active screen in both shells within a run", () => {
    renderAt("/runs/run-123/boxes");

    const { sidebar, tabBar } = shells();

    for (const nav of [sidebar, tabBar]) {
      const boxesLink = within(nav).getByRole("link", { name: "Boxes" });
      const partyLink = within(nav).getByRole("link", { name: "Party" });
      expect(boxesLink).toHaveAttribute("aria-current", "page");
      expect(partyLink).not.toHaveAttribute("aria-current");
    }
  });

  it("updates the nav hrefs when switching runs", () => {
    const first = renderAt("/runs/run-a/party");
    expect(linksIn(shells().sidebar).map((link) => link.href)).toEqual([
      "/",
      "/runs/run-a/routes",
      "/runs/run-a/party",
      "/runs/run-a/boxes",
      "/runs/run-a/graveyard",
      "/runs/run-a/fights",
    ]);
    first.unmount();

    renderAt("/runs/run-b/party");
    expect(linksIn(shells().sidebar).map((link) => link.href)).toEqual([
      "/",
      "/runs/run-b/routes",
      "/runs/run-b/party",
      "/runs/run-b/boxes",
      "/runs/run-b/graveyard",
      "/runs/run-b/fights",
    ]);
  });

  it("redirects /runs/:runId to /runs/:runId/routes", async () => {
    const { router } = renderAt("/runs/run-123");

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-123/routes");
    });
    expect(screen.getByRole("heading", { name: "Encounter routes" })).toBeInTheDocument();
  });

  it("renders the not-found screen for an unknown path", () => {
    renderAt("/this-path-does-not-exist");

    expect(screen.getByRole("heading", { name: "Not Found" })).toBeInTheDocument();
  });

  it("exposes a New run link pinned in the sidebar, pointing at /runs/new, even when a run already exists", async () => {
    const adapter = createMemoryAdapter();
    await adapter.runs.put(makeRunDraft({ name: "Silver Nuzlocke" }));

    renderAt("/", { adapter });

    const sidebar = await screen.findByRole("navigation", { name: "Sidebar navigation" });
    const link = within(sidebar).getByRole("link", { name: "New run" });
    expect(link).toHaveAttribute("href", "/runs/new");

    // Not in the tab bar: the mobile shell has no room for it, so mobile is covered by the run
    // list's own header control instead.
    const tabBar = screen.getByRole("navigation", { name: "Tab bar navigation" });
    expect(within(tabBar).queryByRole("link", { name: "New run" })).not.toBeInTheDocument();
  });

  it("reaches Settings from inside a run without going back to the run list first", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft({ name: "Johto Hardcore" }));

    renderAt(`/runs/${run.id}/routes`, { adapter });

    const sidebar = await screen.findByRole("navigation", { name: "Sidebar navigation" });
    expect(within(sidebar).getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("navigates to the new-run screen when the sidebar New run link is clicked", async () => {
    const { router } = renderAt("/");

    const sidebar = screen.getByRole("navigation", { name: "Sidebar navigation" });
    await userEvent.click(within(sidebar).getByRole("link", { name: "New run" }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/new");
    });
  });

  it.each([["Sidebar navigation" as const], ["Tab bar navigation" as const]])(
    "keeps Settings reachable from new-run setup with no runs, in %s",
    async (navLabel) => {
      renderAt("/");

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "New run" })).toBeInTheDocument();
      });

      const nav = screen.getByRole("navigation", { name: navLabel });
      expect(within(nav).getByRole("link", { name: "Settings" })).toHaveAttribute(
        "href",
        "/settings",
      );
    },
  );

  it("does not mark the Runs nav row active once redirected to new-run setup, and settling there does not stack an extra history entry", async () => {
    const { router } = renderAt("/");

    await screen.findByRole("heading", { name: "New run" });
    expect(router.state.location.pathname).toBe("/runs/new");

    const sidebar = screen.getByRole("navigation", { name: "Sidebar navigation" });
    expect(within(sidebar).getByRole("link", { name: "Runs" })).not.toHaveAttribute("aria-current");

    // Replaced in place, so there is nothing behind it for Back to land on.
    await router.navigate(-1);
    expect(router.state.location.pathname).toBe("/runs/new");
  });
});

describe("Run switcher and live counters", () => {
  it("shows no counters when there is no active run", async () => {
    const adapter = createMemoryAdapter();
    await adapter.runs.put(makeRunDraft({ name: "Silver Nuzlocke" }));

    renderAt("/", { adapter });

    const sidebar = screen.getByRole("navigation", { name: "Sidebar navigation" });
    expect(
      await within(sidebar).findByRole("option", { name: "Silver Nuzlocke" }),
    ).toBeInTheDocument();
    expect(countersIn(sidebar)).toEqual({});

    // No mobile mount at all outside a run: the tab bar's own "Runs" destination covers it.
    expect(screen.queryAllByRole("combobox", { name: "Switch run" })).toHaveLength(1);
  });

  it("shows the active run's routes/party/boxes/graveyard counters, matching summariseRun for the same fixture", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft({ name: "Silver Nuzlocke" }));
    const routeA = await adapter.routes.put(makeRouteDraft(run.id, { name: "Route 29" }));
    const routeB = await adapter.routes.put(makeRouteDraft(run.id, { name: "Route 30", order: 2 }));
    const routes = [routeA, routeB];
    const encounters = [
      await adapter.encounters.put(makeEncounterDraft(run.id, routeA.id, { status: "caught" })),
      await adapter.encounters.put(makeEncounterDraft(run.id, routeB.id, { status: "missed" })),
    ];
    const mons = [
      await adapter.mons.put(makeMonDraft(run.id, { status: "party" })),
      await adapter.mons.put(makeMonDraft(run.id, { status: "box", partySlot: null })),
      await adapter.mons.put(makeMonDraft(run.id, { status: "dead", partySlot: null })),
    ];

    // Asserted against a real `summariseRun` call on the same rows, not hand-written literals, so
    // a second counting implementation that drifts from `summariseRun` would fail this.
    const expected = summariseRun({ encounters, mons });

    renderAt(`/runs/${run.id}/party`, { adapter });

    const sidebar = await screen.findByRole("navigation", { name: "Sidebar navigation" });
    await waitFor(() => {
      expect(countersIn(sidebar)).toEqual({
        Routes: `${String(expected.routesCovered)}/${String(routes.length)}`,
        Party: String(expected.party),
        Boxes: String(expected.boxed),
        Graveyard: String(expected.dead),
      });
    });
  });

  it("changes the counters when the active run changes", async () => {
    const adapter = createMemoryAdapter();
    const runA = await adapter.runs.put(makeRunDraft({ name: "Silver Nuzlocke" }));
    const routeA = await adapter.routes.put(makeRouteDraft(runA.id));
    await adapter.encounters.put(makeEncounterDraft(runA.id, routeA.id, { status: "caught" }));
    await adapter.mons.put(makeMonDraft(runA.id, { status: "party" }));

    const runB = await adapter.runs.put(makeRunDraft({ name: "Gold Nuzlocke" }));
    const routeB1 = await adapter.routes.put(makeRouteDraft(runB.id, { name: "Route 1" }));
    const routeB2 = await adapter.routes.put(
      makeRouteDraft(runB.id, { name: "Route 2", order: 2 }),
    );
    await adapter.encounters.put(makeEncounterDraft(runB.id, routeB1.id, { status: "caught" }));
    await adapter.encounters.put(makeEncounterDraft(runB.id, routeB2.id, { status: "missed" }));
    await adapter.mons.put(makeMonDraft(runB.id, { status: "box", partySlot: null }));
    await adapter.mons.put(makeMonDraft(runB.id, { status: "dead", partySlot: null }));

    const first = renderAt(`/runs/${runA.id}/party`, { adapter });
    await waitFor(() => {
      expect(countersIn(screen.getByRole("navigation", { name: "Sidebar navigation" }))).toEqual({
        Routes: "1/1",
        Party: "1",
        Boxes: "0",
        Graveyard: "0",
      });
    });
    first.unmount();

    renderAt(`/runs/${runB.id}/party`, { adapter });
    await waitFor(() => {
      expect(countersIn(screen.getByRole("navigation", { name: "Sidebar navigation" }))).toEqual({
        Routes: "2/2",
        Party: "0",
        Boxes: "1",
        Graveyard: "1",
      });
    });
  });

  // The tab bar shows no counters, so this only needs to guarantee both run switchers still
  // agree on which run is open.
  it("shows the sidebar's nav-row counters, with both run switchers still agreeing on the open run", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft({ name: "Silver Nuzlocke" }));
    const route = await adapter.routes.put(makeRouteDraft(run.id));
    await adapter.encounters.put(makeEncounterDraft(run.id, route.id, { status: "caught" }));
    await adapter.mons.put(makeMonDraft(run.id, { status: "party" }));
    await adapter.mons.put(makeMonDraft(run.id, { status: "box", partySlot: null }));

    renderAt(`/runs/${run.id}/party`, { adapter });

    const { sidebar, tabBar } = shells();
    await waitFor(() => {
      expect(countersIn(sidebar)).toEqual({
        Routes: "1/1",
        Party: "1",
        Boxes: "1",
        Graveyard: "0",
      });
    });
    expect(countersIn(tabBar)).toEqual({});

    const selects = screen.getAllByRole("combobox", { name: "Switch run" });
    expect(selects).toHaveLength(2);
    for (const select of selects) {
      expect(select).toHaveValue(run.id);
    }
  });

  it("keeps a counted row's accessible name as just its label, once the counter has loaded", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft({ name: "Silver Nuzlocke" }));
    await adapter.mons.put(makeMonDraft(run.id, { status: "box", partySlot: null }));

    renderAt(`/runs/${run.id}/party`, { adapter });

    const sidebar = screen.getByRole("navigation", { name: "Sidebar navigation" });
    await waitFor(() => {
      expect(countersIn(sidebar)).toEqual({ Routes: "0", Party: "0", Boxes: "1", Graveyard: "0" });
    });

    // The row's own counter, "1", is aria-hidden. If it weren't, this query would fail: the
    // row's accessible name would be "Boxes 1", not "Boxes".
    expect(within(sidebar).getByRole("link", { name: "Boxes" })).toBeInTheDocument();
  });

  it("preserves the sub-screen when switching runs: /runs/A/party -> /runs/B/party, not B's routes", async () => {
    const adapter = createMemoryAdapter();
    const runA = await adapter.runs.put(makeRunDraft({ name: "Silver Nuzlocke" }));
    const runB = await adapter.runs.put(makeRunDraft({ name: "Gold Nuzlocke" }));

    const { router } = renderAt(`/runs/${runA.id}/party`, { adapter });

    const selects = await screen.findAllByRole("combobox", { name: "Switch run" });
    const select = selects[0];
    if (!select) {
      throw new Error("Expected at least one 'Switch run' select to render.");
    }
    await userEvent.selectOptions(select, runB.id);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/runs/${runB.id}/party`);
    });
    expect(screen.getByRole("heading", { name: "Party" })).toBeInTheDocument();
  });

  it("updates the counters after a write, without a manual refetch", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft({ name: "Silver Nuzlocke" }));
    await adapter.mons.put(makeMonDraft(run.id, { status: "party" }));

    const { queryClient } = renderAt(`/runs/${run.id}/party`, { adapter });

    const sidebar = await screen.findByRole("navigation", { name: "Sidebar navigation" });
    await waitFor(() => {
      expect(countersIn(sidebar)).toEqual({ Routes: "0", Party: "1", Boxes: "0", Graveyard: "0" });
    });

    // A write through the adapter, then the same invalidation a real mutation performs
    // (`invalidateRun`). This exercises TanStack Query's own invalidation, not a manual refetch.
    await adapter.mons.put(makeMonDraft(run.id, { status: "party", partySlot: 1 }));
    await invalidateRun(queryClient, run.id);

    await waitFor(() => {
      expect(countersIn(sidebar)).toEqual({ Routes: "0", Party: "2", Boxes: "0", Graveyard: "0" });
    });
  });
});

describe("Current run outlives the URL", () => {
  it.each([["Sidebar navigation" as const], ["Tab bar navigation" as const]])(
    "keeps the current run's switcher and nav rows when visiting the run list, in %s",
    async (navLabel) => {
      const adapter = createMemoryAdapter();
      const run = await adapter.runs.put(makeRunDraft({ name: "Johto Hardcore" }));
      renderAt(`/runs/${run.id}/party`, { adapter });

      const nav = await screen.findByRole("navigation", { name: navLabel });
      await userEvent.click(within(nav).getByRole("link", { name: "Runs" }));

      await screen.findByRole("heading", { name: "Johto Hardcore" });

      const navAfter = screen.getByRole("navigation", { name: navLabel });
      expect(within(navAfter).getByRole("link", { name: "Runs" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(within(navAfter).getByRole("link", { name: "Party" })).toHaveAttribute(
        "href",
        `/runs/${run.id}/party`,
      );

      const selects = screen.getAllByRole("combobox", { name: "Switch run" });
      for (const select of selects) {
        expect(select).toHaveValue(run.id);
      }
    },
  );

  it("returns to a run when its row is clicked from the run list", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft({ name: "Johto Hardcore" }));

    const { router } = renderAt("/", { adapter });
    await screen.findByRole("heading", { name: "Johto Hardcore" });

    await userEvent.click(screen.getByRole("link", { name: "Resume" }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/runs/${run.id}/routes`);
    });

    const sidebar = screen.getByRole("navigation", { name: "Sidebar navigation" });
    expect(within(sidebar).getByRole("combobox", { name: "Switch run" })).toHaveValue(run.id);
    expect(within(sidebar).getByRole("link", { name: "Routes" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it.each([["/settings", "Settings"] as const, ["/runs/new", "New run"] as const])(
    "keeps the current run's switcher and nav rows on %s",
    async (path, heading) => {
      const adapter = createMemoryAdapter();
      const run = await adapter.runs.put(makeRunDraft({ name: "Johto Hardcore" }));
      localStorage.setItem(CURRENT_RUN_STORAGE_KEY, run.id);

      renderAt(path, { adapter });

      await screen.findByRole("heading", { name: heading });

      const sidebar = screen.getByRole("navigation", { name: "Sidebar navigation" });
      expect(await within(sidebar).findByRole("combobox", { name: "Switch run" })).toHaveValue(
        run.id,
      );
      expect(within(sidebar).getByRole("link", { name: "Party" })).toHaveAttribute(
        "href",
        `/runs/${run.id}/party`,
      );
    },
  );

  it("keeps the current run across a reload landing on /", async () => {
    const adapter = createMemoryAdapter();
    const run = await adapter.runs.put(makeRunDraft({ name: "Johto Hardcore" }));

    const first = renderAt(`/runs/${run.id}/party`, { adapter });
    await screen.findByRole("navigation", { name: "Sidebar navigation" });
    first.unmount();

    renderAt("/", { adapter });

    await screen.findByRole("heading", { name: "Johto Hardcore" });
    const sidebar = screen.getByRole("navigation", { name: "Sidebar navigation" });
    expect(await within(sidebar).findByRole("combobox", { name: "Switch run" })).toHaveValue(
      run.id,
    );
    expect(within(sidebar).getByRole("link", { name: "Runs" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(sidebar).getByRole("link", { name: "Party" })).toHaveAttribute(
      "href",
      `/runs/${run.id}/party`,
    );
  });

  it("clears the current run immediately when it's deleted, without adopting another run automatically", async () => {
    const adapter = createMemoryAdapter();
    const doomed = await adapter.runs.put(makeRunDraft({ name: "Johto Hardcore" }));
    await adapter.runs.put(makeRunDraft({ name: "Emerald Nuzlocke" }));

    const { router } = renderAt(`/runs/${doomed.id}/party`, { adapter });
    await screen.findByRole("navigation", { name: "Sidebar navigation" });

    await router.navigate("/");
    await screen.findByRole("heading", { name: "Johto Hardcore" });

    const card = screen.getByRole("heading", { name: "Johto Hardcore" }).closest("li");
    if (!card) {
      throw new Error("Expected the Johto Hardcore run card to render as a list item.");
    }
    await userEvent.click(within(card).getByRole("button", { name: "Delete" }));
    await userEvent.click(within(card).getByRole("button", { name: "Delete permanently" }));

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Johto Hardcore" })).not.toBeInTheDocument();
    });

    const sidebar = screen.getByRole("navigation", { name: "Sidebar navigation" });
    expect(within(sidebar).queryByRole("link", { name: "Party" })).not.toBeInTheDocument();
    expect(within(sidebar).getByRole("combobox", { name: "Switch run" })).toHaveValue("");
  });

  it("ignores a remembered run id that no longer exists", async () => {
    const adapter = createMemoryAdapter();
    await adapter.runs.put(makeRunDraft({ name: "Emerald Nuzlocke" }));
    localStorage.setItem(CURRENT_RUN_STORAGE_KEY, "run-does-not-exist");

    renderAt("/", { adapter });

    await screen.findByRole("heading", { name: "Emerald Nuzlocke" });
    const sidebar = screen.getByRole("navigation", { name: "Sidebar navigation" });
    expect(within(sidebar).queryByRole("link", { name: "Party" })).not.toBeInTheDocument();
    expect(within(sidebar).getByRole("combobox", { name: "Switch run" })).toHaveValue("");
  });

  it("still works when localStorage throws on every call", async () => {
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    try {
      const adapter = createMemoryAdapter();
      const run = await adapter.runs.put(makeRunDraft({ name: "Johto Hardcore" }));

      const first = renderAt(`/runs/${run.id}/party`, { adapter });
      await screen.findByRole("heading", { name: "Party" });
      first.unmount();

      // Simulates a reload: a fresh mount has nothing to remember the run by.
      renderAt("/", { adapter });
      await screen.findByRole("heading", { name: "Johto Hardcore" });

      const sidebar = screen.getByRole("navigation", { name: "Sidebar navigation" });
      expect(within(sidebar).queryByRole("link", { name: "Party" })).not.toBeInTheDocument();
    } finally {
      getItemSpy.mockRestore();
      setItemSpy.mockRestore();
      removeItemSpy.mockRestore();
    }
  });
});
