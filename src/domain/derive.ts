/**
 * Derived-state helpers over a run's rows. Pure functions only, no I/O, no storage, no React.
 */

import type { Encounter, Mon } from "./types";

export interface MonStatusCounts {
  party: number;
  boxed: number;
  dead: number;
}

/** Tallies a run's mons by `status`. `"box"` is reported as `boxed` to read naturally on a card. */
export function countByMonStatus(mons: readonly Mon[]): MonStatusCounts {
  const counts: MonStatusCounts = { party: 0, boxed: 0, dead: 0 };

  for (const mon of mons) {
    if (mon.status === "party") {
      counts.party += 1;
    } else if (mon.status === "box") {
      counts.boxed += 1;
    } else {
      counts.dead += 1;
    }
  }

  return counts;
}

/**
 * How many distinct routes have at least one non-`'open'` encounter. Counts routes, not
 * encounters: a route with more than one non-open encounter still counts once.
 */
export function countRoutesCovered(encounters: readonly Encounter[]): number {
  const covered = new Set<string>();

  for (const encounter of encounters) {
    if (encounter.status !== "open") {
      covered.add(encounter.routeId);
    }
  }

  return covered.size;
}

export interface RunSummary {
  routesCovered: number;
  party: number;
  boxed: number;
  dead: number;
}

/** `dead` comes from `countByMonStatus(mons)`, not `deaths.length`. See docs/notes/domain.md. */
export function summariseRun({
  encounters,
  mons,
}: {
  encounters: readonly Encounter[];
  mons: readonly Mon[];
}): RunSummary {
  const { party, boxed, dead } = countByMonStatus(mons);

  return {
    routesCovered: countRoutesCovered(encounters),
    party,
    boxed,
    dead,
  };
}
