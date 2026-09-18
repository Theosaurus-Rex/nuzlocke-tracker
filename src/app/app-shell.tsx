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
 *
 * The run switcher and its live counters (PER-20) follow the identical pattern: `runs` and
 * `summary` are each read/derived exactly once, here, and the same values are passed into TWO
 * `<RunSwitcher>` mounts below — the sidebar (always, since it has room and is the switcher's
 * most useful moment when no run is open) and a compact strip above the mobile content (only
 * while a run is active, since the tab bar's own "Runs" destination already covers switching when
 * it isn't — see `run-switcher.tsx` for the counter/derivation details).
 */

import type { ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router";

import { summariseRun } from "@/domain/derive";
import { useEncounters, useMons, useRuns } from "@/storage/queries";

import { navItemsFor, subScreenFromPath } from "./nav-items";
import { RunSwitcher } from "./run-switcher";

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground";
}

export function AppShell(): ReactNode {
  const { runId } = useParams<{ runId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = navItemsFor(runId);

  const runsQuery = useRuns();
  const runs = runsQuery.data ?? [];

  const encountersQuery = useEncounters(runId);
  const monsQuery = useMons(runId);
  const summary =
    runId !== undefined && encountersQuery.data !== undefined && monsQuery.data !== undefined
      ? summariseRun({ encounters: encountersQuery.data, mons: monsQuery.data })
      : undefined;

  function handleSwitchRun(nextRunId: string): void {
    void navigate(`/runs/${nextRunId}/${subScreenFromPath(location.pathname)}`);
  }

  return (
    <div className="min-h-screen">
      <nav
        aria-label="Sidebar navigation"
        className="fixed inset-y-0 left-0 hidden w-56 flex-col gap-1 border-r border-border bg-sidebar p-4 md:flex"
      >
        <div className="mb-3">
          <RunSwitcher
            runs={runs}
            activeRunId={runId}
            summary={summary}
            onSwitch={handleSwitchRun}
          />
        </div>
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClassName}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Content area: left margin clears the fixed sidebar on desktop, bottom padding clears
          the fixed tab bar on mobile. */}
      <main className="min-h-screen pb-16 md:ml-56 md:pb-0">
        {runId !== undefined && (
          <div className="border-b border-border p-2 md:hidden">
            <RunSwitcher
              runs={runs}
              activeRunId={runId}
              summary={summary}
              onSwitch={handleSwitchRun}
            />
          </div>
        )}
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
