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
import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NAV_ITEMS } from "./nav-items";
import { appRoutes } from "./router";

function renderAt(initialPath: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [initialPath] });
  render(<RouterProvider router={router} />);
  return router;
}

describe("AppShell navigation", () => {
  it("renders the sidebar and the tab bar from the same nav item config", () => {
    renderAt("/");

    const sidebar = screen.getByRole("navigation", { name: "Sidebar navigation" });
    const tabBar = screen.getByRole("navigation", { name: "Tab bar navigation" });

    const linksIn = (nav: HTMLElement) =>
      within(nav)
        .getAllByRole("link")
        .map((link) => ({ label: link.textContent, href: link.getAttribute("href") }));

    const expected = NAV_ITEMS.map((item) => ({ label: item.label, href: item.to }));

    expect(linksIn(sidebar)).toEqual(expected);
    expect(linksIn(tabBar)).toEqual(expected);
  });

  it("links each nav item to its configured path", () => {
    renderAt("/");

    for (const item of NAV_ITEMS) {
      const links = screen.getAllByRole("link", { name: item.label });
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        expect(link.getAttribute("href")).toBe(item.to);
      }
    }
  });

  it("marks the active route in both the sidebar and the tab bar", () => {
    renderAt("/settings");

    const sidebar = screen.getByRole("navigation", { name: "Sidebar navigation" });
    const tabBar = screen.getByRole("navigation", { name: "Tab bar navigation" });

    for (const nav of [sidebar, tabBar]) {
      const settingsLink = within(nav).getByRole("link", { name: "Settings" });
      const runsLink = within(nav).getByRole("link", { name: "Runs" });
      expect(settingsLink).toHaveAttribute("aria-current", "page");
      expect(runsLink).not.toHaveAttribute("aria-current");
    }
  });

  it("redirects /runs/:runId to /runs/:runId/routes", async () => {
    const router = renderAt("/runs/run-123");

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
