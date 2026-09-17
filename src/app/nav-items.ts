/**
 * The single source of truth for app-level navigation. `AppShell` renders both the desktop
 * sidebar and the mobile bottom tab bar from this one array (CLAUDE.md hard rule 6: "both shells
 * are equals"). A second, hand-maintained copy for the other shell is exactly the drift that rule
 * exists to prevent.
 *
 * Navigation is run-scoped: once a run is open, the sidebar and the tab bar navigate between
 * THAT run's five screens (routes/party/boxes/graveyard/fights), matching the wireframes and
 * PER-20. Outside of any run, they show the global destinations instead. `navItemsFor` is the
 * one place that decides which list applies; callers compute it once and pass the same array to
 * both shells (see `app-shell.tsx`).
 */

export interface NavItem {
  label: string;
  to: string;
  /** Forwarded to `NavLink`'s `end` prop so a root path like "/" isn't marked active for every
   * other route that also starts with "/". */
  end?: boolean;
}

const GLOBAL_NAV_ITEMS: NavItem[] = [
  { label: "Runs", to: "/", end: true },
  { label: "Settings", to: "/settings" },
];

function runNavItems(runId: string): NavItem[] {
  return [
    { label: "Routes", to: `/runs/${runId}/routes` },
    { label: "Party", to: `/runs/${runId}/party` },
    { label: "Boxes", to: `/runs/${runId}/boxes` },
    { label: "Graveyard", to: `/runs/${runId}/graveyard` },
    { label: "Fights", to: `/runs/${runId}/fights` },
  ];
}

/**
 * Returns the nav items for the current context: a run's five screens when `runId` is present,
 * the global destinations otherwise.
 */
export function navItemsFor(runId: string | undefined): NavItem[] {
  return runId ? runNavItems(runId) : GLOBAL_NAV_ITEMS;
}
