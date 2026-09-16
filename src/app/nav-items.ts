/**
 * The single source of truth for app-level navigation. `AppShell` renders both the desktop
 * sidebar and the mobile bottom tab bar from this one array (CLAUDE.md hard rule 6: "both shells
 * are equals"). A second, hand-maintained copy for the other shell is exactly the drift that rule
 * exists to prevent.
 *
 * These are the destinations that exist outside the context of any one run. Once a run is open,
 * navigating between its routes/party/boxes/graveyard/fights screens is in-page tab navigation
 * owned by that screen (M1-M4), not global app nav.
 */

export interface NavItem {
  label: string;
  to: string;
  /** Forwarded to `NavLink`'s `end` prop so a root path like "/" isn't marked active for every
   * other route that also starts with "/". */
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Runs", to: "/", end: true },
  { label: "Settings", to: "/settings" },
];
