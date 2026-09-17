/**
 * Derived-state helpers over a run's rows. Pure functions only — no I/O, no storage, no React.
 *
 * PER-20 (sidebar run counters, still to come) calls out explicitly that this kind of number is
 * derived state and should be computed in one place rather than recomputed per screen. PER-13
 * (the run list) needs the same numbers first, so the derivation is built here, once, and both
 * consume it.
 */

import type { Death, Encounter, Mon } from "./types";

// ---------------------------------------------------------------------------
// countByMonStatus
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// countRoutesCovered
// ---------------------------------------------------------------------------

/**
 * How many distinct routes have at least one non-`'open'` encounter (caught, missed or skipped —
 * anything the player has actually resolved). Counts routes, not encounters: a route with more
 * than one non-open encounter (unusual, but the type does not forbid it) still counts once.
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

// ---------------------------------------------------------------------------
// summariseRun
// ---------------------------------------------------------------------------

export interface RunSummary {
  routesCovered: number;
  party: number;
  boxed: number;
  dead: number;
}

/**
 * The numbers a run's summary card needs, in one call. `dead` comes from the `deaths` table
 * (the run's authoritative casualty log) rather than from `countByMonStatus(mons).dead`; the two
 * agree under every transition this app performs (`killMon` writes both a dead mon and its death
 * in the same transaction — see `transitions.ts` and `mutations.ts`), so this is a choice of
 * which source of truth to read, not a different number.
 */
export function summariseRun({
  encounters,
  mons,
  deaths,
}: {
  encounters: readonly Encounter[];
  mons: readonly Mon[];
  deaths: readonly Death[];
}): RunSummary {
  const { party, boxed } = countByMonStatus(mons);

  return {
    routesCovered: countRoutesCovered(encounters),
    party,
    boxed,
    dead: deaths.length,
  };
}
