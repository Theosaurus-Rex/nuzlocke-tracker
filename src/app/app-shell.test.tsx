/**
 * Tests our routing/nav logic, not the frameworks underneath it. jsdom does not evaluate CSS
 * media queries, so there is no test here asserting "the sidebar is visible at 1024px" or "the
 * tab bar is visible at 375px" — that would assert nothing real. Both variants are always present
 * in the DOM; which one a real browser shows is Tailwind's `hidden md:flex` / `md:hidden`, and
 * needs a visual or Playwright check, not a jsdom unit test.
 *
 * Routing is driven with `createMemoryRouter` so navigation happens in-process.
 */

import { createMemoryRouter, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createMemoryAdapter } from "@/storage/memory-adapter";
import { StorageProvider } from "@/storage/storage-context";

import { navItemsFor } from "./nav-items";
import { appRoutes } from "./router";

/**
 * Real composition is `QueryClientProvider` -> `StorageProvider` -> `RouterProvider` (see
 * `app/root.tsx`). This suite only exercises routing/nav, but the settings screen (mounted at
 * `/settings`, exercised below) reads the storage adapter through TanStack Query, so both
 * providers need to be present for that route to render without throwing — a fresh instance of
 * each per call, so no state leaks between tests.
 */
function renderAt(initialPath: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [initialPath] });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const adapter = createMemoryAdapter();
  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <StorageProvider adapter={adapter}>
        <RouterProvider router={router} />
      </StorageProvider>
    </QueryClientProvider>,
  );
  return { router, unmount: rendered.unmount };
}

function linksIn(nav: HTMLElement) {
  return within(nav)
    .getAllByRole("link")
    .map((link) => ({ label: link.textContent, href: link.getAttribute("href") }));
}

function shells() {
  return {
    sidebar: screen.getByRole("navigation", { name: "Sidebar navigation" }),
    tabBar: screen.getByRole("navigation", { name: "Tab bar navigation" }),
  };
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

  it("renders the run's five screens in both shells when a run is active", () => {
    renderAt("/runs/run-123/party");

    const { sidebar, tabBar } = shells();

    // Compare the two renderings against each other, not against a duplicated literal.
    expect(linksIn(sidebar)).toEqual(linksIn(tabBar));

    const hrefs = linksIn(sidebar).map((link) => link.href);
    expect(hrefs).toEqual([
      "/runs/run-123/routes",
      "/runs/run-123/party",
      "/runs/run-123/boxes",
      "/runs/run-123/graveyard",
      "/runs/run-123/fights",
    ]);
  });

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
      "/runs/run-a/routes",
      "/runs/run-a/party",
      "/runs/run-a/boxes",
      "/runs/run-a/graveyard",
      "/runs/run-a/fights",
    ]);
    first.unmount();

    renderAt("/runs/run-b/party");
    expect(linksIn(shells().sidebar).map((link) => link.href)).toEqual([
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
    expect(screen.getByRole("heading", { name: "Routes" })).toBeInTheDocument();
  });

  it("renders the not-found screen for an unknown path", () => {
    renderAt("/this-path-does-not-exist");

    expect(screen.getByRole("heading", { name: "Not Found" })).toBeInTheDocument();
  });
});
