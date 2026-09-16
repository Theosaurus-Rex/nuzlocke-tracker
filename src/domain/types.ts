/**
 * Entity types for the Nuzlocke tracker data model.
 *
 * Pure types only — no I/O, no storage, no React. See
 * docs/superpowers/specs/2026-09-17-nuzlocke-scaffold-design.md section 4 for the field-by-field
 * contract this file implements.
 *
 * IDs are plain `string` (no branded/nominal ID types — not wanted yet).
 * Timestamps are ISO 8601 `string`.
 * Nullable columns are `| null`, never optional `?`: a row always carries the key, its value may
 * be null. This matters because rows round-trip through IndexedDB and the export bundle, where
 * `undefined` and "absent" are not the same thing as `null`.
 */

/** Base shape shared by every table row. */
export interface Timestamped {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * A row before it has been persisted. `id`, `createdAt` and `updatedAt` become optional so a
 * caller can supply them (round-tripping an existing row) or omit them (the storage adapter
 * assigns an id and stamps timestamps on write).
 */
export type Draft<T extends Timestamped> = Omit<T, "id" | "createdAt" | "updatedAt"> &
  Partial<Pick<T, "id" | "createdAt" | "updatedAt">>;

// ---------------------------------------------------------------------------
// Small union types
// ---------------------------------------------------------------------------

/** `'heartgold'` is the only member at V1. */
export type GameId = "heartgold";

export type RunStatus = "active" | "finished" | "archived";

export type EncounterStatus = "open" | "caught" | "missed" | "skipped";

export type MonStatus = "party" | "box" | "dead";

export type FightKind = "gym" | "elite_four" | "champion" | "rival" | "custom";

export type FightStatus = "pending" | "cleared";

export type Gender = "male" | "female" | "genderless";

// ---------------------------------------------------------------------------
// runs
// ---------------------------------------------------------------------------

/**
 * Embedded config value object on `Run`. No independent identity, never queried on its own —
 * embedding it does not violate hard rule 3, which is about run-scoped rows (encounters, mons,
 * deaths), not a fixed-shape settings struct.
 */
export interface Rules {
  dupesClause: boolean;
  speciesClause: boolean;
  shinyClause: boolean;
  nicknamesRequired: boolean;
  levelCaps: boolean;
  setMode: boolean;
  hardcore: boolean;
  randomiser: {
    enabled: boolean;
    wildEncounters: boolean;
    trainers: boolean;
    starters: boolean;
    abilities: boolean;
    items: boolean;
    moves: boolean;
    evolutions: boolean;
  };
  customClause: string | null;
}

export type Run = Timestamped & {
  name: string;
  game: GameId;
  status: RunStatus;
  rules: Rules;
  finishedAt: string | null;
};

// ---------------------------------------------------------------------------
// routes
// ---------------------------------------------------------------------------

export type Route = Timestamped & {
  runId: string;
  name: string;
  /** Traversal order; sparse integers to allow insertion. */
  order: number;
  /** True for user-appended routes. */
  isCustom: boolean;
  /** Links back to seeded game data; null when custom. */
  gameRouteId: string | null;
};

// ---------------------------------------------------------------------------
// encounters
// ---------------------------------------------------------------------------

export type Encounter = Timestamped & {
  runId: string;
  routeId: string;
  status: EncounterStatus;
  /** What was met; null while open. */
  speciesId: string | null;
  /** Level encountered at. */
  level: number | null;
  /** Set when caught. */
  monId: string | null;
  notes: string | null;
};

// ---------------------------------------------------------------------------
// mons
// ---------------------------------------------------------------------------

export type Mon = Timestamped & {
  runId: string;
  /** Null for starters and gifts. */
  encounterId: string | null;
  /** Current species; mutates on evolve. */
  speciesId: string;
  /** Fixed at catch. */
  speciesIdCaught: string;
  /** Required when `rules.nicknamesRequired`. */
  nickname: string | null;
  gender: Gender | null;
  level: number;
  levelCaught: number;
  nature: string | null;
  ability: string | null;
  heldItem: string | null;
  /** Max 4, validated in `domain`. */
  moves: string[];
  status: MonStatus;
  /** 0–5; set iff `status === 'party'`. */
  partySlot: number | null;
  boxOrder: number | null;
  caughtRouteId: string | null;
};

// ---------------------------------------------------------------------------
// deaths
// ---------------------------------------------------------------------------

/** Closed enum of "died from a status/residual effect" causes. Deliberately incomplete. */
export type StatusCause =
  "poison" | "burn" | "sandstorm" | "hail" | "recoil" | "perish-song" | "confusion";

/**
 * Discriminated union of everything that can kill a mon. Exactly one of `fightId` and
 * `trainerName` is set on the `trainer` variant: a tracked fight, or an untracked trainer.
 */
export type Cause =
  | {
      type: "trainer";
      fightId: string | null;
      trainerName: string | null;
      species: string;
      level: number;
      move: string;
    }
  | { type: "wild"; species: string; level: number; move: string }
  | { type: "status"; status: StatusCause }
  | { type: "other"; detail: string };

export type Death = Timestamped & {
  runId: string;
  /** One death per mon. */
  monId: string;
  /** Level when it died. */
  level: number;
  /** Where it happened. */
  routeId: string | null;
  cause: Cause;
  diedAt: string;
  notes: string | null;
};

// ---------------------------------------------------------------------------
// fights
// ---------------------------------------------------------------------------

export type Fight = Timestamped & {
  runId: string;
  /** Links to seeded roster data; null when custom. */
  gameFightId: string | null;
  name: string;
  kind: FightKind;
  order: number;
  /** Drives the badge count. */
  grantsBadge: boolean;
  /** Derived from the boss's ace at ingest. */
  levelCap: number | null;
  status: FightStatus;
  clearedAt: string | null;
};
