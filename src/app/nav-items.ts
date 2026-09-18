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
 *
 * `RUN_SUB_SCREENS` below is the one place that names a run's five sub-screen slugs. PER-20's
 * run switcher (`run-switcher.tsx`) needs the same set, to recognise which path segment is the
 * "sub-screen" it must preserve across a run switch — reading it from here rather than
 * hand-listing the slugs a second time is the same drift-prevention hard rule 6 asks for.
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

/** The sub-screen a run redirects to from `/runs/:runId` (see `run-redirect.tsx`), and the slug
 * `run-switcher.tsx` falls back to when a path has no recognisable sub-screen of its own. */
export const DEFAULT_RUN_SUB_SCREEN = "routes";

const RUN_SUB_SCREENS: readonly { slug: string; label: string }[] = [
  { slug: DEFAULT_RUN_SUB_SCREEN, label: "Routes" },
  { slug: "party", label: "Party" },
  { slug: "boxes", label: "Boxes" },
  { slug: "graveyard", label: "Graveyard" },
  { slug: "fights", label: "Fights" },
];

/** Whether `value` names one of a run's five sub-screens. */
export function isRunSubScreenSlug(value: string): boolean {
  return RUN_SUB_SCREENS.some((screen) => screen.slug === value);
}

/**
 * Extracts the sub-screen slug from a run-scoped pathname (`/runs/:runId/:sub`), so PER-20's run
 * switcher can land a switch on the SAME sub-screen instead of the target run's default one.
 * Falls back to `DEFAULT_RUN_SUB_SCREEN` for anything that isn't one of the five recognised
 * slugs — no active run, `/runs/:runId` itself (mid-`RunRedirect`), or a path shape this app
 * doesn't have. Lives here, next to `RUN_SUB_SCREENS`, rather than in `run-switcher.tsx`, purely
 * so it stays a plain function export in a non-component file (a component file may only export
 * components — `react-refresh/only-export-components`).
 */
export function subScreenFromPath(pathname: string): string {
  const segments = pathname.split("/").filter((segment) => segment.length > 0);
  const candidate = segments[2];
  return candidate !== undefined && isRunSubScreenSlug(candidate)
    ? candidate
    : DEFAULT_RUN_SUB_SCREEN;
}

function runNavItems(runId: string): NavItem[] {
  return RUN_SUB_SCREENS.map(({ slug, label }) => ({ label, to: `/runs/${runId}/${slug}` }));
}

/**
 * Returns the nav items for the current context: a run's five screens when `runId` is present,
 * the global destinations otherwise.
 */
export function navItemsFor(runId: string | undefined): NavItem[] {
  return runId ? runNavItems(runId) : GLOBAL_NAV_ITEMS;
}
