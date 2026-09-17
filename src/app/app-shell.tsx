/**
 * The responsive app shell: a persistent sidebar at and above the `md` breakpoint (768px), a
 * fixed bottom tab bar below it. Both are rendered unconditionally in the DOM; which one is
 * visible is decided entirely by Tailwind's responsive display utilities (`hidden md:flex` /
 * `md:hidden`), not a `matchMedia` hook or resize listener. CSS deciding what is visible, rather
 * than JS state deciding what is rendered, is what keeps the two variants from ever disagreeing
 * about which nav items exist — see `nav-items.ts`.
 *
 * Active-route highlighting is `NavLink`'s own `isActive` (and the `aria-current="page"` it sets
 * on the anchor), applied identically to both variants.
 *
 * Nav items are run-scoped: the active `runId` (if any) comes from the router, `navItemsFor` is
 * called once, and the SAME resulting array feeds both renderings below — see `nav-items.ts`.
 */

import type { ReactNode } from "react";
import { NavLink, Outlet, useParams } from "react-router";

import { navItemsFor } from "./nav-items";

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground";
}

export function AppShell(): ReactNode {
  const { runId } = useParams<{ runId: string }>();
  const navItems = navItemsFor(runId);

  return (
    <div className="min-h-screen">
      <nav
        aria-label="Sidebar navigation"
        className="fixed inset-y-0 left-0 hidden w-56 flex-col gap-1 border-r border-border bg-sidebar p-4 md:flex"
      >
        {/* Run switcher + live counters (PER-20, M1) will sit here, above the nav items. */}
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClassName}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Content area: left margin clears the fixed sidebar on desktop, bottom padding clears
          the fixed tab bar on mobile. */}
      <main className="min-h-screen pb-16 md:ml-56 md:pb-0">
        <Outlet />
      </main>

      <nav
        aria-label="Tab bar navigation"
        className="fixed inset-x-0 bottom-0 flex border-t border-border bg-background md:hidden"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex-1 py-3 text-center text-sm ${navLinkClassName({ isActive })}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
