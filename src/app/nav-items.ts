/**
 * One array backs both the desktop sidebar and the mobile tab bar, so the two shells can't drift
 * apart the way a second, hand-maintained copy would.
 */

export interface NavItem {
  label: string;
  to: string;
  /** Forwarded to `NavLink`'s `end` prop so "/" isn't marked active for every route that also
   * starts with "/". */
  end?: boolean;
}

const GLOBAL_NAV_ITEMS: NavItem[] = [
  { label: "Runs", to: "/", end: true },
  { label: "Settings", to: "/settings" },
];

/** The sub-screen `/runs/:runId` redirects to, and the fallback when a path names none. */
export const DEFAULT_RUN_SUB_SCREEN = "routes";

const RUN_SUB_SCREENS: readonly { slug: string; label: string }[] = [
  { slug: DEFAULT_RUN_SUB_SCREEN, label: "Routes" },
  { slug: "party", label: "Party" },
  { slug: "boxes", label: "Boxes" },
  { slug: "graveyard", label: "Graveyard" },
  { slug: "fights", label: "Fights" },
];

export function isRunSubScreenSlug(value: string): boolean {
  return RUN_SUB_SCREENS.some((screen) => screen.slug === value);
}

/** Lives here rather than in `run-switcher.tsx` because that file exports a component, and
 * `react-refresh/only-export-components` forbids a non-component export from a component file. */
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

export function navItemsFor(runId: string | undefined): NavItem[] {
  return runId ? runNavItems(runId) : GLOBAL_NAV_ITEMS;
}
