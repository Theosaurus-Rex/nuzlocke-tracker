/**
 * Both nav variants are always in the DOM. CSS (`hidden md:flex` / `md:hidden`) decides which is
 * visible, not a `matchMedia` hook, which is also why there's no breakpoint test.
 */

import type { ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router";
import { cn } from "cn";

import { buttonVariants } from "@/components/ui/button";
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
        <Link to="/runs/new" className={cn(buttonVariants({ size: "sm" }), "mt-auto")}>
          New run
        </Link>
      </nav>

      {/* Left margin clears the fixed sidebar on desktop, bottom padding clears the fixed tab
          bar on mobile. */}
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
