/**
 * Both nav variants are always in the DOM. CSS (`hidden md:flex` / `md:hidden`) decides which is
 * visible, not a `matchMedia` hook, which is also why there's no breakpoint test.
 */

import type { ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router";
import { cn } from "cn";

import { buttonVariants } from "@/components/ui/button";
import { summariseRun, type RunSummary } from "@/domain/derive";
import { useEncounters, useMons, useRoutes, useRuns } from "@/storage/queries";

import { navItemsFor, subScreenFromPath, type NavItem } from "./nav-items";
import { RunSwitcher } from "./run-switcher";

/** Not every nav row has a live count: `Fights` has none in `RunSummary`, and the two global
 * rows (Runs, Settings) never do. */
const NAV_COUNTER_KEYS: Partial<Record<string, keyof RunSummary>> = {
  Routes: "routesCovered",
  Party: "party",
  Boxes: "boxed",
  Graveyard: "dead",
};

/** Routes reads `24/31` rather than `24`. The total is the run's route count, which is not
 * derived state and so is not `summariseRun`'s job. A total of zero is dropped rather than
 * printed: no run has zero routes once seeded, and `0/0` reads as a bug rather than as a count. */
function counterFor(
  item: NavItem,
  summary: RunSummary | undefined,
  routeTotal: number | undefined,
): string | undefined {
  const key = NAV_COUNTER_KEYS[item.label];
  if (key === undefined || summary === undefined) {
    return undefined;
  }
  const covered = summary[key];
  return key === "routesCovered" && routeTotal !== undefined && routeTotal > 0
    ? `${String(covered)}/${String(routeTotal)}`
    : String(covered);
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
  const routesQuery = useRoutes(runId ?? "");
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
        className="fixed inset-y-0 left-0 hidden w-56 flex-col gap-1 border-r-[1.5px] border-border bg-sidebar p-4 md:flex"
      >
        {runs.length > 0 && (
          <div className="mb-4">
            <p className="mb-1.5 text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Current run
            </p>
            <RunSwitcher runs={runs} activeRunId={runId} onSwitch={handleSwitchRun} />
          </div>
        )}
        {navItems.map((item) => {
          const counter = counterFor(item, summary, routesQuery.data?.length);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-between border-[1.5px] px-3 py-2.5 text-sm font-medium text-foreground",
                  isActive ? "border-border bg-flag shadow-block" : "border-transparent",
                )
              }
            >
              <span data-slot="nav-label">{item.label}</span>
              {counter !== undefined && (
                <span
                  aria-hidden="true"
                  data-slot="nav-counter"
                  className="font-mono text-muted-foreground"
                >
                  {counter}
                </span>
              )}
            </NavLink>
          );
        })}
        {/* Pinned below the nav rows, not part of them. `runId` gates Settings because the
            global nav already carries it as a row, and two links with one name is a trap for
            anyone navigating by voice or screen reader. */}
        <div data-slot="sidebar-actions" className="mt-auto flex flex-col gap-2">
          <Link to="/runs/new" className={cn(buttonVariants({ size: "sm" }))}>
            New run
          </Link>
          {runId !== undefined && (
            <Link to="/settings" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Settings
            </Link>
          )}
        </div>
      </nav>

      {/* Left margin clears the fixed sidebar on desktop, bottom padding clears the fixed tab
          bar on mobile. */}
      <main className="min-h-screen bg-card pb-16 md:ml-56 md:pb-0">
        {runId !== undefined && (
          <div className="border-b-[1.5px] border-border p-2 md:hidden">
            <RunSwitcher runs={runs} activeRunId={runId} onSwitch={handleSwitchRun} />
          </div>
        )}
        <Outlet />
      </main>

      <nav
        aria-label="Tab bar navigation"
        className="fixed inset-x-0 bottom-0 flex border-t-[1.5px] border-border bg-background md:hidden"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex-1 border-l-[1.5px] border-border py-3 text-center text-sm font-medium text-foreground first:border-l-0",
                isActive && "bg-flag",
              )
            }
          >
            <span data-slot="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
