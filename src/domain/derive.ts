/**
 * Derived-state helpers over a run's rows. Pure functions only — no I/O, no storage, no React.
 *
 * PER-20 (sidebar run counters, still to come) calls out explicitly that this kind of number is
 * derived state and should be computed in one place rather than recomputed per screen. PER-13
 * (the run list) needs the same numbers first, so the derivation is built here, once, and both
 * consume it.
 */

import type { Encounter, Mon } from "./types";

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
 * The numbers a run's summary card needs, in one call. `party`, `boxed` and `dead` are a
 * PARTITION of `mons` — they are three faces of one status field, so they always sum to
 * `mons.length` — which is why all three come from `countByMonStatus(mons)` rather than `dead`
 * being read off the `deaths` table instead.
 *
 * That's a deliberate choice, not an oversight: `deaths` and "mons whose status is `dead`" agree
 * under every transition this app performs today (`killMon` writes both in the same
 * transaction — see `transitions.ts` and `mutations.ts`), but they are not the same guarantee.
 * `backup.ts` validates that a death's `monId` references a mon present in the bundle, but NOT
 * that mon's `status` — and hand-editing game/run data is an explicitly supported workflow
 * (CLAUDE.md, "Game data is ours once seeded"). A bundle with deaths whose mons are still `party`
 * would make `party + boxed + deaths.length` exceed `mons.length`, silently. Deriving `dead` from
 * `mons` instead keeps the three numbers a true breakdown of the roster no matter how the data
 * arrived. Do not "fix" this back toward `deaths.length` — see `derive.test.ts`'s partition test.
 */
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
