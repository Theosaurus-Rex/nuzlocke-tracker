import { compareRoutes } from "@/domain/routes";
import type { Death, Route } from "@/domain/types";

export interface TimelineSection {
  route: Route;
  position: number;
  total: number;
  deaths: Death[];
}

export interface Timeline {
  sections: TimelineSection[];
  unrecorded: Death[];
}

function oldestFirst(a: Death, b: Death): number {
  return a.diedAt.localeCompare(b.diedAt) || a.createdAt.localeCompare(b.createdAt);
}

export function groupDeathsByRoute(deaths: readonly Death[], routes: readonly Route[]): Timeline {
  const ordered = [...routes].sort(compareRoutes);
  const known = new Set(ordered.map((route) => route.id));
  const byRoute = new Map<string, Death[]>();
  const unrecorded: Death[] = [];

  for (const death of [...deaths].sort(oldestFirst)) {
    if (death.routeId === null || !known.has(death.routeId)) {
      unrecorded.push(death);
      continue;
    }
    byRoute.set(death.routeId, [...(byRoute.get(death.routeId) ?? []), death]);
  }

  const sections = ordered.flatMap((route, index) => {
    const routeDeaths = byRoute.get(route.id);
    return routeDeaths
      ? [{ route, position: index + 1, total: ordered.length, deaths: routeDeaths }]
      : [];
  });

  return { sections, unrecorded };
}
